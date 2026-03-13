import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  listPlans,
  getSubscription,
  updateSubscription,
  getUsage,
} from '../controllers/subscription.controller.js';

const router = Router();

// Public
router.get('/plans', listPlans);

// Authenticated
router.get('/',        authenticate, getSubscription);
router.get('/usage',   authenticate, getUsage);
router.post('/change', authLimiter, authenticate, updateSubscription);

export default router;
