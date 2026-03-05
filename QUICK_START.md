# 🎯 ChatCommerce OS - Quick Start Guide

## 📦 Installation (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
# Required variables:
# - MONGODB_URI
# - JWT_SECRET  
# - REFRESH_TOKEN_SECRET
# - OZOW credentials
# - WhatsApp credentials
```

### Step 3: Start Development Server
```bash
npm run dev
```

Your ChatCommerce OS is now running at `http://localhost:3000` 🚀

---

## 🧪 Testing the New Features

### 1. Test Authentication (with Refresh Tokens)

**Register a User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123",
    "businessName": "Test Business",
    "whatsappNumber": "+27123456789"
  }'
```

**Login (get access + refresh tokens):**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

Response includes:
- `token` (access token - 15min)
- `refreshToken` (7 days)

### 2. Test Product Management

**Create a Product:**
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling headphones",
    "price": 999.99,
    "sku": "WH-001",
    "category": "Electronics",
    "stock": {
      "quantity": 50,
      "trackInventory": true,
      "lowStockThreshold": 10
    }
  }'
```

**List Products:**
```bash
curl http://localhost:3000/api/products?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Test Order Creation

**Create an Order:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "items": [
      {
        "productId": "PRODUCT_ID",
        "quantity": 2
      }
    ],
    "shippingAddress": {
      "name": "John Doe",
      "address": "123 Main Street",
      "city": "Cape Town",
      "province": "Western Cape",
      "postalCode": "8001"
    }
  }'
```

This will:
- ✅ Calculate totals (subtotal, tax, shipping)
- ✅ Deduct stock automatically
- ✅ Generate order number
- ✅ Send WhatsApp confirmation
- ✅ Create status history

### 4. Test Payment Link Generation

**Create Payment Link:**
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "amount": 1999.98,
    "description": "Payment for Order #ORD-123"
  }'
```

Response includes secure Ozow payment URL with HMAC signature.

### 5. Test Invoice Generation

**Create Invoice from Order:**
```bash
curl -X POST http://localhost:3000/api/invoices/from-order \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID"
  }'
```

This will:
- ✅ Generate PDF invoice
- ✅ Save to `invoices/` directory
- ✅ Return invoice URL
- ✅ Optionally send via WhatsApp

### 6. Test WhatsApp Flow

**Create Automated Flow:**
```bash
curl -X POST http://localhost:3000/api/whatsapp/flows \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Welcome Flow",
    "trigger": "keyword",
    "triggerValue": "hello,hi,hey",
    "startStep": "welcome",
    "isActive": true,
    "steps": [
      {
        "stepId": "welcome",
        "type": "message",
        "content": "👋 Welcome to our store! How can we help you today?",
        "nextStep": "menu"
      },
      {
        "stepId": "menu",
        "type": "message",
        "content": "📱 Reply with:\n1️⃣ View Products\n2️⃣ Track Order\n3️⃣ Contact Support",
        "nextStep": null
      }
    ]
  }'
```

Now when customers send "hello" via WhatsApp, they get automated responses!

### 7. Test API Key Generation

**Generate Hashed API Key:**
```bash
curl -X POST http://localhost:3000/api/apikeys/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Production API Key"
  }'
```

⚠️ **Important**: The raw key is returned only once! Save it securely.

**Use API Key for Requests:**
```bash
curl http://localhost:3000/api/products \
  -H "X-API-Key: YOUR_RAW_API_KEY"
```

### 8. Test Analytics Dashboard

**Get Dashboard Overview:**
```bash
curl "http://localhost:3000/api/analytics/dashboard?timeframe=30d" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Returns:
- Revenue (with change %)
- Orders (with change %)
- Customers (with change %)
- Payment success rate
- Revenue by day chart
- Top products
- Recent orders

---

## 🔒 Security Features in Action

### Rate Limiting
Try making >100 requests in 15 minutes - you'll get:
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

### Input Validation
Try creating a product with invalid data:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "X",
    "price": -100
  }'
```

Response:
```json
{
  "success": false,
  "errors": [
    {
      "field": "name",
      "message": "Product name must be between 2 and 200 characters"
    },
    {
      "field": "price",
      "message": "Price must be 0 or greater"
    }
  ]
}
```

### Token Expiration
Access token expires in 15 minutes. Use refresh token to get new one:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 📊 Monitoring & Logs

### View Application Logs
```bash
# Real-time log monitoring
tail -f logs/combined-*.log

# Error logs only
tail -f logs/error-*.log

# Filter for specific user
grep "userId.*507f1f77bcf86cd799439011" logs/combined-*.log
```

### Check Health
```bash
curl http://localhost:3000/api/health
```

### Monitor with PM2 (Production)
```bash
pm2 monit
pm2 logs chatcommerce-os
pm2 status
```

---

## 🐳 Docker Quick Start

### Start with Docker Compose
```bash
# Start all services (app + MongoDB + Redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Check status
docker-compose ps

# Stop everything
docker-compose down
```

### Access Services
- **App**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

---

## 🚨 Common First-Time Issues

### 1. "Unable to connect to MongoDB"
**Solution**: 
- Start MongoDB: `systemctl start mongod`
- Or use MongoDB Atlas connection string

### 2. "WhatsApp messages not sending"
**Cause**: Invalid credentials
**Solution**: 
- Get credentials from Meta Business Suite
- Update WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env

### 3. "PDF generation failed"
**Cause**: Missing directory
**Solution**:
```bash
mkdir invoices
chmod 755 invoices
```

### 4. "Rate limit exceeded"
**Cause**: Too many requests in development
**Solution**: 
- Wait 15 minutes, or
- Temporarily disable rate limiter in middleware

### 5. "Invalid webhook signature"
**Cause**: Wrong OZOW_PRIVATE_KEY
**Solution**: 
- Get private key from Ozow dashboard
- Ensure no extra spaces/newlines

---

## 📱 WhatsApp Setup Guide

### 1. Get WhatsApp Business API Access
1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Create/select your Business
3. Add WhatsApp product
4. Complete verification

### 2. Get Credentials
- **Phone Number ID**: In WhatsApp > API Setup
- **Access Token**: Generate permanent token

### 3. Configure Webhook
**Webhook URL**: `https://your-domain.com/api/webhooks/whatsapp`
**Verify Token**: Set in WHATSAPP_WEBHOOK_VERIFY_TOKEN

**Subscribe to**:
- messages
- message_status

### 4. Test WhatsApp
Send "hello" to your WhatsApp Business number - should trigger welcome flow!

---

## 💳 Ozow Setup Guide

### 1. Get Merchant Account
Sign up at [Ozow](https://ozow.com/)

### 2. Get Credentials
From Ozow dashboard:
- **Site Code**
- **Private Key**
- **API Key**

### 3. Configure Webhook
**Webhook URL**: `https://your-domain.com/api/webhooks/ozow`

**Enable notifications for**:
- Payment Complete
- Payment Cancelled
- Payment Error

### 4. Test Mode
Set `OZOW_IS_TEST=true` for testing

---

## 🎓 Next Steps

### 1. **Customize Your Business**
- Update business info in User profile
- Upload your logo
- Set support email

### 2. **Add Your Products**
- Create product catalog
- Set inventory levels
- Organize by categories

### 3. **Import Customers**
- Use CSV import (if available)
- Or add via API

### 4. **Configure WhatsApp Flows**
- Welcome message
- Order confirmation
- Payment reminders
- FAQs

### 5. **Setup Analytics**
- Review dashboard daily
- Track top products
- Monitor conversion rates

### 6. **Go Live**
- Deploy to production (see DEPLOYMENT.md)
- Switch Ozow to live mode
- Update webhook URLs
- Test end-to-end flow

---

## 🆘 Getting Help

### Documentation
1. [README.md](README.md) - Full API documentation
2. [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment
3. [ARCHITECTURE.md](ARCHITECTURE.md) - System design
4. [REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md) - All changes

### Support Channels
- GitHub Issues
- Email: support@chatcommerce.co.za
- Documentation: https://docs.chatcommerce.co.za

---

## ✅ Pre-Launch Checklist

- [ ] Environment variables set
- [ ] MongoDB connected
- [ ] WhatsApp credentials configured
- [ ] Ozow credentials configured
- [ ] Test user registration
- [ ] Test login
- [ ] Create test product
- [ ] Create test order
- [ ] Generate payment link
- [ ] Test webhook (use Ozow test mode)
- [ ] Generate invoice
- [ ] Test WhatsApp flow
- [ ] Check logs are writing
- [ ] Review analytics dashboard
- [ ] Setup domain and SSL
- [ ] Deploy to production

---

**🎉 You're all set! Welcome to ChatCommerce OS!**

Your WhatsApp Business is now powered by:
- 🔒 Bank-level security
- 📦 Product & inventory management
- 📋 Order tracking
- 💳 Secure payments
- 📄 Professional invoices
- 🤖 Automated customer service
- 📊 Real-time analytics

**Let's build something amazing! 🚀**
