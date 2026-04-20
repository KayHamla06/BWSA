import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  listPlans,
  getSubscription,
  updateSubscription,
  getUsage,
  getFeatures,
  payForSubscription,
} from '../controllers/subscription.controller.js';

const router = Router();

// Public
router.get('/plans', listPlans);

// Authenticated
router.get('/',         authenticate, getSubscription);
router.get('/usage',    authenticate, getUsage);
router.get('/features', authenticate, getFeatures);
router.post('/change',  authLimiter, authenticate, updateSubscription);
router.post('/pay',     authLimiter, authenticate, payForSubscription);

export default router;
