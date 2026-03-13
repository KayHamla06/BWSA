import { analyticsService } from '../services/analytics.service.js';
import { getUsageSummary } from '../services/subscription.service.js';

export async function getStats(req, res, next) {
  try {
    const [stats, usage] = await Promise.all([
      analyticsService.getDashboardStats(req.user.userId),
      getUsageSummary(req.user.userId),
    ]);
    res.json({ success: true, ...stats, subscription: usage });
  } catch (error) {
    next(error);
  }
}
