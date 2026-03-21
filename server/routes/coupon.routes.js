import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import { requireNotSuspended } from '../middleware/requireNotSuspended.js';
import { requireFeature } from '../middleware/featureGate.js';
import { createCoupon, deleteCoupon, listCoupons } from '../controllers/coupon.controller.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, requireFeature('coupons'), listCoupons);
router.post('/', authenticate, requireActiveSubscription, requireNotSuspended, requireFeature('coupons'), createCoupon);
router.delete('/:id', authenticate, requireActiveSubscription, requireNotSuspended, requireFeature('coupons'), deleteCoupon);

export default router;
