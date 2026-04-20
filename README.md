# ChatCommerce OS 🚀

A production-ready WhatsApp Business Operating System with PayFast payment routing, Ubuntu Pay wallet balances, product management, order tracking, automated messaging flows, and comprehensive analytics.

## 🎯 Features

### Core Functionality
- **Product Management**: Full CRUD with inventory tracking and low-stock alerts
- **Order Management**: Complete order lifecycle from creation to delivery
- **Payment Processing**: PayFast direct settlement or Ubuntu Pay platform settlement with signed webhook verification
- **Ubuntu Pay Wallets**: Track seller balances on-platform and request withdrawals by bank, immediate payment, PayShap, QR, or Capitec
- **Secure Ledger**: Double-entry ledger with SHA256 signatures for each wallet movement
- **Invoice Generation**: Automated PDF invoice creation and delivery
- **Customer Management**: Comprehensive customer tracking and history
- **WhatsApp Automation**: Flow-based automated messaging system

### Security
- ✅ JWT authentication with refresh tokens
- ✅ bcrypt password hashing
- ✅ API key hashing with bcrypt
- ✅ Rate limiting (per IP and per user)
- ✅ HMAC webhook signature verification
- ✅ Idempotent payment webhook processing using transaction keys
- ✅ Input sanitization and validation
- ✅ MongoDB injection protection
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Encrypted banking payout details at rest

### Analytics & Reporting
- Real-time dashboard with revenue, orders, and customer metrics
- Daily/weekly/monthly aggregated analytics
- Top selling products analysis
- Revenue trends and charts
- Payment success rate tracking

### Production Ready
- Docker containerization
- Docker Compose orchestration
- PM2 process management
- Winston structured logging
- Error handling middleware
- Health check endpoints
- Graceful shutdown handling

## 📁 Project Structure

```
chatcommerce-os/
├── models/              # MongoDB schemas
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Customer.js
│   ├── Payment.js
│   ├── Invoice.js
│   ├── ApiKey.js
│   ├── RefreshToken.js
│   ├── WhatsAppFlow.js
│   └── Analytics.js
├── services/            # Business logic layer
│   ├── product.service.js
│   ├── order.service.js
│   ├── whatsapp.service.js
│   ├── ozow.service.js
│   ├── invoice.service.js
│   └── analytics.service.js
├── middleware/          # Express middleware
│   ├── auth.middleware.js
│   ├── rateLimiter.middleware.js
│   ├── errorHandler.middleware.js
│   └── webhook.middleware.js
├── utils/              # Utility functions
│   ├── logger.js
│   ├── sanitizer.js
│   └── validation.js
├── app/                # Next.js app directory
├── components/         # React components
├── lib/               # Core libraries
├── logs/              # Application logs
├── invoices/          # Generated PDF invoices
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.js
└── .env.example

```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 7.0+
- WhatsApp Business API access
- PayFast merchant account

### Installation

1. **Clone and install dependencies**
```bash
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Run development server**
```bash
npm run dev
```

4. **Build for production**
```bash
npm run build
npm run start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Using Docker Only
```bash
# Build image
docker build -t chatcommerce-os .

# Run container
docker run -d \
  --name chatcommerce \
  -p 3000:3000 \
  --env-file .env \
  chatcommerce-os
```

## 📦 Production Deployment on Render

### Automatic Deployment

1. **Push to GitHub**
2. **Connect to Render**
   - Create new Web Service
   - Connect your repository
   - Select branch

3. **Configure Build**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`

4. **Add Environment Variables**
   - Copy from `.env.example`
   - Set production values
   - Add MongoDB connection string

5. **Deploy**
   - Render will auto-deploy on git push

### Manual Deployment with PM2
```bash
# Install PM2 globally
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## 🔐 Environment Variables

### Required
```bash
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
REFRESH_TOKEN_SECRET=your_refresh_token_secret
OZOW_SITE_CODE=your_ozow_site_code
OZOW_PRIVATE_KEY=your_ozow_private_key
WHATSAPP_PHONE_ID=your_whatsapp_phone_id
WHATSAPP_TOKEN=your_whatsapp_token
APP_URL=https://your-domain.com
```

### Optional
```bash
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "businessName": "My Business",
  "whatsappNumber": "+27123456789"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

### Products

#### Create Product
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "sku": "PROD-001",
  "stock": {
    "quantity": 100,
    "trackInventory": true
  }
}
```

#### List Products
```http
GET /api/products?page=1&limit=20
Authorization: Bearer {token}
```

### Orders

#### Create Order
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "customer_id",
  "items": [
    {
      "productId": "product_id",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "Cape Town",
    "postalCode": "8001"
  }
}
```

### Payments

#### Create Payment Link
```http
POST /api/payments/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerId": "customer_id",
  "amount": 100.00,
  "description": "Payment for order #123"
}
```

### API Keys

#### Generate API Key
```http
POST /api/apikeys/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Production API Key"
}
```

## 🔄 WhatsApp Flows

### Create Automated Flow
```http
POST /api/whatsapp/flows
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Welcome Flow",
  "trigger": "keyword",
  "triggerValue": "hello,hi",
  "startStep": "welcome",
  "steps": [
    {
      "stepId": "welcome",
      "type": "message",
      "content": "Welcome! How can we help you today?",
      "nextStep": null
    }
  ]
}
```

## 📊 Analytics Dashboard

Access comprehensive analytics at `/dashboard/analytics`:
- Revenue trends
- Order statistics
- Customer growth
- Top products
- Payment success rates

## 🔧 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
systemctl status mongod

# Test connection
mongosh "your_connection_string"
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### PDF Generation Fails
Ensure the `invoices` directory exists and has write permissions:
```bash
mkdir -p invoices
chmod 755 invoices
```

## 📖 Development Guide

### Adding New Features
1. Create service in `/services`
2. Add middleware if needed in `/middleware`
3. Create API routes in `/app/api`
4. Add validation rules in `/utils/validation.js`
5. Update models if needed
6. Write tests
7. Update documentation

### Code Style
- Use ES modules (import/export)
- Follow async/await pattern
- Use try/catch for error handling
- Log all important operations
- Validate all inputs
- Sanitize user data

## 🛡️ Security Best Practices

1. **Never commit `.env` files**
2. **Rotate secrets regularly**
3. **Use strong JWT secrets** (32+ characters)
4. **Enable HTTPS in production**
5. **Keep dependencies updated** (`npm audit`)
6. **Monitor logs for suspicious activity**
7. **Implement rate limiting** (already included)
8. **Validate webhook signatures** (already included)

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Support

For issues and questions:
- Open an issue on GitHub
- Email: support@chatcommerce.co.za
- Documentation: https://docs.chatcommerce.co.za

## 🎉 Credits

Built with:
- Next.js 14
- MongoDB
- Express.js
- WhatsApp Business API
- Ozow Payment Gateway
- PDFKit
- Winston Logger
- And many other amazing open-source projects

---

**Made with ❤️ for WhatsApp Business Automation**