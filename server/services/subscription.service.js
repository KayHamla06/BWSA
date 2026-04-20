import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import UserSubscription from '../models/UserSubscription.js';

// ── Plan definitions ────────────────────────────────────────────────────────
export const PLAN_CONFIG = {
  payg: {
    planKey:               'payg',
    name:                  'Pay-per-Use',
    tagline:               'Free signup – pay as you go',
    price:                 0,
    productLimit:          10,
    customerLimit:         50,
    transactionFeePercent: 4.0,
    whatsappMessages:      50,
    features:              ['catalog', 'payment_links', 'basic_receipts'],
    trialDays:             14,
    highlight:             false,
    badge:                 null,
    color:                 '#6b7280',
  },
  starter: {
    planKey:               'starter',
    name:                  'Starter',
    tagline:               'Perfect for small businesses',
    price:                 79,
    productLimit:          25,
    customerLimit:         300,
    transactionFeePercent: 2.0,
    whatsappMessages:      500,
    features:              ['catalog', 'order_tracking', 'payment_links', 'pdf_receipts'],
    trialDays:             14,
    highlight:             false,
    badge:                 'Most Popular',
    color:                 '#25D366',
  },
  business: {
    planKey:               'business',
    name:                  'Business',
    tagline:               'Grow with advanced tools',
    price:                 249,
    productLimit:          200,
    customerLimit:         3000,
    transactionFeePercent: 1.2,
    whatsappMessages:      2000,
    features:              [
      'catalog', 'order_tracking', 'payment_links', 'pdf_receipts',
      'bulk_promotions', 'inventory_tracking', 'analytics_dashboard', 'coupons',
    ],
    trialDays: 14,
    highlight: true,
    badge:     'Best Value',
    color:     '#128C7E',
  },
  pro: {
    planKey:               'pro',
    name:                  'Pro',
    tagline:               'Everything you need to scale',
    price:                 699,
    productLimit:          -1,
    customerLimit:         -1,
    transactionFeePercent: 0.7,
    whatsappMessages:      10000,
    features:              [
      'catalog', 'order_tracking', 'payment_links', 'pdf_receipts',
      'bulk_promotions', 'inventory_tracking', 'analytics_dashboard', 'coupons',
      'marketing_automation', 'ai_auto_reply', 'priority_support', 'advanced_analytics',
    ],
    trialDays: 14,
    highlight: false,
    badge:     'Enterprise',
    color:     '#075E54',
  },
};

export const FEATURE_LABELS = {
  catalog:                'Product Catalog',
  payment_links:          'WhatsApp Payment Links',
  basic_receipts:         'Basic Receipts',
  order_tracking:         'Order Tracking',
  pdf_receipts:           'PDF Receipts',
  bulk_promotions:        'Bulk Promotions',
  inventory_tracking:     'Inventory Tracking',
  analytics_dashboard:    'Analytics Dashboard',
  coupons:                'Discount Coupons',
  marketing_automation:   'Marketing Automation',
  ai_auto_reply:          'AI Auto-Reply Store',
  priority_support:       'Priority Support',
  advanced_analytics:     'Advanced Analytics',
};

// ── Helpers ─────────────────────────────────────────────────────────────────
export async function getOrCreateSubscription(userId) {
  return UserSubscription.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, planKey: 'payg', status: 'payg', periodStart: new Date() } },
    { new: true, upsert: true }
  );
}

export function getPlanConfig(planKey) {
  return PLAN_CONFIG[planKey] || PLAN_CONFIG.payg;
}

export async function getUserPlanConfig(userId) {
  const sub    = await getOrCreateSubscription(userId);
  const config = getPlanConfig(sub.planKey);
  return { ...config, subscription: sub };
}

// ── Limit checks ─────────────────────────────────────────────────────────────
export async function checkProductLimit(userId) {
  const { productLimit, planKey } = await getUserPlanConfig(userId);
  if (productLimit === -1) return { allowed: true, unlimited: true, limit: -1, planKey };
  const current = await Product.countDocuments({ userId });
  const pct     = productLimit > 0 ? Math.round((current / productLimit) * 100) : 0;
  return {
    allowed:   current < productLimit,
    current,
    limit:     productLimit,
    pct,
    warning:   pct >= 80,
    planKey,
    unlimited: false,
  };
}

export async function checkCustomerLimit(userId) {
  const { customerLimit, planKey } = await getUserPlanConfig(userId);
  if (customerLimit === -1) return { allowed: true, unlimited: true, limit: -1, planKey };
  const current = await Customer.countDocuments({ userId });
  const pct     = customerLimit > 0 ? Math.round((current / customerLimit) * 100) : 0;
  return {
    allowed:   current < customerLimit,
    current,
    limit:     customerLimit,
    pct,
    warning:   pct >= 80,
    planKey,
    unlimited: false,
  };
}

export async function checkMessageLimit(userId, batchSize = 1) {
  const plan = await getUserPlanConfig(userId);
  const sub  = plan.subscription;

  // Reset period if needed (monthly rolling)
  const now             = new Date();
  const periodStartDate = sub.periodStart ? new Date(sub.periodStart) : now;
  const monthAgo        = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  if (periodStartDate < monthAgo) {
    await UserSubscription.updateOne(
      { userId },
      { $set: { messagesUsedThisPeriod: 0, periodStart: now } }
    );
    sub.messagesUsedThisPeriod = 0;
  }

  const used  = sub.messagesUsedThisPeriod || 0;
  const limit = plan.whatsappMessages;
  const pct   = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return {
    allowed:  used + batchSize <= limit,
    used,
    limit,
    pct,
    warning:  pct >= 80,
    planKey:  plan.planKey,
  };
}

export async function incrementMessageUsage(userId, count = 1) {
  return UserSubscription.updateOne(
    { userId },
    { $inc: { messagesUsedThisPeriod: count } }
  );
}

// ── Transaction fee ───────────────────────────────────────────────────────────
export async function calculateTransactionFee(userId, amount) {
  const { transactionFeePercent } = await getUserPlanConfig(userId);
  const parsedAmount = Number(amount) || 0;
  const fee          = Number((parsedAmount * transactionFeePercent / 100).toFixed(2));
  return {
    grossAmount:       parsedAmount,
    feePercent:        transactionFeePercent,
    fee,
    netAmount:         Number((parsedAmount - fee).toFixed(2)),
  };
}

// ── Trial status ──────────────────────────────────────────────────────────────
export async function getTrialStatus(userId) {
  const sub = await getOrCreateSubscription(userId);
  const now = new Date();

  // User has paid — trial doesn't matter
  if (sub.status === 'active') {
    return { trialActive: false, trialExpired: false, daysLeft: 0, needsPayment: false };
  }

  const trialEnd = sub.trialEndDate ? new Date(sub.trialEndDate) : null;
  if (!trialEnd) {
    // No trial end date — treat as expired
    return { trialActive: false, trialExpired: true, daysLeft: 0, trialEndsAt: null, needsPayment: true };
  }

  const msLeft  = trialEnd.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const expired  = daysLeft <= 0;

  // Auto-mark as expired in the DB if still showing 'trial'
  if (expired && sub.status === 'trial') {
    await UserSubscription.updateOne({ userId }, { $set: { status: 'expired' } });
  }

  return {
    trialActive:  !expired,
    trialExpired: expired,
    daysLeft,
    trialEndsAt:  trialEnd,
    warning:      !expired && daysLeft <= 3,
    needsPayment: expired,
    planKey:      sub.planKey,
  };
}

// ── Usage summary (for dashboard / API) ──────────────────────────────────────
export async function getUsageSummary(userId) {
  const [productCheck, customerCheck, messageCheck, planConfig, trialStatus] = await Promise.all([
    checkProductLimit(userId),
    checkCustomerLimit(userId),
    checkMessageLimit(userId, 0),
    getUserPlanConfig(userId),
    getTrialStatus(userId),
  ]);

  return {
    plan:        planConfig,
    products:    productCheck,
    customers:   customerCheck,
    messages:    messageCheck,
    trialActive: trialStatus.trialActive,
    trialExpired: trialStatus.trialExpired,
    trialDaysLeft: trialStatus.daysLeft,
    trialWarning: trialStatus.warning,
    trialEndsAt: trialStatus.trialEndsAt,
    needsPayment: trialStatus.needsPayment,
  };
}

// ── Subscription CRUD ─────────────────────────────────────────────────────────
export async function createDefaultSubscription(userId, planKey = 'payg') {
  const config = getPlanConfig(planKey);
  const now    = new Date();
  const trialEndDate = new Date(now.getTime() + config.trialDays * 24 * 60 * 60 * 1000);

  return UserSubscription.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        userId,
        planKey,
        status: 'trial',
        trialStartDate: now,
        trialEndDate,
        periodStart: now,
      },
    },
    { new: true, upsert: true }
  );
}

export async function changePlan(userId, newPlanKey) {
  const config = getPlanConfig(newPlanKey);
  if (!config) throw new Error('Invalid plan key');

  const now    = new Date();
  const update = {
    planKey:         newPlanKey,
    billingStartDate: now,
    nextBillingDate:  new Date(now.setMonth(now.getMonth() + 1)),
    periodStart:      new Date(),
    messagesUsedThisPeriod: 0,
  };

  if (newPlanKey !== 'payg') {
    update.status = 'active';
  } else {
    update.status        = 'payg';
    update.trialEndDate  = null;
    update.trialStartDate = null;
  }

  return UserSubscription.findOneAndUpdate({ userId }, { $set: update }, { new: true, upsert: true });
}

// ── Feature check ─────────────────────────────────────────────────────────────
export async function hasFeature(userId, featureKey) {
  const { features } = await getUserPlanConfig(userId);
  return features.includes(featureKey);
}

export async function getUserFeatures(userId) {
  const config = await getUserPlanConfig(userId);
  return {
    planKey:  config.planKey,
    planName: config.name,
    features: config.features,
    featureLabels: config.features.map(f => ({ key: f, label: FEATURE_LABELS[f] || f })),
  };
}

export const subscriptionService = {
  PLAN_CONFIG,
  FEATURE_LABELS,
  getOrCreateSubscription,
  getPlanConfig,
  getUserPlanConfig,
  checkProductLimit,
  checkCustomerLimit,
  checkMessageLimit,
  incrementMessageUsage,
  calculateTransactionFee,
  getUsageSummary,
  createDefaultSubscription,
  changePlan,
  hasFeature,
  getUserFeatures,
  getTrialStatus,
};
