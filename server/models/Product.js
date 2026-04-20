import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const ProductSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ZAR' },
    category: { type: String, default: 'General' },
    image_url: { type: String, default: null },
    stock: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    soldCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ userId: 1, isActive: 1 });
ProductSchema.index({ userId: 1, category: 1 });

export default models.Product || model('Product', ProductSchema);
