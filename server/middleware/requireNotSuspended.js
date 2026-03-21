import User from '../models/User.js';

/**
 * Middleware that blocks write operations for suspended users.
 * Suspended users can still view data and receive payments,
 * but cannot add products, create payment links, withdraw, etc.
 */
export async function requireNotSuspended(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('status suspensionReason').lean();
    if (user && user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        suspended: true,
        suspensionReason: user.suspensionReason || 'No reason provided',
        message: 'Your account has been suspended. You cannot perform this action.',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}
