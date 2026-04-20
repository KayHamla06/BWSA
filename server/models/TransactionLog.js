import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const TransactionLogSchema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerPhone: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['APPROVED', 'DECLINED', 'FAILED'],
      required: true,
      index: true,
    },
    rawPayload: { type: Schema.Types.Mixed, default: null },
    eventSource: { type: String, default: 'payfast' },
  },
  { timestamps: true }
);

TransactionLogSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

export default models.TransactionLog || model('TransactionLog', TransactionLogSchema);
