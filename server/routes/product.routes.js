import { Router } from 'express';
import { listProducts, getProduct, createProduct, updateProduct, deleteProduct } from '../controllers/product.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import { requireNotSuspended } from '../middleware/requireNotSuspended.js';
import { upload } from '../middleware/upload.js';
import { validateProduct } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, listProducts);
router.get('/:id', authenticate, requireActiveSubscription, getProduct);
router.post('/', authenticate, requireActiveSubscription, requireNotSuspended, upload.single('image'), validateProduct, createProduct);
router.put('/:id', authenticate, requireActiveSubscription, requireNotSuspended, upload.single('image'), updateProduct);
router.delete('/:id', authenticate, requireActiveSubscription, requireNotSuspended, deleteProduct);

export default router;
