import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const ReceiptSchema = new Schema(
  {
    receiptId: { type: String, required: true, unique: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerPhone: { type: String, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    transactionId: { type: String, required: true, index: true },
    paymentStatus: {
      type: String,
      enum: ['APPROVED', 'DECLINED', 'FAILED'],
      required: true,
    },
    amount: { type: Number, required: true },
    pdfUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String, default: null },
  },
  { timestamps: true }
);

ReceiptSchema.index({ sellerId: 1, createdAt: -1 });

export default models.Receipt || model('Receipt', ReceiptSchema);
