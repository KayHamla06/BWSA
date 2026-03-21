import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Load .env.local first, then .env as fallback
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';

import { connectDB } from '../config/database.js';
import { errorMiddleware } from './errors/ErrorMiddleware.js';
import { apiLimiter, webhookLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';
import { csrfProtection } from './middleware/csrf.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import customerRoutes from './routes/customer.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { addClient } from './services/notification.service.js';
import { verifyWhatsApp, handleWhatsApp, handlePayfastWebhook, handleSubscriptionWebhook } from './controllers/webhook.controller.js';

const clientDir = path.join(rootDir, 'client');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Connect to MongoDB =====
await connectDB();

// ===== Global Middleware =====
app.use(compression());

// HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https://res.cloudinary.com", "data:"],
      connectSrc: ["'self'", "https://unpkg.com"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://sandbox.payfast.co.za", "https://www.payfast.co.za"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

const allowedOrigins = [
  process.env.APP_URL,
  'https://ubuntu-market.onrender.com',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(morgan('short', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(csrfProtection);

// Public webhook endpoints expected by providers.
app.get('/webhook', verifyWhatsApp);
app.post('/webhook', webhookLimiter, handleWhatsApp);
app.post('/payment/webhook', webhookLimiter, handlePayfastWebhook);
app.post('/payment/webhook/subscription', webhookLimiter, handleSubscriptionWebhook);

// Apply API-wide rate limits before handlers.
app.use('/api', apiLimiter);

// ===== Serve Static Files (CSS, JS, images) =====
app.use('/css', express.static(path.join(clientDir, 'css'), { maxAge: '1d' }));
app.use('/js', express.static(path.join(clientDir, 'js'), { maxAge: '1d' }));
app.use('/assets', express.static(path.join(rootDir, 'assets'), { maxAge: '7d' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d' }));

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// ===== SSE Notifications =====
app.get('/api/notifications/stream', (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  // Decode JWT to get sellerId (lazy import to avoid circular deps)
  import('jsonwebtoken').then(({ default: jwt }) => {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.write('event: connected\ndata: ok\n\n');
      addClient(decoded.userId, res);
    } catch {
      res.status(401).end();
    }
  });
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
  });
});

// ===== Serve HTML Pages =====
const pages = ['login', 'register', 'verify', 'dashboard', 'products', 'orders', 'payments', 'customers', 'settings', 'pricing'];

// Admin pages
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages', 'admin-login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages', 'admin-dashboard.html'));
});

pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(clientDir, 'pages', `${page}.html`));
  });
});

// Root — serve landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages', 'index.html'));
});

// ===== Error Handler =====
app.use(errorMiddleware);

// ===== Start Server =====
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Ubuntu Market server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
