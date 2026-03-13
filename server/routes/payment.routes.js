import { Router } from 'express';
import { createPaymentLink, listPayments, getPayment } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validatePaymentLink } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, listPayments);
router.get('/:id', authenticate, getPayment);
router.post('/create-link', authenticate, validatePaymentLink, createPaymentLink);

export default router;
