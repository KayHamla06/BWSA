import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const CustomerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    whatsappNumber: { type: String, required: true },
    phoneNumber: { type: String, default: '' },
    totalSpent: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    lastOrderDate: { type: Date, default: null },
    lastContactDate: { type: Date, default: null },
  },
  { timestamps: true }
);

CustomerSchema.index({ userId: 1, whatsappNumber: 1 });

export default models.Customer || model('Customer', CustomerSchema);
