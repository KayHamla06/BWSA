import { Router } from 'express';
import { register, login, getProfile, verifyPin, resendPin } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateRegistration } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authLimiter, validateRegistration, register);
router.post('/login', authLimiter, login);
router.post('/verify-pin', authenticate, verifyPin);
router.post('/resend-pin', authLimiter, authenticate, resendPin);
router.get('/profile', authenticate, getProfile);

export default router;
