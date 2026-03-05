import { Schema, model, models } from 'mongoose';

const ProductSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sku: { type: String, unique: true, sparse: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZAR' },
    category: { type: String, default: 'General' },
    stock: {
      quantity: { type: Number, default: 0, min: 0 },
      trackInventory: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 5 },
    },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    soldCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes for efficient queries
ProductSchema.index({ userId: 1, isActive: 1 });
ProductSchema.index({ userId: 1, category: 1 });
ProductSchema.index({ sku: 1 });

// Virtual for low stock alert
ProductSchema.virtual('isLowStock').get(function () {
  return this.stock.trackInventory && this.stock.quantity <= this.stock.lowStockThreshold;
});

export default models.Product || model('Product', ProductSchema);
