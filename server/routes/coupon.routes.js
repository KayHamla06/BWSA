import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createCoupon, deleteCoupon, listCoupons } from '../controllers/coupon.controller.js';

const router = Router();

router.get('/', authenticate, listCoupons);
router.post('/', authenticate, createCoupon);
router.delete('/:id', authenticate, deleteCoupon);

export default router;
