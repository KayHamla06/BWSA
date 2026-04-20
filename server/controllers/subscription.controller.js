import {
  PLAN_CONFIG,
  FEATURE_LABELS,
  getUserPlanConfig,
  getUsageSummary,
  changePlan,
  createDefaultSubscription,
  getUserFeatures,
} from '../services/subscription.service.js';
import { createSubscriptionPayment } from '../services/payfast.service.js';
import User from '../models/User.js';
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

// GET /api/subscription/features — user's allowed features for frontend gating
export async function getFeatures(req, res, next) {
  try {
    const features = await getUserFeatures(req.user.userId);
    res.json({ success: true, ...features });
  } catch (error) {
    next(error);
  }
}

// POST /api/subscription/pay — generate PayFast payment URL for a plan
export async function payForSubscription(req, res, next) {
  try {
    const { planKey } = req.body;
    if (!planKey || !PLAN_CONFIG[planKey]) {
      throw ApiError.badRequest('Invalid plan. Choose from: starter, business, pro');
    }

    const plan = PLAN_CONFIG[planKey];
    if (plan.price <= 0) {
      throw ApiError.badRequest('This plan is free. No payment required.');
    }

    const user = await User.findById(req.user.userId).select('name email');
    if (!user) throw ApiError.notFound('User not found');

    const reference = `SUB-${req.user.userId}-${planKey}-${Date.now()}`;
    const result = createSubscriptionPayment(user, planKey, plan.name, plan.price, reference);

    if (!result.success) {
      throw ApiError.internal(result.error || 'Failed to create payment');
    }

    res.json({
      success: true,
      redirectUrl: result.data.redirectUrl,
      reference: result.data.reference,
      planKey,
      planName: plan.name,
      amount: plan.price,
    });
  } catch (error) {
    next(error);
  }
}
