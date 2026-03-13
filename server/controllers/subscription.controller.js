import {
  PLAN_CONFIG,
  FEATURE_LABELS,
  getUserPlanConfig,
  getUsageSummary,
  changePlan,
  createDefaultSubscription,
} from '../services/subscription.service.js';
import { ApiError } from '../errors/ApiError.js';

// GET /api/subscription/plans — public plan list
export async function listPlans(req, res, next) {
  try {
    const plans = Object.values(PLAN_CONFIG).map((plan) => ({
      ...plan,
      featureLabels: plan.features.map((f) => FEATURE_LABELS[f] || f),
    }));
    res.json({ success: true, plans });
  } catch (error) {
    next(error);
  }
}

// GET /api/subscription — current user's subscription + usage
export async function getSubscription(req, res, next) {
  try {
    const summary = await getUsageSummary(req.user.userId);
    res.json({ success: true, ...summary });
  } catch (error) {
    next(error);
  }
}

// POST /api/subscription/change — upgrade or downgrade plan
export async function updateSubscription(req, res, next) {
  try {
    const { planKey } = req.body;
    if (!planKey || !PLAN_CONFIG[planKey]) {
      throw ApiError.badRequest('Invalid plan. Choose from: payg, starter, business, pro');
    }
    const subscription = await changePlan(req.user.userId, planKey);
    const planConfig   = PLAN_CONFIG[planKey];
    res.json({
      success: true,
      message: `Plan changed to ${planConfig.name}`,
      subscription,
      plan: planConfig,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/subscription/usage — live usage check
export async function getUsage(req, res, next) {
  try {
    const usage = await getUsageSummary(req.user.userId);
    res.json({ success: true, usage });
  } catch (error) {
    next(error);
  }
}
