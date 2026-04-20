import { hasFeature } from '../services/subscription.service.js';
import { ApiError } from '../errors/ApiError.js';

/**
 * Middleware factory — blocks the request if the user's plan
 * does not include the required feature.
 *
 * Usage:  router.get('/analytics', authenticate, requireFeature('analytics_dashboard'), handler);
 */
export function requireFeature(featureKey) {
  return async (req, res, next) => {
    try {
      const allowed = await hasFeature(req.user.userId, featureKey);
      if (!allowed) {
        throw ApiError.forbidden(
          `Your current plan does not include the "${featureKey}" feature. Please upgrade.`
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
