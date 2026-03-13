import Campaign from '../models/Campaign.js';
import Customer from '../models/Customer.js';
import { ApiError } from '../errors/ApiError.js';
import { campaignService } from '../services/campaign.service.js';
import { checkMessageLimit, incrementMessageUsage } from '../services/subscription.service.js';

export async function listCampaigns(req, res, next) {
  try {
    const campaigns = await Campaign.find({ sellerId: req.user.userId }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, campaigns });
  } catch (error) {
    next(error);
  }
}

export async function createCampaign(req, res, next) {
  try {
    const { message, segment = 'all', templateName, templateLanguage = 'en', messageParameters = [] } = req.body;

    if (!message || message.trim().length < 5) {
      throw ApiError.badRequest('Promotional message is required.');
    }
    if (!templateName || templateName.trim().length < 2) {
      throw ApiError.badRequest('WhatsApp template name is required.');
    }

    const customers = await Customer.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    const recipients = campaignService.segmentCustomers(customers, segment);

    if (recipients.length === 0) {
      throw ApiError.badRequest('No customers match the selected segment.');
    }

    const msgCheck = await checkMessageLimit(req.user.userId, recipients.length);
    if (!msgCheck.allowed) {
      throw ApiError.badRequest(
        `WhatsApp message limit reached (${msgCheck.used}/${msgCheck.limit} this period). Upgrade your plan to send more messages.`
      );
    }

    await incrementMessageUsage(req.user.userId, recipients.length);

    const campaignId = `CMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const campaign = await Campaign.create({
      campaignId,
      sellerId: req.user.userId,
      templateName,
      templateLanguage,
      message,
      segment,
      recipients: recipients.map((customer) => ({
        phoneNumber: customer.whatsappNumber,
        name: customer.name,
      })),
    });

    campaignService.queueCampaignDelivery(campaignId, messageParameters);

    res.status(202).json({ success: true, message: 'Campaign queued for delivery', campaign });
  } catch (error) {
    next(error);
  }
}
