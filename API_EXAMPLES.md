# API Usage Examples & Integration Guide

## 📚 Complete API Reference with Examples

### Authentication Endpoints

#### Register Business Account

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Entrepreneur",
    "email": "john@mystore.com",
    "password": "SecurePassword123!",
    "businessName": "John Sports Store",
    "whatsappNumber": "+27823456789"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "user_mongo_id",
    "name": "John Entrepreneur",
    "email": "john@mystore.com",
    "businessName": "John Sports Store"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2..."
}
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@mystore.com",
    "password": "SecurePassword123!"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_mongo_id",
    "name": "John Entrepreneur",
    "email": "john@mystore.com",
    "businessName": "John Sports Store",
    "plan": "basic"
  }
}
```

---

### Product Management Endpoints

#### Create Product

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Premium Running Shoes",
    "description": "Lightweight, durable shoes perfect for daily running",
    "price": 1299.99,
    "category": "Footwear",
    "stock": {
      "quantity": 50,
      "trackInventory": true,
      "lowStockThreshold": 10
    },
    "images": [
      "https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1/shoes.jpg"
    ]
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "product": {
    "_id": "product_mongo_id",
    "name": "Premium Running Shoes",
    "price": 1299.99,
    "stock": {
      "quantity": 50,
      "trackInventory": true,
      "lowStockThreshold": 10
    },
    "images": ["https://..."],
    "isActive": true,
    "createdAt": "2024-03-05T10:30:00Z"
  }
}
```

#### List Products

```bash
TOKEN="your_jwt_token_here"

# Get all products (paginated)
curl -X GET "http://localhost:3000/api/products?page=1&limit=20&category=Footwear" \
  -H "Authorization: Bearer $TOKEN"

# Search products
curl -X GET "http://localhost:3000/api/products?search=running" \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200):**
```json
{
  "success": true,
  "products": [
    {
      "_id": "product_id_1",
      "name": "Premium Running Shoes",
      "price": 1299.99,
      "stock": { "quantity": 50 },
      "category": "Footwear",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

#### Get Single Product

```bash
curl -X GET http://localhost:3000/api/products/product_mongo_id \
  -H "Authorization: Bearer $TOKEN"
```

#### Update Product

```bash
curl -X PUT http://localhost:3000/api/products/product_mongo_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Product Name",
    "price": 1499.99,
    "stock": { "quantity": 45 }
  }'
```

#### Delete Product

```bash
curl -X DELETE http://localhost:3000/api/products/product_mongo_id \
  -H "Authorization: Bearer $TOKEN"
```

---

### Order Management Endpoints

#### Create Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerId": "customer_mongo_id",
    "items": [
      {
        "productId": "product_id_1",
        "quantity": 2
      },
      {
        "productId": "product_id_2",
        "quantity": 1
      }
    ],
    "shippingAddress": {
      "name": "Customer Name",
      "phone": "+27823456789",
      "address": "123 Main Street",
      "city": "Cape Town",
      "province": "Western Cape",
      "postalCode": "8000"
    },
    "notes": "Please handle with care"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "order": {
    "_id": "order_mongo_id",
    "orderNumber": "ORD-2024-03-001",
    "items": [
      {
        "productId": "...",
        "name": "Premium Running Shoes",
        "quantity": 2,
        "price": 1299.99,
        "subtotal": 2599.98
      }
    ],
    "subtotal": 3899.97,
    "tax": 584.99,
    "total": 4484.96,
    "status": "pending",
    "paymentStatus": "pending",
    "createdAt": "2024-03-05T10:30:00Z"
  }
}
```

#### List User's Orders

```bash
curl -X GET "http://localhost:3000/api/orders?page=1&status=confirmed" \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Single Order

```bash
curl -X GET http://localhost:3000/api/orders/order_mongo_id \
  -H "Authorization: Bearer $TOKEN"
```

#### Update Order Status

```bash
curl -X PUT http://localhost:3000/api/orders/order_mongo_id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "shipped"
  }'
```

---

### Payment Endpoints

#### Create Payment Link (Ozow)

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "orderId": "order_mongo_id",
    "paymentMethod": "ozow"
  }'
```

**Success Response (201):**
```json
{
  "success": true,
  "payment": {
    "_id": "payment_mongo_id",
    "paymentUrl": "https://checkout.ozow.com/PaymentLink/...",
    "amount": 4484.96,
    "status": "pending",
    "reference": "ORD-2024-03-001-1709625000000",
    "orderId": "order_mongo_id"
  }
}
```

#### Get Payment Status

```bash
curl -X GET http://localhost:3000/api/payments/payment_mongo_id \
  -H "Authorization: Bearer $TOKEN"
```

#### List User's Payments

```bash
curl -X GET "http://localhost:3000/api/payments?status=completed&page=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Invoice Endpoints

#### Get User's Invoices

```bash
curl -X GET "http://localhost:3000/api/invoices?page=1&status=paid" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "invoices": [
    {
      "_id": "invoice_id",
      "invoiceNumber": "INV-2024-000001",
      "orderId": "order_id",
      "customerId": "customer_id",
      "items": [...],
      "subtotal": 3899.97,
      "tax": 584.99,
      "total": 4484.96,
      "status": "paid",
      "createdAt": "2024-03-05T10:30:00Z"
    }
  ],
  "pagination": { ... }
}
```

#### Get Single Invoice

```bash
curl -X GET http://localhost:3000/api/invoices/invoice_mongo_id \
  -H "Authorization: Bearer $TOKEN"
```

#### Generate Invoice PDF

```bash
curl -X GET http://localhost:3000/api/invoices/invoice_mongo_id/pdf \
  -H "Authorization: Bearer $TOKEN" \
  --output invoice.pdf
```

---

### Analytics & Reporting Endpoints

#### Get Dashboard Summary

```bash
curl -X GET http://localhost:3000/api/analytics \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "total": 125000.50,
      "today": 5280.00,
      "thisMonth": 85000.75,
      "avgOrderValue": 2500.15
    },
    "orders": {
      "total": 50,
      "today": 2,
      "thisMonth": 34,
      "byStatus": [
        { "_id": "delivered", "count": 40 },
        { "_id": "confirmed", "count": 7 },
        { "_id": "pending", "count": 3 }
      ]
    },
    "customers": {
      "totalCustomers": 22,
      "totalSpent": 125000.50,
      "avgSpentPerCustomer": 5681.84,
      "totalOrders": 50
    },
    "topProducts": [
      {
        "_id": "product_id_1",
        "name": "Premium Running Shoes",
        "totalSold": 15,
        "totalRevenue": 19499.85
      }
    ]
  }
}
```

#### Get Revenue Analytics

```bash
# Get revenue breakdown by date
curl -X GET "http://localhost:3000/api/analytics/revenue?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "2024-03-05",
      "revenue": 5280.00,
      "orders": 2
    },
    {
      "_id": "2024-03-04",
      "revenue": 8450.50,
      "orders": 3
    }
  ]
}
```

#### Get Top Products

```bash
curl -X GET "http://localhost:3000/api/analytics/products?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

#### Get Customer Metrics

```bash
curl -X GET http://localhost:3000/api/analytics/customers \
  -H "Authorization: Bearer $TOKEN"
```

---

### Webhook Endpoints (No Auth Required)

#### WhatsApp Webhook - Verify

```bash
# Meta sends this GET request for verification
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify_token_12345&hub.challenge=challenge_string"

# Your server should respond with the challenge string
```

#### WhatsApp Webhook - Receive Message

```bash
# Meta sends this POST request when customer messages you
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [
      {
        "id": "ENTRY_ID",
        "changes": [
          {
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "1234567890",
                "phone_number_id": "PHONE_NUMBER_ID"
              },
              "messages": [
                {
                  "from": "27823456789",
                  "id": "wamid.XXX",
                  "timestamp": "1684233777",
                  "type": "text",
                  "text": {
                    "body": "menu"
                  }
                }
              ]
            },
            "field": "messages"
          }
        ]
      }
    ]
  }'
```

#### Ozow Payment Webhook

```bash
curl -X POST http://localhost:3000/api/webhooks/ozow \
  -H "Content-Type: application/json" \
  -d '{
    "Status": "complete",
    "Reference": "ORD-2024-03-001-1709625000000",
    "Amount": 448496,
    "OzowId": "123456789",
    "OrderReference": "order_mongo_id",
    "Signature": "signature_hash_here",
    "CurrencyCode": "ZAR"
  }'
```

---

## 🔐 Error Responses

### Unauthorized (401)

```json
{
  "success": false,
  "message": "Invalid or missing authentication token",
  "error": "Unauthorized"
}
```

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email",
      "value": "invalid-email"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Product not found",
  "error": "Not Found"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Something went wrong"
}
```

---

## 💾 Environment Setup for Testing

Create a `.env.test` file:

```env
MONGODB_URI=mongodb://localhost:27017/whatsapp_commerce_test
JWT_SECRET=test_secret_key_12345
WHATSAPP_PHONE_NUMBER_ID=test_phone_id
WHATSAPP_API_TOKEN=test_token
OZOW_API_KEY=test_ozow_key
OZOW_PRIVATE_KEY=test_ozow_private_key
NODE_ENV=test
APP_URL=http://localhost:3000
```

---

## 🧪 Integration Testing Tips

1. **Use Postman Collections**: Import the examples above into Postman
2. **Test Webhooks Locally**: Use ngrok to expose localhost
3. **Mock External APIs**: Use jest mocks for Ozow/WhatsApp in tests
4. **Database Isolation**: Use separate test database
5. **Clean Up**: Delete test data after each test suite

---

This guide should cover most common API usage scenarios!
