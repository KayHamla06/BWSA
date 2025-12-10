import { Schema, model, models } from 'mongoose';

const CustomerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    whatsappNumber: { type: String, required: true },
    totalSpent: { type: Number, default: 0 },
    paymentCount: { type: Number, default: 0 },
    lastPaymentDate: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default models.Customer || model('Customer', CustomerSchema);