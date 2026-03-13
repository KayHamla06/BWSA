import { Router } from 'express';
import { listCustomers, getCustomer, createCustomer, deleteCustomer } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listCustomers);
router.get('/:id', authenticate, getCustomer);
router.post('/', authenticate, createCustomer);
router.delete('/:id', authenticate, deleteCustomer);

export default router;
