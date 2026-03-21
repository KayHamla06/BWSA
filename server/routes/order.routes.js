import { Router } from 'express';
import { listOrders, getOrder, updateOrderStatus } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import { requireNotSuspended } from '../middleware/requireNotSuspended.js';
import { requireFeature } from '../middleware/featureGate.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, requireFeature('order_tracking'), listOrders);
router.get('/:id', authenticate, requireActiveSubscription, requireFeature('order_tracking'), getOrder);
router.patch('/:id/status', authenticate, requireActiveSubscription, requireNotSuspended, requireFeature('order_tracking'), updateOrderStatus);

export default router;
