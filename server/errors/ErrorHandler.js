import { ApiError } from './ApiError.js';
import { logger } from '../utils/logger.js';

export class ErrorHandler {
  static classify(err) {
    // Already an ApiError
    if (err instanceof ApiError) return err;

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return ApiError.badRequest(messages.join('. '));
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return ApiError.conflict(`An account with this ${field} already exists.`);
    }

    // Mongoose cast error (bad ObjectId etc.)
    if (err.name === 'CastError') {
      return ApiError.badRequest('Invalid identifier format.');
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return ApiError.unauthorized('Invalid token. Please sign in again.');
    }
    if (err.name === 'TokenExpiredError') {
      return ApiError.unauthorized('Session expired. Please sign in again.');
    }

    // Fallback: server error
    return ApiError.internal();
  }

  static log(err, req) {
    const payload = {
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      statusCode: err.statusCode || 500,
      type: err.type || 'UNKNOWN',
    };

    if (err.statusCode >= 500 || !err.isOperational) {
      logger.error({ ...payload, stack: err.stack });
    } else {
      logger.warn(payload);
    }
  }
}
