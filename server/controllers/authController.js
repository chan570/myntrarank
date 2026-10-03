import { authService, SESSION_TTL_MS } from '../services/authService.js';
import { readSessionToken } from '../middlewares/authenticateUser.js';
import config from '../config/env.js';
import { AuthenticationError, ConflictError, ValidationError } from '../utils/errors.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setSessionCookie(res, token) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${config.sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`);
}

function clearSessionCookie(res) {
  const secure = config.nodeEnv === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${config.sessionCookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
}

function validateCredentials({ name, email, password }, registering) {
  if (registering && (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 60)) {
    throw new ValidationError('Name must be between 2 and 60 characters.');
  }
  if (typeof email !== 'string' || !emailPattern.test(email.trim()) || email.trim().length > 254) {
    throw new ValidationError('Enter a valid email address.');
  }
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) {
    throw new ValidationError('Password must be between 10 and 128 characters.');
  }
}

export class AuthController {
  register = async (req, res, next) => {
    try {
      const { name, email, password } = req.body || {};
      validateCredentials({ name, email, password }, true);
      const user = await authService.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      if (!user) throw new ConflictError('An account with that email already exists. Sign in instead.');
      const { token } = await authService.createSession(user);
      setSessionCookie(res, token);
      res.status(201).json({ status: 'success', user });
    } catch (error) {
      next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      validateCredentials({ email, password }, false);
      const user = await authService.authenticate(email.trim().toLowerCase(), password);
      if (!user) throw new AuthenticationError('Email or password is incorrect.');
      const { token } = await authService.createSession(user);
      setSessionCookie(res, token);
      res.json({ status: 'success', user });
    } catch (error) {
      next(error);
    }
  };

  me = async (req, res, next) => {
    try {
      const user = await authService.getSession(readSessionToken(req));
      res.json({ status: 'success', user });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      await authService.deleteSession(readSessionToken(req));
      clearSessionCookie(res);
      res.json({ status: 'success' });
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;
