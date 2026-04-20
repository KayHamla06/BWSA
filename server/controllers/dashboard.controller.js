import { analyticsService } from '../services/analytics.service.js';
import { getUsageSummary } from '../services/subscription.service.js';
import User from '../models/User.js';

export async function getStats(req, res, next) {
  try {
    const [stats, usage, user] = await Promise.all([
      analyticsService.getDashboardStats(req.user.userId),
      getUsageSummary(req.user.userId),
      User.findById(req.user.userId).select('status suspensionReason').lean(),
    ]);
    const suspension = user && user.status === 'suspended'
      ? { suspended: true, reason: user.suspensionReason || 'No reason provided' }
      : { suspended: false };
    res.json({ success: true, ...stats, subscription: usage, suspension });
  } catch (error) {
    next(error);
  }
}
