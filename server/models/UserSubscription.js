import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const UserSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    planKey: {
      type: String,
      enum: ['payg', 'starter', 'business', 'pro'],
      default: 'payg',
    },
    status: {
      type: String,
      enum: ['active', 'trial', 'suspended', 'cancelled'],
      default: 'payg',
    },
    trialStartDate:   { type: Date, default: null },
    trialEndDate:     { type: Date, default: null },
    billingStartDate: { type: Date, default: null },
    nextBillingDate:  { type: Date, default: null },
    // Message usage — resets each billing period
    messagesUsedThisPeriod: { type: Number, default: 0 },
    periodStart: { type: Date, default: Date.now },
    adminNotes:  { type: String, default: '' },
  },
  { timestamps: true }
);

UserSubscriptionSchema.index({ userId: 1 }, { unique: true });

export default models.UserSubscription || model('UserSubscription', UserSubscriptionSchema);
