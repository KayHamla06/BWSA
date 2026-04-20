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
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import { requireNotSuspended } from '../middleware/requireNotSuspended.js';
import { validatePaymentLink, validateWithdrawalRequest } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, listPayments);
router.get('/wallet', authenticate, requireActiveSubscription, getWalletSummary);
router.get('/withdrawals', authenticate, requireActiveSubscription, listWithdrawals);
router.get('/:id', authenticate, requireActiveSubscription, getPayment);
router.post('/create-link', authenticate, requireActiveSubscription, requireNotSuspended, validatePaymentLink, createPaymentLink);
router.post('/withdrawals', authenticate, requireActiveSubscription, requireNotSuspended, validateWithdrawalRequest, createWithdrawalRequest);
router.patch('/withdrawals/:id/status', authenticate, requireActiveSubscription, requireNotSuspended, updateWithdrawalStatus);

export default router;
