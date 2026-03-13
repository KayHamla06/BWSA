import { Router } from 'express';
import { verifyWhatsApp, handleWhatsApp, handleOzowWebhook } from '../controllers/webhook.controller.js';

const router = Router();

router.get('/whatsapp', verifyWhatsApp);
router.post('/whatsapp', handleWhatsApp);
router.post('/ozow', handleOzowWebhook);

export default router;
