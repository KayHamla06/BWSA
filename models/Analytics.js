import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const AnalyticsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    date: { type: Date, required: true },
    metrics: {
      revenue: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      newCustomers: { type: Number, default: 0 },
      payments: { type: Number, default: 0 },
      successfulPayments: { type: Number, default: 0 },
      failedPayments: { type: Number, default: 0 },
      averageOrderValue: { type: Number, default: 0 },
      whatsappMessages: { type: Number, default: 0 },
      apiCalls: { type: Number, default: 0 },
    },
    topProducts: [
      {
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        sales: Number,
        revenue: Number,
      },
    ],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for efficient queries
AnalyticsSchema.index({ userId: 1, period: 1, date: -1 });
AnalyticsSchema.index({ userId: 1, date: -1 });

export default models.Analytics || model('Analytics', AnalyticsSchema);
