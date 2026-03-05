# WhatsApp Commerce Operating System - Refactoring Guide

## 📋 OVERVIEW

Your Node.js/Next.js WhatsApp project has been refactored and upgraded into a complete **WhatsApp E-Commerce Backend System**. This document explains the architecture, changes made, and how to deploy it.

## 🏗️ SYSTEM ARCHITECTURE

```
CUSTOMER JOURNEY:
┌─────────────┐
│WhatsApp User│
└──────┬──────┘
       │ Types "menu"
       ▼
┌─────────────────────────────────────┐
│   WhatsApp Cloud API Webhook        │
│   /api/webhooks/whatsapp            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   WhatsAppService                   │
│   - sendProductMenu()               │
│   - sendProductDetails()            │
│   - sendPaymentLink()               │
│   - sendInvoice()                   │
└──────┬──────────────────────────────┘
       │
       ├─────────────────────┬──────────────────────┐
       │                     │                      │
       ▼                     ▼                      ▼
┌──────────────┐   ┌──────────────┐    ┌────────────────┐
│ OrderService │   │ProductService│    │PaymentService  │
│- createOrder│   │- getProducts │    │-generateLink   │
│- updateOrder│   │- updateStock │    │-handleWebhook  │
└──────┬───────┘   └──────┬───────┘    └────────┬───────┘
       │                │                    │
       └────────────────┴────────────────────┘
              │
              ▼
       ┌─────────────────┐
       │   MongoDB       │
       │  Collections:   │
       │  - Users        │
       │  - Products     │
       │  - Orders       │
       │  - Payments     │
       │  - Invoices     │
       │  - Customers    │
       │  - Analytics    │
       └─────────────────┘
```

## 📂 PROJECT STRUCTURE

```
whatsapp-commerce-api/
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── products/          # Product management
│   │   │   ├── route.js (GET, POST)
│   │   │   └── [id]/route.js (GET, PUT, DELETE)
│   │   ├── orders/            # Order management
│   │   │   ├── route.js
│   │   │   └── [id]/route.js
│   │   ├── payments/          # Payment endpoints
│   │   │   ├── route.js
│   │   │   ├── [id]/
│   │   │   └── ozow/success/error
│   │   ├── invoices/          # Invoice endpoints
│   │   │   ├── route.js
│   │   │   └── [id]/
│   │   ├── analytics/         # Analytics endpoints
│   │   │   └── route.js
│   │   └── webhooks/          # Webhook handlers
│   │       ├── whatsapp/      # WhatsApp messages
│   │       └── ozow/          # Payment confirmations
│   └── layout.js
├── models/                    # Mongoose schemas
│   ├── User.js
│   ├── Product.js
│   ├── Order.js
│   ├── Payment.js
│   ├── Invoice.js
│   ├── Customer.js
│   ├── Analytics.js
│   └── WhatsAppFlow.js
├── services/                  # Business logic
│   ├── whatsapp.service.js
│   ├── order.service.js
│   ├── product.service.js
│   ├── payment.service.js
│   ├── invoice.service.js
│   ├── analytics.service.js
│   └── customer.service.js
├── lib/                       # Helper utilities
│   ├── db.js                 # MongoDB connection
│   ├── jwt.js                # JWT token handling
│   ├── cloudinary.js         # Image upload (NEW)
│   ├── middleware.js
│   ├── validators.js
│   └── whatsapp.js
├── middleware/
│   ├── errorHandler.middleware.js
│   ├── rateLimiter.middleware.js
│   └── webhook.middleware.js
├── utils/
│   ├── logger.js
│   ├── sanitizer.js
│   ├── validation.js
│   └── helpers.js
└── invoices/                 # Generated PDF invoices
```

## 🚀 FEATURES IMPLEMENTED

### 1. **Authentication & Authorization**
- JWT-based authentication
- bcrypt password hashing
- User registration and login
- Secure middleware for protected routes
- Business account management

### 2. **Product Management**
- Create, read, update, delete products
- Image upload to Cloudinary
- Stock tracking with low-stock alerts
- Product categories and descriptions
- Revenue tracking per product

### 3. **WhatsApp Integration**
- **Menu Flow**: Customer types "menu" → gets interactive product list
- **Product Selection**: Customer selects product → sees details with "Buy Now" button
- **Interactive Messages**: List selections, button replies
- **Payment Links**: After order creation, payment link sent via WhatsApp
- **Invoice Delivery**: Automatic invoice PDF sent after payment
- **Notifications**: Low stock alerts to business, order confirmations to customers

### 4. **Order Management**
- Create orders from WhatsApp interactions
- Order status tracking (pending → confirmed → processing → shipped → delivered)
- Automatic inventory deduction
- Order history and tracking

### 5. **Payment Integration**
- **Ozow Payment Gateway** integration
- Payment link generation with unique reference
- Webhook signature verification
- Transaction tracking
- Refund support
- Payment status monitoring

### 6. **Invoice Generation**
- Automatic invoice creation after payment
- PDF generation with business/customer details
- Invoice numbering system
- Status tracking (draft → sent → paid)
- Invoice delivery via WhatsApp

### 7. **Customer Tracking**
- Automatic customer creation on first order
- Phone number-based identification
- Total spent tracking
- Order count tracking
- Last order date recording

### 8. **Analytics & Reporting**
- Total revenue calculation
- Daily/monthly revenue
- Top products by sales
- Customer metrics (count, avg spent)
- Order status breakdown
- Payment method breakdown
- Dashboard summary

## 🔒 SECURITY FEATURES

✅ **JWT Authentication** - Secure token-based auth
✅ **bcrypt Password Hashing** - Industry-standard hashing
✅ **Webhook Verification** - Signature verification for Ozow webhooks
✅ **Input Validation** - Express-validator integration
✅ **Rate Limiting** - Prevent abuse
✅ **Helmet Security** - HTTP headers protection
✅ **MongoDB Sanitization** - Prevent injection attacks
✅ **Environment Variables** - Secrets management
✅ **Error Handling** - Centralized error middleware
✅ **Logging** - Winston logger with audit trails

## 📊 DATABASE MODELS

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (bcrypt),
  businessName: String,
  businessDescription: String,
  whatsappNumber: String,
  logo: String,
  plan: String (free|basic|pro|enterprise),
  supportEmail: String,
  isVerified: Boolean,
  status: String (active|suspended|inactive),
  createdAt: Date,
  updatedAt: Date
}
```

### Product
```javascript
{
  userId: ObjectId (ref: User),
  name: String,
  description: String,
  sku: String,
  price: Number,
  currency: String (default: ZAR),
  category: String,
  stock: {
    quantity: Number,
    trackInventory: Boolean,
    lowStockThreshold: Number
  },
  images: [String],
  isActive: Boolean,
  soldCount: Number,
  revenue: Number,
  createdAt: Date
}
```

### Order
```javascript
{
  userId: ObjectId (ref: User),
  customerId: ObjectId (ref: Customer),
  orderNumber: String (unique),
  items: [{
    productId: ObjectId,
    name: String,
    price: Number,
    quantity: Number,
    subtotal: Number
  }],
  subtotal: Number,
  tax: Number,
  shipping: Number,
  discount: Number,
  total: Number,
  status: String (pending|confirmed|processing|shipped|delivered|cancelled),
  paymentStatus: String (pending|paid|failed|refunded),
  paymentId: ObjectId (ref: Payment),
  invoiceId: ObjectId (ref: Invoice),
  createdAt: Date
}
```

### Payment
```javascript
{
  userId: ObjectId,
  customerId: ObjectId,
  orderId: ObjectId,
  amount: Number,
  currency: String,
  paymentMethod: String (ozow|payshap|stripe),
  status: String (pending|completed|failed|refunded),
  transactionId: String,
  paymentLinkId: String,
  paidAt: Date,
  refundedAt: Date,
  webhookData: Mixed,
  createdAt: Date
}
```

### Invoice
```javascript
{
  userId: ObjectId,
  customerId: ObjectId,
  orderId: ObjectId,
  paymentId: ObjectId,
  invoiceNumber: String (auto-generated),
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  discount: Number,
  total: Number,
  status: String (draft|sent|paid|overdue),
  pdfUrl: String,
  createdAt: Date
}
```

### Customer
```javascript
{
  userId: ObjectId (optional),
  name: String,
  email: String,
  whatsappNumber: String,
  totalSpent: Number,
  paymentCount: Number,
  lastPaymentDate: Date,
  createdAt: Date
}
```

## 📡 API ENDPOINTS

### Authentication
```
POST   /api/auth/register        - Register new business
POST   /api/auth/login           - Login user
POST   /api/auth/verify          - Verify email
```

### Products
```
GET    /api/products             - List products (auth required)
POST   /api/products             - Create product (auth required)
GET    /api/products/[id]        - Get single product (auth required)
PUT    /api/products/[id]        - Update product (auth required)
DELETE /api/products/[id]        - Delete product (auth required)
```

###Orders
```
GET    /api/orders               - List orders (auth required)
POST   /api/orders               - Create order (auth required)
GET    /api/orders/[id]          - Get order details (auth required)
PUT    /api/orders/[id]          - Update order (auth required)
```

### Payments
```
GET    /api/payments             - List payments (auth required)
GET    /api/payments/[id]        - Get payment status (auth required)
POST   /api/payments             - Create payment (internal)
```

### Invoices
```
GET    /api/invoices             - List invoices (auth required)
GET    /api/invoices/[id]        - Get invoice (auth required)
POST   /api/invoices/[id]/pdf    - Generate PDF (auth required)
```

### Analytics
```
GET    /api/analytics            - Get dashboard summary (auth required)
GET    /api/analytics/revenue    - Get revenue data (auth required)
GET    /api/analytics/products   - Get top products (auth required)
GET    /api/analytics/customers  - Get customer metrics (auth required)
```

### Webhooks (No auth required)
```
GET    /api/webhooks/whatsapp    - Webhook verification
POST   /api/webhooks/whatsapp    - Incoming WhatsApp messages
GET    /api/webhooks/ozow        - Ozow verification
POST   /api/webhooks/ozow        - Ozow payment confirmation
```

## 🔌 WhatsApp Chat Flow

### Customer Conversation Example:

```
Customer: "Hi, I want to buy something"
Bot: "👋 Hello! Type 'menu' to see our products or 'help' for more info"

Customer: "menu"
Bot: [Sends interactive list with products]

Customer: [Selects "Running Shoes"]
Bot: [Sends product details with "Add to Cart" button]

Customer: [Clicks "Add to Cart"]
Bot: [Creates order, generates payment link]
Bot: [Sends payment confirmation with link]

Customer: [Completes payment on Ozow]
Payment Gateway: [Sends webhook to /api/webhooks/ozow]
Bot: [Receives payment confirmation]
Bot: [Generates invoice PDF]
Bot: [Sends "Payment Successful" + invoice to customer]
Bot: [Reduces stock, alerts owner if low]
```

## 🚀 DEPLOYMENT TO RENDER

### 1. **Prepare Your Project**
```bash
# Ensure you have all environment variables set in Render
# These should be in your Render dashboard under Environment Variables:
- MONGODB_URI
- JWT_SECRET
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_API_TOKEN
- OZOW_API_KEY
- OZOW_PRIVATE_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- APP_URL (your Render app URL)
```

### 2. **Update Render Configuration**
```yaml
# render.yaml (optional - for IaC)
services:
  - type: web
    name: whatsapp-commerce-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      # ... other env vars
```

### 3. **Deploy**
```bash
# Push to GitHub (Render connects to GitHub)
git add .
git commit -m "Add WhatsApp e-commerce features"
git push origin main

# Render will automatically detect changes and deploy
# Monitor deployment in Render dashboard
```

### 4. **Configure Webhooks in Meta/WhatsApp Cloud API**
```
Webhook URL: https://your-app.render.com/api/webhooks/whatsapp
Verify Token: (set in .env.local as WHATSAPP_WEBHOOK_VERIFY_TOKEN)
Subscribe to: messages, message_status
```

### 5. **Configure Ozow Webhook**
```
Notification URL: https://your-app.render.com/api/webhooks/ozow
```

## 📈 PERFORMANCE OPTIMIZATION

✅ **Database Indexing** - Efficient queries for products, orders, customers
✅ **Pagination** - List endpoints support pagination
✅ **Lean Queries** - Mongoose lean() for improved performance
✅ **Caching** - Consider Redis for frequently accessed data
✅ **Connection Pooling** - MongoDB connection pooling

## 🔍 MONITORING & LOGGING

- **Winston Logger** - Structured logging with file rotation
- **Error Tracking** - Centralized error handling
- **Audit Trails** - Payment and order tracking
- **Metrics** - Revenue, order counts, customer metrics

## 🎯 NEXT STEPS

### Short-term:
1. Update environment variables in Render
2. Configure WhatsApp webhook
3. Configure Ozow webhook
4. Test end-to-end flow
5. Train business on system

### Mid-term:
1. Add email notifications
2. Implement multi-currency support
3. Add advanced analytics dashboard
4. Implement customer feedback system
5. Add inventory forecasting

### Long-term:
1. Support multiple payment gateways
2. Implement affiliate system
3. Add bulk order management
4. Mobile app for order management
5. AI-powered customer support

## 🐛 TROUBLESHOOTING

### WhatsApp Messages Not Sending
- Verify WHATSAPP_API_TOKEN is correct
- Check WHATSAPP_PHONE_NUMBER_ID format (should include country code)
- Ensure webhook is verified with Meta

### Payments Not Processing
- Verify OZOW_API_KEY and OZOW_PRIVATE_KEY
- Check webhook signature verification
- Ensure OZOW_API_URL is correct environment

### Cloudinary Upload Failing
- Verify CLOUDINARY_CLOUD_NAME
- Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET
- Ensure upload preset exists in Cloudinary

## 📞 SUPPORT

For issues:
1. Check logs in Render dashboard
2. Review environment variables
3. Test webhooks with tools like Postman
4. Check MongoDB connection status

---

## 📝 SUMMARY OF CHANGES

| Component | Status | Changes |
|-----------|--------|---------|
| Models | ✅ Enhanced | Added proper indexes, validations |
| Services | ✅ Expanded | Added payment, invoice, analytics services |
| WhatsApp | ✅ Enhanced | Product menus, interactive messages |
| Payment | ✅ Integrated | Ozow webhook handling |
| Analytics | ✅ Enhanced | Dashboard, revenue tracking |
| Documentation | ✅ New | Complete API documentation |
| Middleware | ✅ Improved | Better error handling, logging |
| Security | ✅ Enhanced | Webhook verification, input validation |

---

**Version**: 2.0.0 (WhatsApp E-Commerce)
**Last Updated**: March 5, 2026
**Status**: Production Ready
