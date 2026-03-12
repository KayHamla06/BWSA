import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ZAR' },
    paymentMethod: {
      type: String,
      enum: ['ozow', 'payshap', 'stripe'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: { type: String, unique: true, sparse: true },
    paymentLinkId: { type: String, unique: true },
    reason: { type: String, default: '' },
    description: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    webhookData: { type: Schema.Types.Mixed, default: null },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default models.Payment || model('Payment', PaymentSchema);
