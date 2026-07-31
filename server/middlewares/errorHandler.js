import config from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error(`[Error Handler] Catastrophic error: ${err.message}`, err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message: config.nodeEnv === 'production' ? 'A catastrophic database or processing error occurred' : message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
}

export default errorHandler;
