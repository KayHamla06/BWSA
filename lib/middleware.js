// middleware/auth.middleware.js
import { verifyToken } from '../lib/jwt.js';
import ApiKey from '../models/ApiKey.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// JWT authentication middleware (for dashboard/web access)
export async function authenticateJWT(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId;

    // Optional: Verify user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'User account is not active',
      });
    }

    req.userDoc = user;
    next();
  } catch (error) {
    logger.error('JWT authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// API Key authentication middleware (for API access)
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
      });
    }

    // Extract prefix to find candidate keys
    const keyPrefix = apiKey.substring(0, 8);

    // Find all active keys with this prefix
    const candidateKeys = await ApiKey.find({
      keyPrefix,
      isActive: true,
    }).populate('userId');

    if (candidateKeys.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    // Verify against each candidate
    let validKey = null;
    for (const key of candidateKeys) {
      const isValid = await key.verifyKey(apiKey);
      if (isValid) {
        validKey = key;
        break;
      }
    }

    if (!validKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
    }

    // Check if expired
    if (validKey.isExpired()) {
      return res.status(401).json({
        success: false,
        error: 'API key has expired',
      });
    }

    // Check usage limits
    if (validKey.usageCount >= validKey.monthlyLimit) {
      return res.status(429).json({
        success: false,
        error: 'API key monthly limit exceeded',
      });
    }

    // Update usage
    validKey.usageCount += 1;
    validKey.lastUsed = new Date();
    await validKey.save();

    // Attach to request
    req.apiKey = validKey;
    req.userId = validKey.userId._id;
    req.userDoc = validKey.userId;

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
}

// Combined authentication (JWT or API Key)
export function authenticate(req, res, next) {
  const hasJWT = req.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = req.headers['x-api-key'];

  if (hasJWT) {
    return authenticateJWT(req, res, next);
  } else if (hasApiKey) {
    return authenticateApiKey(req, res, next);
  } else {
    return res.status(401).json({
      success: false,
      error: 'Authentication required (JWT or API Key)',
    });
  }
}

// Authorization middleware (check permissions)
export function authorize(...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.userDoc) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const userRole = req.userDoc.role || 'user';

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed',
      });
    }
  };
}

// Legacy function for backward compatibility
export function withAuth(handler) {
  return async (req, res) => {
    return authenticateJWT(req, res, () => handler(req, res));
  };
}

export function withApiKey(handler) {
  return async (req, res) => {
    return authenticateApiKey(req, res, () => handler(req, res));
  };
}
