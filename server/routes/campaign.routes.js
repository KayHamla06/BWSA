import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { requireActiveSubscription } from '../middleware/requireActiveSubscription.js';
import { requireNotSuspended } from '../middleware/requireNotSuspended.js';
import { requireFeature } from '../middleware/featureGate.js';
import { createCampaign, listCampaigns } from '../controllers/campaign.controller.js';

const router = Router();

router.get('/', authenticate, requireActiveSubscription, requireFeature('bulk_promotions'), listCampaigns);
router.post('/', authLimiter, authenticate, requireActiveSubscription, requireNotSuspended, requireFeature('bulk_promotions'), createCampaign);

export default router;
