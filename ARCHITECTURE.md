# ChatCommerce OS - Architecture Documentation

## 📐 System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (Next.js Frontend, Mobile Apps, External API Consumers)    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Security Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Rate Limiter │  │ Validator    │  │ Sanitizer    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │ JWT Auth     │  │ API Key Auth │                         │
│  └──────────────┘  └──────────────┘                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      API/Route Layer                         │
│  Next.js API Routes (/app/api)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Product Svc  │  │ Order Svc    │  │ Payment Svc  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ WhatsApp Svc │  │ Invoice Svc  │  │ Analytics Svc│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌────────────────────────────────────────────────┐         │
│  │            MongoDB (Mongoose ODM)              │         │
│  │  - Users      - Products    - Orders           │         │
│  │  - Customers  - Payments    - Invoices         │         │
│  │  - API Keys   - Analytics   - WhatsApp Flows   │         │
│  └────────────────────────────────────────────────┘         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Ozow API     │  │ WhatsApp API │  │ Email (SMTP) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Architecture

### Authentication Flow
```
1. User Login
   ├─→ Validate credentials
   ├─→ Generate access token (15min TTL)
   ├─→ Generate refresh token (7day TTL)
   ├─→ Store refresh token in DB
   └─→ Return both tokens

2. API Request
   ├─→ Extract access token from header
   ├─→ Verify JWT signature
   ├─→ Check expiration
   ├─→ Attach user context to request
   └─→ Process request

3. Token Refresh
   ├─→ Validate refresh token
   ├─→ Check DB for revocation
   ├─→ Generate new access token
   └─→ Return new access token

4. Logout
   ├─→ Revoke refresh token in DB
   └─→ Client discards tokens
```

### API Key Authentication
```
1. API Key Generation
   ├─→ Generate random 64-char key
   ├─→ Hash with bcrypt
   ├─→ Store hash + prefix in DB
   └─→ Return raw key once (never stored)

2. API Request with Key
   ├─→ Extract X-API-Key header
   ├─→ Find candidates by prefix
   ├─→ Verify against stored hash
   ├─→ Check expiration & limits
   ├─→ Update usage statistics
   └─→ Process request
```

### Webhook Security (HMAC)
```
1. Receive Webhook
   ├─→ Extract signature header
   ├─→ Rebuild payload string
   ├─→ Calculate expected HMAC
   ├─→ Compare signatures (constant time)
   └─→ Process if valid

2. For Ozow Webhooks
   ├─→ Sort all params (except HashCheck)
   ├─→ Concatenate values
   ├─→ Append private key
   ├─→ SHA-512 hash
   └─→ Compare with HashCheck field
```

## 📊 Data Flow Diagrams

### Order Creation Flow
```
Client Request
     │
     ▼
Validate Input
     │
     ├─→ Verify customer exists
     ├─→ Validate products
     └─→ Check stock availability
     │
     ▼
Calculate Totals
     │
     ├─→ Subtotal (price × qty)
     ├─→ Tax (15% VAT)
     ├─→ Shipping
     └─→ Discount
     │
     ▼
Deduct Stock
     │
     ▼
Create Order Document
     │
     ▼
Generate Order Number
     │
     ▼
Create Payment Link (optional)
     │
     ▼
Send WhatsApp Confirmation
     │
     ▼
Return Order Details
```

### Payment Processing Flow
```
1. Create Payment Link
   ├─→ Verify customer
   ├─→ Generate payment ID
   ├─→ Build Ozow URL with hash
   └─→ Return payment link

2. Customer Pays
   ├─→ Redirected to Ozow
   ├─→ Completes payment
   └─→ Redirected back

3. Webhook Notification
   ├─→ Receive webhook
   ├─→ Verify HMAC signature
   ├─→ Find payment record
   ├─→ Update status
   ├─→ Update customer stats
   ├─→ Send WhatsApp confirmation
   └─→ Trigger payment_received flow

4. Invoice Generation
   ├─→ Create invoice record
   ├─→ Generate PDF
   ├─→ Store PDF path
   └─→ Send via WhatsApp (optional)
```

### WhatsApp Flow Execution
```
1. Incoming Message
   ├─→ Parse webhook
   ├─→ Extract message & sender
   ├─→ Find/create customer
   └─→ Check for matching flows

2. Trigger Matching Flows
   ├─→ Match trigger type
   ├─→ Match trigger value (keyword)
   └─→ Execute flow steps

3. Flow Step Execution
   ├─→ Message: Send text
   ├─→ Question: Send & wait for response
   ├─→ Condition: Evaluate & branch
   └─→ Action: Execute system action

4. Flow Actions
   ├─→ create_order
   ├─→ send_payment_link
   ├─→ send_invoice
   ├─→ update_customer
   └─→ notify_admin
```

## 🗄️ Database Schema

### Collections Overview
```
users
  ├─→ Authentication & profile
  └─→ Business settings

products
  ├─→ Catalog items
  └─→ Inventory tracking

orders
  ├─→ Order lifecycle
  ├─→ Line items
  └─→ Status history

customers
  ├─→ Customer info
  └─→ Purchase history

payments
  ├─→ Payment records
  ├─→ Transaction IDs
  └─→ Webhook data

invoices
  ├─→ Invoice records
  └─→ PDF paths

apiKeys
  ├─→ Hashed keys
  └─→ Usage statistics

refreshTokens
  ├─→ Active tokens
  └─→ Device info

whatsappFlows
  ├─→ Flow definitions
  └─→ Step configurations

analytics
  ├─→ Aggregated metrics
  └─→ Time-series data
```

### Key Relationships
```
User (1) ─────────── (N) Products
User (1) ─────────── (N) Customers
User (1) ─────────── (N) Orders
User (1) ─────────── (N) Payments
User (1) ─────────── (N) Invoices
User (1) ─────────── (N) ApiKeys
User (1) ─────────── (N) WhatsAppFlows

Customer (1) ──────── (N) Orders
Customer (1) ──────── (N) Payments
Customer (1) ──────── (N) Invoices

Order (1) ────────── (1) Payment
Order (1) ────────── (1) Invoice

Product (N) ────────── (M) Order.items
```

## 🔄 API Rate Limiting

### Rate Limit Tiers
```
General API:      100 requests / 15 minutes / IP
Authentication:   5 attempts / 15 minutes / IP
Payments:         50 requests / 1 hour / IP
Webhooks:         100 requests / 1 minute / IP
User (per API key): 1000 requests / 1 hour / user
```

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1678901234
```

## 📝 Logging Strategy

### Log Levels
```
error:   System errors, exceptions
warn:    Warnings, suspicious activity
info:    General operations, API requests
http:    HTTP request/response details
debug:   Detailed debugging (dev only)
```

### Log Structure
```json
{
  "timestamp": "2026-03-02 14:30:00",
  "level": "info",
  "message": "Payment processed",
  "service": "chatcommerce-os",
  "userId": "507f1f77bcf86cd799439011",
  "paymentId": "507f1f77bcf86cd799439012",
  "amount": 100.00,
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "..."
  }
}
```

### Log Rotation
```
Daily rotation
Max file size: 20MB
Retention: 14 days
Compression: Enabled
```

## 🚀 Performance Optimization

### Database Indexes
```javascript
// Users
{ email: 1 } // unique
{ status: 1, plan: 1 }

// Products
{ userId: 1, isActive: 1 }
{ userId: 1, category: 1 }
{ sku: 1 } // unique, sparse

// Orders
{ userId: 1, status: 1 }
{ customerId: 1 }
{ orderNumber: 1 } // unique
{ createdAt: -1 }

// Payments
{ userId: 1, status: 1 }
{ transactionId: 1 } // unique, sparse
{ customerId: 1, status: 1 }

// API Keys
{ userId: 1, isActive: 1 }
{ keyPrefix: 1 }

// Analytics
{ userId: 1, period: 1, date: -1 }
```

### Caching Strategy (Future Enhancement)
```
Redis caching for:
- User sessions
- Product catalog
- Analytics dashboards
- Rate limit counters
- API response cache

TTL recommendations:
- User data: 5 minutes
- Product data: 15 minutes
- Analytics: 1 hour
- Rate limits: As configured
```

## 🔧 Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "User-friendly error message",
  "code": "ERROR_CODE",
  "stack": "..." // Only in development
}
```

### HTTP Status Codes
```
200: Success
201: Created
400: Bad Request (validation errors)
401: Unauthorized (authentication failed)
403: Forbidden (insufficient permissions)
404: Not Found
409: Conflict (duplicate resource)
429: Too Many Requests (rate limited)
500: Internal Server Error
503: Service Unavailable
```

## 🎯 API Design Principles

1. **RESTful conventions**
2. **Consistent naming** (plural nouns for collections)
3. **Versioning** (via URL when needed: /api/v1/)
4. **Pagination** (page, limit parameters)
5. **Filtering** (query parameters)
6. **Sorting** (sortBy, order parameters)
7. **Field selection** (fields parameter)
8. **Meaningful HTTP status codes**
9. **Detailed error messages**
10. **HATEOAS links** (where applicable)

---

## 📚 Further Reading

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Ozow API Documentation](https://docs.ozow.com)

---

**For implementation details, see individual service files in `/services` directory.**
