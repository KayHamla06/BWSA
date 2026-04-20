import { Router } from 'express';
import { listCustomers, getCustomer, createCustomer, deleteCustomer } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, listCustomers);
router.get('/:id', authenticate, requireActiveSubscription, getCustomer);
router.post('/', authenticate, requireActiveSubscription, createCustomer);
router.delete('/:id', authenticate, requireActiveSubscription, deleteCustomer);

export default router;
