import { randomUUID } from 'node:crypto';
import { openSearchService } from '../services/openSearchEngine.js';
import { auditProductReviews } from '../services/auditEngine.js';
import { ConflictError, ValidationError } from '../utils/errors.js';

const productQueues = new Map();

async function withProductQueue(productId, operation) {
  const previous = productQueues.get(productId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  productQueues.set(productId, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (productQueues.get(productId) === queued) productQueues.delete(productId);
  }
}

export class ReviewController {
  constructor(searchService = openSearchService, auditReviews = auditProductReviews) {
    this.searchService = searchService;
    this.auditReviews = auditReviews;
  }

  createReview = async (req, res, next) => {
    try {
      const { productId, rating, text } = req.body;
      if (!req.user?.id) throw new ValidationError('Sign in is required to submit a review.');

      const requestId = req.get('Idempotency-Key');
      if (requestId && requestId.length > 128) {
        throw new ValidationError('Idempotency-Key must be at most 128 characters');
      }
      const idempotencyKey = requestId || randomUUID();
      const newReview = {
        id: `rev-${randomUUID()}`,
        idempotencyKey,
        productId,
        userId: req.user.id,
        reviewerName: req.user.name,
        rating,
        text: text.trim(),
        // The demo has no order system, so a submitted review cannot be purchase-verified.
        verified: false,
        source: 'user-submitted',
        date: Date.now(),
        images: []
      };

      const result = await withProductQueue(productId, async () => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const { document: doc, seqNo, primaryTerm } = await this.searchService.getDocumentRecord(productId);
          doc.reviews = Array.isArray(doc.reviews) ? doc.reviews : [];
          const existingRequest = doc.reviews.find((review) => review.userId === req.user.id && review.idempotencyKey === idempotencyKey);
          if (existingRequest) {
            return { statusCode: 200, review: existingRequest, auditedMetrics: doc.auditedMetrics, message: 'Review was already submitted' };
          }
          if (doc.reviews.some((review) => review.userId === req.user.id)) {
            throw new ConflictError('You have already reviewed this product.');
          }
          doc.reviews.push(newReview);

          // Reviews for the same product are serialized in this API process; CAS still protects
          // against another process writing the product document concurrently.
          const audited = await this.auditReviews(doc.reviews);
          doc.reviews = audited.auditedReviews;
          doc.auditedMetrics = {
            authenticityScore: audited.authenticityScore,
            sentimentScore: audited.sentimentScore,
            verifiedRatio: audited.verifiedRatio,
            richnessScore: audited.richnessScore,
            recencyScore: audited.recencyScore,
            ratingScore: audited.ratingScore,
            genuineRating: audited.genuineRating,
            validReviewsCount: audited.validReviewsCount,
            totalReviewsCount: audited.totalReviewsCount,
            isLowReviewCount: audited.isLowReviewCount
          };
          doc.isSuspicious = audited.authenticityScore < 0.60;
          doc.anomalyType = doc.isSuspicious ? 'review_risk_signals' : null;

          try {
            await this.searchService.upsertDocument(doc, { seqNo, primaryTerm });
            return {
              statusCode: 201,
              review: audited.auditedReviews.find((review) => review.id === newReview.id),
              auditedMetrics: doc.auditedMetrics,
              message: 'Review saved and product score recalculated',
            };
          } catch (error) {
            if (error.statusCode !== 409 && error.meta?.statusCode !== 409) throw error;
            if (attempt === 9) throw new ConflictError('This product is receiving many reviews at once. Retry with the same request key.');
            await new Promise((resolve) => setTimeout(resolve, Math.min(20 * (attempt + 1), 200)));
          }
        }
        throw new ConflictError('Could not safely update this product. Retry with the same request key.');
      });
      return res.status(result.statusCode).json({
        status: 'success',
        message: result.message,
        data: { review: result.review, auditedMetrics: result.auditedMetrics },
      });
    } catch (error) {
      next(error);
    }
  };
}

export const reviewController = new ReviewController();
export default reviewController;
