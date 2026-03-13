import { Router } from 'express';
import {
	createPaymentLink,
	listPayments,
	getPayment,
	getWalletSummary,
	listWithdrawals,
	createWithdrawalRequest,
	updateWithdrawalStatus,
} from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validatePaymentLink, validateWithdrawalRequest } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, listPayments);
router.get('/wallet', authenticate, getWalletSummary);
router.get('/withdrawals', authenticate, listWithdrawals);
router.get('/:id', authenticate, getPayment);
router.post('/create-link', authenticate, validatePaymentLink, createPaymentLink);
router.post('/withdrawals', authenticate, validateWithdrawalRequest, createWithdrawalRequest);
router.patch('/withdrawals/:id/status', authenticate, updateWithdrawalStatus);

export default router;
