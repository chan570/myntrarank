import { AuthenticationError } from '../utils/errors.js';
import { authService } from '../services/authService.js';
import config from '../config/env.js';

export function readSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${config.sessionCookieName}=`));
  return cookie ? decodeURIComponent(cookie.slice(config.sessionCookieName.length + 1)) : null;
}

export async function loadOptionalUser(req, res, next) {
  try {
    req.user = await authService.getSession(readSessionToken(req));
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireUser(req, res, next) {
  try {
    req.user = await authService.getSession(readSessionToken(req));
    if (!req.user) throw new AuthenticationError('Please sign in before submitting a review.');
    next();
  } catch (error) {
    next(error);
  }
}
