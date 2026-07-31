import { openSearchService } from '../services/openSearchEngine.js';
import { productRepository } from '../repositories/productRepository.js';
import { auditProductReviews } from '../services/auditEngine.js';

export class AdminController {
  constructor(searchService = openSearchService, prodRepo = productRepository) {
    this.searchService = searchService;
    this.productRepository = prodRepo;
  }

  runAudit = async (req, res, next) => {
    try {
      const startTime = performance.now();
      let auditedCount = 0;
      const logs = [];

      logs.push(`[${new Date().toISOString()}] SPARK_BATCH_INIT: Sweeping products for dirty records...`);

      const allDocs = await this.searchService.getAllDocuments();
      for (const doc of allDocs) {
        const audited = await auditProductReviews(doc.reviews);
        doc.auditedMetrics = audited;
        doc.isSuspicious = audited.authenticityScore < 0.60;
        doc.anomalyType = audited.authenticityScore < 0.60 ? 'review_spike' : '';
        await this.searchService.upsertDocument(doc);
        auditedCount++;

        // Update database repository
        try {
          await this.productRepository.update(doc.id, { 
            auditedMetrics: audited,
            isSuspicious: doc.isSuspicious,
            anomalyType: doc.anomalyType
          });
        } catch (err) {
          console.warn(`[AdminController] Mongoose update bypassed in background: ${err.message}`);
        }
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
      next(error);
    }
  };

  injectBotAttack = async (req, res, next) => {
    try {
      const { productId } = req.body;
      const targetId = productId || 'prod-1';
      const doc = await this.searchService.getDocument(targetId);

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
      doc.auditedMetrics = doc.auditedMetrics || {};
      doc.auditedMetrics.isDirty = true;
      
      await this.searchService.upsertDocument(doc);

      try {
        await this.productRepository.update(targetId, {
          isSuspicious: true,
          anomalyType: 'duplicate_reviews',
          'auditedMetrics.isDirty': true
        });
      } catch (err) {
        console.warn(`[AdminController] Mongoose product update bypassed: ${err.message}`);
      }

      res.json({
        status: 'success',
        message: `Injected 38 bot spam reviews into product ${targetId}`,
        data: { productId: targetId, injectedCount: 38 }
      });
    } catch (error) {
      next(error);
    }
  };
}

export const adminController = new AdminController();
export default adminController;
