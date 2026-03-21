import { getTrialStatus } from '../services/subscription.service.js';

/**
 * Middleware that blocks API usage when the user's trial has expired
 * and they haven't paid for a subscription yet.
 *
 * Users can still log in, view their dashboard, manage subscription/billing,
 * and access settings — but all feature routes are frozen.
 */
export async function requireActiveSubscription(req, res, next) {
  try {
    const trial = await getTrialStatus(req.user.userId);
    if (trial.needsPayment) {
      return res.status(403).json({
        success: false,
        trialExpired: true,
        message: 'Your free trial has ended. Please subscribe to continue using the platform.',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}
