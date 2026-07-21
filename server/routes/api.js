import express from 'express';
import { openSearchService } from '../services/openSearchEngine.js';
import { auditProductReviews } from '../services/auditEngine.js';
import { Product } from '../models/Product.js';
import { Review } from '../models/Review.js';

const router = express.Router();

// 1. GET /api/search - Execute Search Query
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const weights = {
      auth: req.query.auth ? parseFloat(req.query.auth) : 0.35,
      sent: req.query.sent ? parseFloat(req.query.sent) : 0.20,
      ver: req.query.ver ? parseFloat(req.query.ver) : 0.15,
      rich: req.query.rich ? parseFloat(req.query.rich) : 0.10,
      rec: req.query.rec ? parseFloat(req.query.rec) : 0.10,
      rate: req.query.rate ? parseFloat(req.query.rate) : 0.10,
    };

    const searchResponse = await openSearchService.executeQuery(query, weights);
    res.json({
      status: 'success',
      cloudService: 'Amazon OpenSearch Service',
      data: searchResponse
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 2. POST /api/reviews - Add Customer Review (Write Path)
router.post('/reviews', async (req, res) => {
  try {
    const { productId, reviewerName, rating, text, verified } = req.body;
    if (!productId || !rating) {
      return res.status(400).json({ status: 'error', message: 'productId and rating are required' });
    }

    const newReview = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId,
      reviewerName: reviewerName || 'Anonymous Buyer',
      rating: parseInt(rating),
      text: text || '',
      verified: verified !== undefined ? Boolean(verified) : true,
      date: Date.now(),
      images: []
    };

    // Update OpenSearch document directly
    const doc = await openSearchService.getDocument(productId);
    if (doc) {
      doc.reviews.push(newReview);
      doc.auditedMetrics.isDirty = true;
      await openSearchService.upsertDocument(doc);
    }

    // Update MongoDB if connected
    try {
      if (Product.db.readyState === 1) {
        await Review.create(newReview);
        await Product.updateOne({ id: productId }, { 'auditedMetrics.isDirty': true });
      }
    } catch (dbErr) {
      console.warn(`DB write notice: ${dbErr.message}`);
    }

    res.json({
      status: 'success',
      message: 'Review appended to raw database (Dirty flag set)',
      data: newReview
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 3. POST /api/admin/audit - Trigger Spark Batch Job
router.post('/admin/audit', async (req, res) => {
  try {
    const startTime = performance.now();
    let auditedCount = 0;
    const logs = [];

    logs.push(`[${new Date().toISOString()}] SPARK_BATCH_INIT: Sweeping products for dirty records...`);

    const allDocs = await openSearchService.getAllDocuments();
    for (const doc of allDocs) {
      const audited = await auditProductReviews(doc.reviews);
      doc.auditedMetrics = audited;
      await openSearchService.upsertDocument(doc);
      auditedCount++;

      // Update MongoDB if connected
      try {
        if (Product.db.readyState === 1) {
          await Product.updateOne({ id: doc.id }, { auditedMetrics: audited });
        }
      } catch (err) {}
    }

    const durationMs = Number((performance.now() - startTime).toFixed(2));
    logs.push(`[${new Date().toISOString()}] SPARK_BATCH_COMPLETE: Audited ${auditedCount} product documents in ${durationMs}ms.`);

    res.json({
      status: 'success',
      cloudWorker: 'Apache Spark on AWS EMR',
      data: {
        auditedCount,
        durationMs,
        logs
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 4. POST /api/admin/inject-bot-attack - Inject 38 Duplicate Reviews
router.post('/admin/inject-bot-attack', async (req, res) => {
  try {
    const { productId } = req.body;
    const targetId = productId || 'prod-1';
    const doc = await openSearchService.getDocument(targetId);

    if (!doc) {
      return res.status(404).json({ status: 'error', message: 'Target product not found' });
    }

    const spamText = "BEST PRODUCT EVER AMAZING FABRIC FIVE STARS MUST BUY WOW!";
    const now = Date.now();

    for (let i = 0; i < 38; i++) {
      doc.reviews.push({
        id: `spam-${targetId}-${i}-${Date.now()}`,
        reviewerName: `Bot-Account-${i + 1}`,
        rating: 5,
        text: spamText,
        verified: false,
        date: now,
        images: []
      });
    }

    doc.isSuspicious = true;
    doc.anomalyType = 'duplicate_reviews';
    doc.auditedMetrics.isDirty = true;
    await openSearchService.upsertDocument(doc);

    res.json({
      status: 'success',
      message: `Injected 38 bot spam reviews into product ${targetId}`,
      data: { productId: targetId, injectedCount: 38 }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 5. GET /api/stats - System Telemetry
router.get('/stats', async (req, res) => {
  res.json({
    status: 'online',
    appName: 'TrustRank Enterprise Microservice',
    cloudServices: {
      database: Product.db && Product.db.readyState === 1 ? 'MongoDB Atlas Cloud' : 'In-Memory DB Engine',
      searchIndex: 'Amazon OpenSearch Service',
      auditWorker: 'Apache Spark on AWS EMR'
    },
    metrics: {
      indexedProducts: await openSearchService.getDocumentCount(),
      serverTimestamp: new Date().toISOString()
    }
  });
});

export default router;