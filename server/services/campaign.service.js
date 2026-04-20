import Campaign from '../models/Campaign.js';
import { whatsappService } from './whatsapp.service.js';
import { PLAN_CONFIG } from './subscription.service.js';
import UserSubscription from '../models/UserSubscription.js';

export function segmentCustomers(customers, segment) {
  if (segment === 'repeat') {
    return customers.filter((customer) => Number(customer.totalOrders || customer.orderCount || 0) > 1);
  }
  if (segment === 'inactive') {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 30);
    return customers.filter((customer) => !customer.lastContactDate || new Date(customer.lastContactDate) < threshold);
  }
  return customers;
}

/**
 * Resolve batch options based on the seller's subscription plan.
 * Higher plans get larger batches and shorter inter-message delays.
 */
async function resolveBatchOptions(sellerId) {
  try {
    const sub = await UserSubscription.findOne({ userId: sellerId });
    const planKey = sub?.planKey || 'payg';
    const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.payg;
    // Batch size: scale with plan tier
    const batchSizes   = { payg: 10, starter: 20, business: 50, pro: 100 };
    // Delay between messages in ms: higher plans can send faster
    const delayOptions = { payg: 2000, starter: 1500, business: 1000, pro: 600 };
    return {
      batchSize:       batchSizes[planKey]   ?? 20,
      delayBetweenMs:  delayOptions[planKey] ?? 1200,
      useTemplate:     true,
    };
  } catch {
    return { batchSize: 20, delayBetweenMs: 1200, useTemplate: true };
  }
}

export async function queueCampaignDelivery(campaignId, messageParameters = []) {
  setImmediate(async () => {
    const campaign = await Campaign.findOne({ campaignId });
    if (!campaign) return;

    campaign.status = 'PROCESSING';
    await campaign.save();

    // Build recipient list for batch sender
    const batchRecipients = campaign.recipients.map((r) => ({
      phoneNumber:      r.phoneNumber,
      templateName:     campaign.templateName,
      templateLanguage: campaign.templateLanguage || 'en',
      bodyParameters:   messageParameters.length > 0 ? messageParameters : [campaign.message],
      _ref:             r,  // keep reference for status update
    }));

    const batchOptions = await resolveBatchOptions(campaign.sellerId);

    // Send in batches; update each recipient's status as results arrive
    const { results } = await whatsappService.sendBatch(batchRecipients, batchOptions);

    let sentCount = 0;
    let failedCount = 0;
    results.forEach((res, idx) => {
      const recipient = campaign.recipients[idx];
      if (!recipient) return;
      if (res.status === 'sent') {
        recipient.status = 'SENT';
        recipient.sentAt = new Date();
        sentCount += 1;
      } else {
        recipient.status = 'FAILED';
        recipient.error  = res.error || 'Delivery failed';
        recipient.sentAt = new Date();
        failedCount += 1;
      }
    });

    campaign.sentCount   = sentCount;
    campaign.failedCount = failedCount;
    campaign.status      = failedCount > 0 && sentCount === 0 ? 'FAILED' : 'COMPLETED';
    await campaign.save();
  });
}

export const campaignService = {
  segmentCustomers,
  queueCampaignDelivery,
};
