import express from 'express';
import { searchController } from '../controllers/searchController.js';
import { reviewController } from '../controllers/reviewController.js';
import { adminController } from '../controllers/adminController.js';
import { validateReviewInput } from '../validators/reviewValidator.js';
import { apiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all API endpoints
router.use(apiRateLimiter);

// Search
router.get('/search', searchController.search);
router.get('/search/autocomplete', searchController.autocomplete);

// Reviews
router.post('/reviews', validateReviewInput, reviewController.createReview);

// Admin
router.post('/admin/audit', adminController.runAudit);
router.post('/admin/inject-bot-attack', adminController.injectBotAttack);

export default router;