import express from 'express';
import { searchController } from '../controllers/searchController.js';
import { reviewController } from '../controllers/reviewController.js';
import { validateReviewInput } from '../validators/reviewValidator.js';
import { apiRateLimiter } from '../middlewares/rateLimiter.js';
import { authenticationRateLimiter } from '../middlewares/rateLimiter.js';
import { authController } from '../controllers/authController.js';
import { requireUser } from '../middlewares/authenticateUser.js';
import { verifyOrigin } from '../middlewares/verifyOrigin.js';

const router = express.Router();

// Apply rate limiting to all API endpoints
router.use(apiRateLimiter);

// Account sessions
router.post('/auth/register', authenticationRateLimiter, verifyOrigin, authController.register);
router.post('/auth/login', authenticationRateLimiter, verifyOrigin, authController.login);
router.get('/auth/me', authController.me);
router.post('/auth/logout', verifyOrigin, authController.logout);

// Search
router.get('/search', searchController.search);
router.get('/search/autocomplete', searchController.autocomplete);

// Reviews
router.post('/reviews', verifyOrigin, requireUser, validateReviewInput, reviewController.createReview);

export default router;
