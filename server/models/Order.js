import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const OrderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customerPhone: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'ZAR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled', 'refunded', 'delivered'],
      default: 'pending',
    },
    paymentReference: { type: String, default: null },
    paymentUrl: { type: String, default: null },
    productSnapshot: {
      name: String,
      description: String,
      price: Number,
      image_url: String,
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ customerPhone: 1 });
OrderSchema.index({ paymentReference: 1 });

export default models.Order || model('Order', OrderSchema);
