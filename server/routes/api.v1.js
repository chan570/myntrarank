import express from 'express';
import { searchController } from '../controllers/searchController.js';
import { reviewController } from '../controllers/reviewController.js';
import { adminController } from '../controllers/adminController.js';
import { statsController } from '../controllers/statsController.js';
import { validateReviewInput } from '../validators/reviewValidator.js';
import { apiRateLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all endpoints in v1
router.use(apiRateLimiter);

// 1. Search Query Endpoint
router.get('/search', searchController.search);
router.get('/search/autocomplete', searchController.autocomplete);

// 2. Add Customer Review
router.post('/reviews', validateReviewInput, reviewController.createReview);

// 3. Admin: Trigger Audit
router.post('/admin/audit', adminController.runAudit);

// 4. Admin: Inject Bot Attack
router.post('/admin/inject-bot-attack', adminController.injectBotAttack);

// 5. System Stats
router.get('/stats', statsController.getStats);

export default router;
