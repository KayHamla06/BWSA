// middleware/webhook.middleware.js
import crypto from 'crypto';
import logger from '../utils/logger.js';

// HMAC signature verification for Ozow webhooks
export function verifyOzowWebhook(req, res, next) {
  try {
    const signature = req.headers['x-ozow-signature'] || req.body.HashCheck;
    
    if (!signature) {
      logger.warn('Webhook received without signature');
      return res.status(401).json({
        success: false,
        error: 'Missing webhook signature',
      });
    }

    const privateKey = process.env.OZOW_PRIVATE_KEY;
    if (!privateKey) {
      logger.error('OZOW_PRIVATE_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Webhook verification not configured',
      });
    }

    // Ozow signature verification
    // Build string from all body params (excluding HashCheck) and append private key
    const sortedParams = Object.keys(req.body)
      .filter((key) => key !== 'HashCheck')
      .sort()
      .map((key) => req.body[key])
      .join('');

    const expectedHash = crypto
      .createHash('sha512')
      .update(sortedParams.toLowerCase() + privateKey)
      .digest('hex')
      .toLowerCase();

    if (signature.toLowerCase() !== expectedHash) {
      logger.warn('Invalid webhook signature', {
        received: signature,
        expected: expectedHash,
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    logger.info('Webhook signature verified successfully');
    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook verification failed',
    });
  }
}

// Generic HMAC verification
export function verifyHMAC(secret) {
  return (req, res, next) => {
    try {
      const signature = req.headers['x-signature'];
      
      if (!signature) {
        return res.status(401).json({
          success: false,
          error: 'Missing signature',
        });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('Invalid HMAC signature');
        return res.status(401).json({
          success: false,
          error: 'Invalid signature',
        });
      }

      next();
    } catch (error) {
      logger.error('HMAC verification error:', error);
      return res.status(500).json({
        success: false,
        error: 'Signature verification failed',
      });
    }
  };
}

// Request logger middleware
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.userId,
    });
  });

  next();
}
