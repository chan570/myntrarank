/**
 * TRUSTRANK CUSTOM ERROR CLASS HIERARCHY
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message, details = {}) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

export class MLServiceError extends AppError {
  constructor(message, details = {}) {
    super(message, 502, 'ML_SERVICE_ERROR', details);
  }
}

export class SearchServiceError extends AppError {
  constructor(message, details = {}) {
    super(message, 502, 'SEARCH_SERVICE_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message, details = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

export default {
  AppError,
  ValidationError,
  DatabaseError,
  NotFoundError,
  MLServiceError,
  SearchServiceError,
  AuthenticationError
};
