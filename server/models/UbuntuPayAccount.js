import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const UbuntuPayAccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    walletStatus: {
      type: String,
      enum: ['active', 'locked'],
      default: 'active',
      index: true,
    },
    lockReason: { type: String, default: '' },
    lockedAt: { type: Date, default: null },
    currency: { type: String, default: 'ZAR' },
    lastCalculatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

UbuntuPayAccountSchema.index({ userId: 1 }, { unique: true });

export default models.UbuntuPayAccount || model('UbuntuPayAccount', UbuntuPayAccountSchema);