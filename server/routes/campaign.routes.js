import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { createCampaign, listCampaigns } from '../controllers/campaign.controller.js';

const router = Router();

router.get('/', authenticate, listCampaigns);
router.post('/', authLimiter, authenticate, createCampaign);

export default router;
