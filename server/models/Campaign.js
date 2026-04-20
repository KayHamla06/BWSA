import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const CampaignRecipientSchema = new Schema(
  {
    phoneNumber: { type: String, required: true },
    name: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'FAILED'],
      default: 'PENDING',
    },
    error: { type: String, default: '' },
    sentAt: { type: Date, default: null },
  },
  { _id: false }
);

const CampaignSchema = new Schema(
  {
    campaignId: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    templateName: { type: String, required: true },
    templateLanguage: { type: String, default: 'en' },
    message: { type: String, required: true },
    segment: {
      type: String,
      enum: ['all', 'repeat', 'inactive'],
      default: 'all',
    },
    recipients: { type: [CampaignRecipientSchema], default: [] },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
    },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CampaignSchema.index({ sellerId: 1, createdAt: -1 });

export default models.Campaign || model('Campaign', CampaignSchema);
