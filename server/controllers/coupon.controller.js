import Coupon from '../models/Coupon.js';
import { ApiError } from '../errors/ApiError.js';

export async function listCoupons(req, res, next) {
  try {
    const coupons = await Coupon.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    next(error);
  }
}

export async function createCoupon(req, res, next) {
  try {
    const { couponCode, discountPercentage, expirationDate } = req.body;

    if (!couponCode || !discountPercentage || !expirationDate) {
      throw ApiError.badRequest('Coupon code, discount percentage and expiration date are required.');
    }

    const coupon = await Coupon.create({
      userId: req.user.userId,
      couponCode: String(couponCode).trim().toUpperCase(),
      discountPercentage: Number(discountPercentage),
      expirationDate: new Date(expirationDate),
    });

    res.status(201).json({ success: true, coupon });
  } catch (error) {
    next(error);
  }
}

export async function deleteCoupon(req, res, next) {
  try {
    const coupon = await Coupon.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!coupon) throw ApiError.notFound('Coupon not found.');
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (error) {
    next(error);
  }
}
