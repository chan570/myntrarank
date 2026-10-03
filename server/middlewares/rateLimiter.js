import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

export const authenticationRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many sign-in attempts. Please wait and try again.' },
});

export default apiRateLimiter;
