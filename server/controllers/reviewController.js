import { reviewRepository } from '../repositories/reviewRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { openSearchService } from '../services/openSearchEngine.js';

export class ReviewController {
  constructor(
    revRepo = reviewRepository,
    prodRepo = productRepository,
    searchService = openSearchService
  ) {
    this.reviewRepository = revRepo;
    this.productRepository = prodRepo;
    this.searchService = searchService;
  }

  createReview = async (req, res, next) => {
    try {
      const { productId, reviewerName, rating, text, verified } = req.body;

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

      // 1. Update Search Engine Document Directly
      const doc = await this.searchService.getDocument(productId);
      if (doc) {
        doc.reviews = doc.reviews || [];
        doc.reviews.push(newReview);
        doc.auditedMetrics = doc.auditedMetrics || {};
        doc.auditedMetrics.isDirty = true;
        await this.searchService.upsertDocument(doc);
      }

      // 2. Save to database using Repositories (if connected)
      try {
        await this.reviewRepository.save(newReview);
        await this.productRepository.update(productId, { 'auditedMetrics.isDirty': true });
      } catch (dbErr) {
        console.warn(`[ReviewController] Mongoose repository write bypassed: ${dbErr.message}`);
      }

      res.json({
        status: 'success',
        message: 'Review appended to raw database (Dirty flag set)',
        data: newReview
      });
    } catch (error) {
      next(error);
    }
  };
}

export const reviewController = new ReviewController();
export default reviewController;
