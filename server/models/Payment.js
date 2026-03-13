import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const PaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ZAR' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: { type: String, unique: true, sparse: true },
    paymentReference: { type: String },
    paymentMethod: { type: String, default: 'ozow' },
    paymentUrl: { type: String, default: '' },
    webhookData: { type: Schema.Types.Mixed, default: null },
    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ paymentReference: 1 });

export default models.Payment || model('Payment', PaymentSchema);
