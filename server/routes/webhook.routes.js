import { Router } from 'express';
import { verifyWhatsApp, handleWhatsApp, handlePayfastWebhook } from '../controllers/webhook.controller.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/whatsapp', verifyWhatsApp);
router.post('/whatsapp', webhookLimiter, handleWhatsApp);
router.post('/payfast', webhookLimiter, handlePayfastWebhook);
router.post('/ozow', webhookLimiter, handlePayfastWebhook);
router.get('/', verifyWhatsApp);
router.post('/', webhookLimiter, handleWhatsApp);
router.post('/payment', webhookLimiter, handlePayfastWebhook);

export default router;
