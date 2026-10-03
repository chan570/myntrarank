import config from '../config/env.js';
import { ValidationError } from '../utils/errors.js';

export function verifyOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin && origin !== config.frontendOrigin) {
    return next(new ValidationError('Request origin is not allowed.'));
  }
  next();
}
