import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const CouponSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    couponCode: { type: String, required: true, uppercase: true, trim: true },
    discountPercentage: { type: Number, required: true, min: 1, max: 100 },
    expirationDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CouponSchema.index({ userId: 1, couponCode: 1 }, { unique: true });

export default models.Coupon || model('Coupon', CouponSchema);
