import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const AnalyticsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    date: { type: Date, required: true },
    metrics: {
      revenue: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 },
      successfulPayments: { type: Number, default: 0 },
      failedPayments: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
    },
    topProducts: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        sales: Number,
        revenue: Number,
      },
    ],
  },
  { timestamps: true }
);

AnalyticsSchema.index({ userId: 1, period: 1, date: -1 });

export default models.Analytics || model('Analytics', AnalyticsSchema);
