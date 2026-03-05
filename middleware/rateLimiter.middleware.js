// middleware/rateLimiter.middleware.js
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    error: 'Too many login attempts, please try again later',
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again in 15 minutes',
    });
  },
});

// Payment endpoint rate limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 payment requests per hour
  message: {
    success: false,
    error: 'Payment request limit exceeded',
  },
  handler: (req, res) => {
    logger.warn(`Payment rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many payment requests, please try again later',
    });
  },
});

// Webhook rate limiter (more lenient)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit to 100 webhook calls per minute
  message: {
    success: false,
    error: 'Webhook rate limit exceeded',
  },
  skipFailedRequests: true,
});

// API key based rate limiter (by user)
export const createUserRateLimiter = (maxRequests = 1000, windowMs = 60 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator: (req) => {
      // Use userId if authenticated, otherwise fall back to IP
      return req.userId?.toString() || req.ip;
    },
    message: {
      success: false,
      error: 'User rate limit exceeded',
    },
    handler: (req, res) => {
      logger.warn(`User rate limit exceeded for user: ${req.userId || req.ip}`);
      res.status(429).json({
        success: false,
        error: 'You have exceeded your rate limit',
      });
    },
  });
};
