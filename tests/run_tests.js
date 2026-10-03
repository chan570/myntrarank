import assert from 'node:assert/strict';
import { auditProductReviews, calculateTimeDecay, calculateTypeTokenRatio, countRepeatedWords, hashString } from '../server/services/auditEngine.js';
import { AppError, ConflictError, MLServiceError, ValidationError } from '../server/utils/errors.js';
import { StructuredLogger } from '../server/utils/logger.js';
import { analyzeNLPSentiment, analyzeNLPSentimentBatch } from '../server/services/nlpEngine.js';
import { ReviewController } from '../server/controllers/reviewController.js';
import { AuthController } from '../server/controllers/authController.js';
import { openSearchService } from '../server/services/openSearchEngine.js';
import { readSessionToken, requireUser } from '../server/middlewares/authenticateUser.js';
import { validateReviewInput } from '../server/validators/reviewValidator.js';

let backoffCallCount = 0;
global.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  if (body.text === 'backoff-test') {
    backoffCallCount += 1;
    if (backoffCallCount === 1) throw new Error('Temporary network timeout');
    return { ok: true, json: async () => ({ status: 'success', score: 0.92 }) };
  }
  const reviews = body.reviews || [];
  return {
    ok: true,
    json: async () => ({
      status: 'success',
      predictions: reviews.map((review) => ({ id: review.id, score: 0.78 }))
    })
  };
};

const passed = [];
async function test(name, fn) {
  await fn();
  passed.push(name);
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    json(value) { this.body = value; return this; }
  };
}

async function main() {
  const valError = new ValidationError('Invalid rating');
  assert.ok(valError instanceof AppError);
  assert.ok(new MLServiceError('Service unavailable') instanceof AppError);
  assert.ok(new ConflictError('Concurrent update') instanceof AppError);
  assert.equal(valError.statusCode, 400);
  await test('Structured logger emits parseable fields', async () => {
    let captured;
    const original = console.log;
    console.log = (message) => { captured = message; };
    try { new StructuredLogger('Test').info('Ready', { count: 2 }); }
    finally { console.log = original; }
    const item = JSON.parse(captured);
    assert.equal(item.context, 'Test');
    assert.equal(item.count, 2);
  });
  await test('Duplicate normalization, TTR, and repeated-word helpers', async () => {
    assert.equal(hashString('Hello World!'), hashString('hello world'));
    assert.ok(calculateTypeTokenRatio('quick brown fox') > calculateTypeTokenRatio('very very very'));
    assert.equal(countRepeatedWords('very very very good'), 2);
  });
  await test('Time decay uses configured half-life', async () => {
    const weight = calculateTimeDecay(Date.now() - 180 * 86400000, 180);
    assert.ok(Math.abs(weight - 0.5) < 0.05);
  });
  await test('NLP client retries a transient service failure', async () => {
    assert.equal(await analyzeNLPSentiment('backoff-test'), 0.92);
    assert.equal(backoffCallCount, 2);
  });
  await test('NLP client splits large sentiment requests at the service limit', async () => {
    const originalFetch = global.fetch;
    const batchSizes = [];
    global.fetch = async (_url, options) => {
      const { reviews } = JSON.parse(options.body);
      batchSizes.push(reviews.length);
      return {
        ok: true,
        json: async () => ({ status: 'success', predictions: reviews.map((review) => ({ id: review.id, score: 0.75 })) })
      };
    };
    try {
      const scores = await analyzeNLPSentimentBatch(Array.from({ length: 130 }, (_, index) => `Review ${index}`));
      assert.deepEqual(batchSizes, [128, 2]);
      assert.equal(scores.length, 130);
      assert.ok(scores.every((score) => score === 0.75));
    } finally {
      global.fetch = originalFetch;
    }
  });
  await test('Review validator rejects fabricated purchase verification', async () => {
    const res = response();
    validateReviewInput({ body: {
      productId: 'prod-1', reviewerName: 'Test Buyer', rating: 5,
      text: 'A sufficiently long review.', verified: true
    } }, res, () => assert.fail('Expected rejection'));
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /verification is not available/i);
  });
  await test('Review submit atomically stores the review, metrics, and idempotency key', async () => {
    let stored = { id: 'prod-1', reviews: [], auditedMetrics: {} };
    let auditCalls = 0;
    let writes = 0;
    const search = {
      async getDocumentRecord() { return { document: structuredClone(stored), seqNo: writes, primaryTerm: 1 }; },
      async upsertDocument(doc) { stored = structuredClone(doc); writes += 1; }
    };
    const audit = async (reviews) => {
      auditCalls += 1;
      return {
        auditedReviews: reviews.map((review) => ({ ...review, spamScore: 0, reasons: [] })),
        authenticityScore: 0.91, sentimentScore: 0.73, verifiedRatio: 0,
        richnessScore: 0.62, recencyScore: 0.98, ratingScore: 1,
        genuineRating: 5, validReviewsCount: reviews.length,
        totalReviewsCount: reviews.length, isLowReviewCount: true
      };
    };
    const controller = new ReviewController(search, audit);
    const req = {
      body: { productId: 'prod-1', reviewerName: 'Demo User', rating: 5, text: 'Good fit and quality.' },
      user: { id: 'user-1' },
      get: () => 'request-123'
    };
    const first = response();
    await controller.createReview(req, first, (error) => { throw error; });
    assert.equal(first.statusCode, 201);
    assert.equal(stored.reviews.length, 1);
    assert.equal(stored.reviews[0].verified, false);
    assert.equal(stored.reviews[0].idempotencyKey, 'request-123');
    assert.equal(stored.auditedMetrics.sentimentScore, 0.73);
    assert.equal(first.body.data.auditedMetrics.totalReviewsCount, 1);

    const retry = response();
    await controller.createReview(req, retry, (error) => { throw error; });
    assert.equal(retry.statusCode, 200);
    assert.equal(stored.reviews.length, 1);
    assert.equal(auditCalls, 1);
    assert.equal(writes, 1);
  });
  await test('Concurrent review writes retry without dropping the first review', async () => {
    let stored = { id: 'prod-1', reviews: [] };
    let readCount = 0;
    let writes = 0;
    const search = {
      async getDocumentRecord() {
        readCount += 1;
        return { document: structuredClone(stored), seqNo: readCount - 1, primaryTerm: 1 };
      },
      async upsertDocument(doc) {
        if (writes === 0) {
          stored.reviews.push({ id: 'other-request', reviewerName: 'Other', rating: 4, text: 'Good one.', verified: false, date: Date.now() });
          writes += 1;
          const conflict = new Error('version conflict');
          conflict.statusCode = 409;
          throw conflict;
        }
        stored = structuredClone(doc);
        writes += 1;
      }
    };
    const audit = async (reviews) => ({
      auditedReviews: reviews,
      authenticityScore: 0.9, sentimentScore: 0.6, verifiedRatio: 0,
      richnessScore: 0.5, recencyScore: 0.9, ratingScore: 0.8,
      genuineRating: 4, validReviewsCount: reviews.length,
      totalReviewsCount: reviews.length, isLowReviewCount: true
    });
    const controller = new ReviewController(search, audit);
    const res = response();
    await controller.createReview({
      body: { productId: 'prod-1', reviewerName: 'Demo User', rating: 5, text: 'Another good review.' },
      user: { id: 'user-new' },
      get: () => 'new-request'
    }, res, (error) => { throw error; });
    assert.equal(res.statusCode, 201);
    assert.equal(stored.reviews.length, 2);
    assert.ok(stored.reviews.some((review) => review.id === 'other-request'));
    assert.ok(stored.reviews.some((review) => review.idempotencyKey === 'new-request'));
  });
  await test('Index write failure is surfaced instead of returning success', async () => {
    const controller = new ReviewController({
      async getDocumentRecord() { return { document: { id: 'prod-1', reviews: [] }, seqNo: 0, primaryTerm: 1 }; },
      async upsertDocument() { throw new Error('index unavailable'); }
    }, async (reviews) => ({
      auditedReviews: reviews, authenticityScore: 1, sentimentScore: 0.5,
      verifiedRatio: 0, richnessScore: 0, recencyScore: 1, ratingScore: 0.8,
      genuineRating: 4, validReviewsCount: 1, totalReviewsCount: 1,
      isLowReviewCount: true
    }));
    let nextError;
    const res = response();
    await controller.createReview({
      body: { productId: 'prod-1', reviewerName: 'Demo User', rating: 4, text: 'A decent product.' },
      user: { id: 'user-failure' },
      get: () => 'request-fail'
    }, res, (error) => { nextError = error; });
    assert.match(nextError.message, /index unavailable/);
    assert.equal(res.body, undefined);
  });
  await test('Twenty users can review one product without lost writes or duplicate user reviews', async () => {
    let stored = { id: 'shared-product', reviews: [], auditedMetrics: {} };
    let writes = 0;
    const search = {
      async getDocumentRecord() { return { document: structuredClone(stored), seqNo: writes, primaryTerm: 1 }; },
      async upsertDocument(doc) { stored = structuredClone(doc); writes += 1; }
    };
    const audit = async (reviews) => ({
      auditedReviews: reviews.map((review) => ({ ...review, spamScore: 0, reasons: [] })),
      authenticityScore: 0.94, sentimentScore: 0.72, verifiedRatio: 0,
      richnessScore: 0.6, recencyScore: 1, ratingScore: 0.8,
      genuineRating: 4, validReviewsCount: reviews.length,
      totalReviewsCount: reviews.length, isLowReviewCount: true
    });
    const controller = new ReviewController(search, audit);
    const submissions = Array.from({ length: 20 }, (_, index) => {
      const res = response();
      return controller.createReview({
        body: { productId: 'shared-product', rating: 4, text: `Useful detail from user ${index}.` },
        user: { id: `user-${index}` },
        get: () => `shared-request-${index}`
      }, res, (error) => { throw error; }).then(() => res);
    });
    const responses = await Promise.all(submissions);
    assert.ok(responses.every((res) => res.statusCode === 201));
    assert.equal(stored.reviews.length, 20);
    assert.equal(stored.auditedMetrics.totalReviewsCount, 20);

    let duplicateError;
    await controller.createReview({
      body: { productId: 'shared-product', rating: 4, text: 'A second review from the same user.' },
      user: { id: 'user-0' },
      get: () => 'duplicate-request'
    }, response(), (error) => { duplicateError = error; });
    assert.equal(duplicateError?.statusCode, 409);
    assert.equal(stored.reviews.length, 20);
  });
  await test('Twenty users reviewing separate products keep independent product scores', async () => {
    const products = new Map(Array.from({ length: 20 }, (_, index) => [
      `product-${index}`, { id: `product-${index}`, reviews: [], auditedMetrics: {} }
    ]));
    const search = {
      async getDocumentRecord(id) { return { document: structuredClone(products.get(id)), seqNo: 0, primaryTerm: 1 }; },
      async upsertDocument(doc) { products.set(doc.id, structuredClone(doc)); }
    };
    const audit = async (reviews) => ({
      auditedReviews: reviews, authenticityScore: 1, sentimentScore: 0.5,
      verifiedRatio: 0, richnessScore: 0.5, recencyScore: 1, ratingScore: 0.8,
      genuineRating: 4, validReviewsCount: reviews.length,
      totalReviewsCount: reviews.length, isLowReviewCount: true
    });
    const controller = new ReviewController(search, audit);
    await Promise.all(Array.from({ length: 20 }, (_, index) => controller.createReview({
      body: { productId: `product-${index}`, rating: 4, text: `Review for separate product ${index}.` },
      user: { id: `user-${index}` },
      get: () => `separate-request-${index}`
    }, response(), (error) => { throw error; })));
    assert.ok([...products.values()].every((product) => product.reviews.length === 1));
    assert.ok([...products.values()].every((product) => product.auditedMetrics.totalReviewsCount === 1));
  });
  await test('Registration, login, session authentication, review submission, and logout work together', async () => {
    const documents = new Map();
    const originalClient = openSearchService.client;
    const originalInit = openSearchService.init;
    openSearchService.init = async () => {};
    openSearchService.client = {
      indices: { exists: async () => ({ body: true }) },
      async create({ index, id, body }) {
        const key = `${index}:${id}`;
        if (documents.has(key)) { const error = new Error('already exists'); error.statusCode = 409; throw error; }
        documents.set(key, structuredClone(body));
      },
      async get({ index, id }) {
        const value = documents.get(`${index}:${id}`);
        if (!value) { const error = new Error('not found'); error.statusCode = 404; throw error; }
        return { body: { _source: structuredClone(value) } };
      },
      async delete({ index, id }) { documents.delete(`${index}:${id}`); }
    };

    try {
      const auth = new AuthController();
      let accountError;
      const registered = response();
      await auth.register({ body: { name: 'Test User', email: 'pilot@example.test', password: 'correct-horse-42' } }, registered, (error) => { accountError = error; });
      assert.equal(accountError, undefined);
      assert.equal(registered.statusCode, 201);
      assert.equal(registered.body.user.email, 'pilot@example.test');
      const cookie = registered.headers['set-cookie'];
      const registrationToken = readSessionToken({ headers: { cookie } });
      assert.ok(registrationToken);

      const wrongLogin = response();
      await auth.login({ body: { email: 'pilot@example.test', password: 'incorrect-password' } }, wrongLogin, (error) => { accountError = error; });
      assert.equal(accountError?.statusCode, 401);

      const login = response();
      await auth.login({ body: { email: 'pilot@example.test', password: 'correct-horse-42' } }, login, (error) => { throw error; });
      assert.equal(login.body.user.id, registered.body.user.id);
      const loginCookie = login.headers['set-cookie'];
      const request = { headers: { cookie: loginCookie } };
      await requireUser(request, response(), (error) => { if (error) throw error; });
      assert.equal(request.user.id, registered.body.user.id);

      let product = { id: 'auth-product', reviews: [], auditedMetrics: {} };
      const reviewController = new ReviewController({
        async getDocumentRecord() { return { document: structuredClone(product), seqNo: 0, primaryTerm: 1 }; },
        async upsertDocument(document) { product = structuredClone(document); }
      }, async (reviews) => ({
        auditedReviews: reviews, authenticityScore: 0.9, sentimentScore: 0.8,
        verifiedRatio: 0, richnessScore: 0.6, recencyScore: 1, ratingScore: 0.9,
        genuineRating: 5, validReviewsCount: reviews.length,
        totalReviewsCount: reviews.length, isLowReviewCount: true
      }));
      const reviewResponse = response();
      await reviewController.createReview({
        body: { productId: 'auth-product', rating: 5, text: 'Excellent fit and quality.' },
        user: request.user, get: () => 'account-review-1'
      }, reviewResponse, (error) => { throw error; });
      assert.equal(reviewResponse.statusCode, 201);
      assert.equal(product.reviews.length, 1);
      assert.equal(product.auditedMetrics.totalReviewsCount, 1);

      await auth.logout({ headers: { cookie } }, response(), (error) => { throw error; });
      const sessionCheck = response();
      await auth.me({ headers: { cookie } }, sessionCheck, (error) => { throw error; });
      assert.equal(sessionCheck.body.user, null);
    } finally {
      openSearchService.client = originalClient;
      openSearchService.init = originalInit;
    }
  });
  await test('Product audit uses transformer probabilities and flags duplicate text', async () => {
    const reviews = [
      { id: 'r1', text: 'Comfortable fit for daily use.', rating: 5, verified: false, date: Date.now() },
      { id: 'r2', text: 'Comfortable fit for daily use.', rating: 5, verified: false, date: Date.now() },
      { id: 'r3', text: 'Average quality, acceptable.', rating: 3, verified: false, date: Date.now() },
      { id: 'r4', text: 'Poor fit and weak stitching.', rating: 1, verified: false, date: Date.now() }
    ];
    const result = await auditProductReviews(reviews);
    assert.equal(result.totalReviewsCount, 4);
    assert.ok(result.authenticityScore < 1);
    assert.ok(result.auditedReviews[1].reasons.includes('duplicate_text'));
    assert.equal(result.sentimentScore, 0.78);
  });
  console.log(`Passed ${passed.length} tests.`);
  for (const name of passed) console.log(`PASS ${name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
