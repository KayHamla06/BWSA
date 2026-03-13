import { Router } from 'express';
import { listOrders, getOrder, updateOrderStatus } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrder);
router.patch('/:id/status', authenticate, updateOrderStatus);

export default router;
