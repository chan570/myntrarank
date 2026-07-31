import config from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // Extract custom SDE error codes or fall back
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const details = err.details || {};
  const message = err.message || 'An unexpected server error occurred.';

  // Structured logging of the error (masked stack in production logs if needed)
  console.error(`[ERROR] [${errorCode}] - StatusCode: ${statusCode} - Msg: ${message}`);
  if (err.stack && config.nodeEnv !== 'production') {
    console.error(err.stack);
  }

  // Consistent API JSON response structure
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: config.nodeEnv === 'production' && statusCode === 500 ? 'A catastrophic server error occurred.' : message,
      details,
      ...(config.nodeEnv !== 'production' && { stack: err.stack })
    }
  });
}

export default errorHandler;
