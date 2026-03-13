import { Router } from 'express';
import { getSettings, updateProfile, updatePaymentSettings } from '../controllers/settings.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getSettings);
router.put('/profile', authenticate, updateProfile);
router.put('/payment', authenticate, updatePaymentSettings);

export default router;
