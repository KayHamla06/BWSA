import { analyticsService } from '../services/analytics.service.js';

export async function getStats(req, res, next) {
  try {
    const stats = await analyticsService.getDashboardStats(req.user.userId);
    res.json({ success: true, ...stats });
  } catch (error) {
    next(error);
  }
}
