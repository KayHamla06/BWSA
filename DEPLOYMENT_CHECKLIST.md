# 🚀 Deployment & Configuration Checklist

## Pre-Deployment Checklist

### ✅ Code Requirements

- [x] All services implemented (WhatsApp, Payment, Invoice, Analytics)
- [x] Webhook handlers created (WhatsApp, Ozow)
- [x] Database models enhanced
- [x] Validation utilities added
- [x] Error handling middleware in place
- [x] Logging configured with Winston
- [x] Security measures implemented
- [x] Documentation complete

### ✅ Environment Variables

Create `.env.production` or set in Render dashboard:

```env
# REQUIRED - Database
MONGODB_URI=your_mongodb_connection_string
  ⚠️  Make sure this is your production MongoDB Atlas URI

# REQUIRED - JWT Security
JWT_SECRET=generate_a_strong_random_string_min_32_chars
  💡 Use: openssl rand -hex 32

# REQUIRED - WhatsApp Integration
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_TOKEN=your_api_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_unique_verify_token
  💡 Use: openssl rand -hex 16

# REQUIRED - Ozow Payment Gateway
OZOW_API_KEY=your_ozow_api_key
OZOW_PRIVATE_KEY=your_ozow_private_key
OZOW_API_URL=https://api.ozow.com
  ⚠️  Do NOT use https://sandbox.ozow.com in production

# REQUIRED - Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=whatsapp_commerce
  💡 Create upload preset in Cloudinary dashboard

# REQUIRED - Application Configuration
APP_NAME=WhatsApp Commerce OS
APP_URL=https://your-app.render.com
NODE_ENV=production

# OPTIONAL - Email Notifications
SMTP_HOST=your_smtp_server
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password

# OPTIONAL - Enhanced Logging
LOG_LEVEL=info
LOG_FILE=/var/log/app.log
```

### ✅ External Service Setup

#### 1. **MongoDB Atlas Setup**

- [ ] Create MongoDB Atlas account (free tier available)
- [ ] Create cluster (e.g., "wasm-prod")
- [ ] Create database user with strong password
- [ ] Add security: IP whitelist (allow Render's IP or 0.0.0.0/0 temporarily)
- [ ] Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

**Test connection:**
```bash
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/" --eval "db.version()"
```

#### 2. **WhatsApp Cloud API Setup**

- [ ] Create Meta Business Account
- [ ] Create WhatsApp Application
- [ ] Get Business Account ID
- [ ] Get Phone Number ID
- [ ] Generate API Token (with permissions: whatsapp_business_messaging)
- [ ] Create webhook verify token (any string, must match in code)

**Test WhatsApp:**
```bash
curl -X GET "https://graph.instagram.com/v18.0/PHONE_NUMBER_ID/messages?access_token=YOUR_TOKEN"
```

#### 3. **Ozow Payment Setup**

- [ ] Create Ozow merchant account
- [ ] Get API Key and Private Key
- [ ] Test with: `https://api.ozow.com` (production)
- [ ] Add webhook URL to Ozow dashboard
- [ ] Enable signature verification

**Test Ozow:**
```bash
# curl -X POST https://api.ozow.com/CreatePayment \
  -H "Content-Type: application/json" \
  -d '{"ApiKey":"YOUR_KEY","Amount":10000,...}'
```

#### 4. **Cloudinary Setup**

- [ ] Create free Cloudinary account
- [ ] Get Cloud Name, API Key, API Secret
- [ ] Create Upload Preset "whatsapp_commerce"
  - Settings: Unsigned mode ON (optional for frontend)
  - Folder: "whatsapp-products"

---

## Render Deployment Steps

### Step 1: Prepare GitHub Repository

```bash
# Ensure all files are committed
git status

# Create .gitignore entries (if not present)
cat >> .gitignore << EOF
.env.local
.env.*.local
node_modules/
dist/
build/
logs/
invoices/
EOF

# Commit and push
git add .
git commit -m "Add WhatsApp e-commerce system - production ready"
git push origin main
```

### Step 2: Create Render Service

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name**: `whatsapp-commerce-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Choose appropriate plan (Starter/Standard)

### Step 3: Add Environment Variables

In Render dashboard → Environment:

```
MONGODB_URI = your_mongodb_connection_string
JWT_SECRET = your_generated_secret
WHATSAPP_BUSINESS_ACCOUNT_ID = your_id
WHATSAPP_PHONE_NUMBER_ID = your_phone_id
WHATSAPP_API_TOKEN = your_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN = your_verify_token
OZOW_API_KEY = your_ozow_key
OZOW_PRIVATE_KEY = your_ozow_private_key
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret
APP_URL = https://your-app.render.com
NODE_ENV = production
```

### Step 4: Deploy

```bash
# Push to trigger deployment
git push origin main

# Monitor in Render dashboard
# Deployment should complete in 2-5 minutes
```

---

## Post-Deployment Configuration

### 1. **WhatsApp Webhook Configuration**

After deployment, configure webhook in Meta App Dashboard:

```
Webhook URL: https://your-app.render.com/api/webhooks/whatsapp
Verify Token: (use same as WHATSAPP_WEBHOOK_VERIFY_TOKEN)
Subscribe to:
  ☑ messages
  ☑ message_status
  ☑ message_template_status_update
```

**Test webhook:**
```bash
curl "https://your-app.render.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test_challenge"

# Expected response: test_challenge
```

### 2. **Ozow Webhook Configuration**

In Ozow Merchant Dashboard:

```
Webhook Notification URL: https://your-app.render.com/api/webhooks/ozow
Enable Signature Verification: YES
```

**Test webhook:**
```bash
# Get sample from Ozow documentation
# Verify it's receiving in logs
```

### 3. **Test End-to-End Flow**

```bash
# 1. Register user
curl -X POST https://your-app.render.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{...}'

# 2. Create product
curl -X POST https://your-app.render.com/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'

# 3. Send WhatsApp message
# Send "menu" from WhatsApp to your business number

# 4. Verify product menu appears
# 5. Click product
# 6. Click "Buy Now"
# 7. Complete payment in Ozow
# 8. Verify invoice received
```

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Monitor error logs in Render
- [ ] Check low stock alerts received
- [ ] Verify payment webhooks processing
- [ ] Monitor database size (MongoDB Atlas)

### Weekly Tasks

- [ ] Review analytics dashboard
- [ ] Check payment success rate
- [ ] Monitor customer feedback
- [ ] Verify invoice delivery

### Recommended Additions

```bash
# 1. Setup Error Tracking (Sentry)
npm install @sentry/node @sentry/tracing

# 2. Setup Monitoring (New Relic)
npm install newrelic

# 3. Setup Email Notifications
npm install nodemailer

# 4. Setup Redis for Caching
npm install redis
```

---

## Security Hardening

### Production Checklist

- [ ] JWT_SECRET is strong (32+ chars)
- [ ] MONGODB_URI uses encrypted password
- [ ] API tokens rotated monthly
- [ ] Rate limiting enforced
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Mongoose)
- [ ] XSS prevention (helmet.js)
- [ ] CSRF tokens where applicable
- [ ] Sensitive logs redacted
- [ ] HTTPS enforced (Render default)

### Additional Security

```bash
# Update dependencies
npm audit
npm audit fix

# Use environment encryption in Render
# Enable 2FA on all accounts
# Regular database backups (MongoDB Atlas auto-backup)
# Monitor unauthorized access attempts
```

---

## Troubleshooting

### Common Issues

#### **WhatsApp Messages Not Sending**

```bash
# Check configuration
echo $WHATSAPP_API_TOKEN
echo $WHATSAPP_PHONE_NUMBER_ID

# Test API directly
curl -X GET "https://graph.instagram.com/v18.0/PHONE_NUMBER_ID/messages?access_token=TOKEN"

# Check logs
tail -f logs/app.log | grep WhatsApp
```

#### **Payments Not Processing**

```bash
# Check Ozow keys
echo $OZOW_API_KEY
echo $OZOW_PRIVATE_KEY

# Verify webhook signature
# Check MongoDB payment records
db.payments.find({ status: "failed" })
```

#### **Cloudinary Upload Failing**

```bash
# Check credentials
echo $CLOUDINARY_CLOUD_NAME
echo $CLOUDINARY_API_KEY

# Test upload
curl -X POST https://api.cloudinary.com/v1_1/CLOUD_NAME/image/upload \
  -F "file=@image.jpg" \
  -F "api_key=YOUR_KEY" \
  -F "upload_preset=whatsapp_commerce"
```

#### **MongoDB Connection Issues**

```bash
# Test connection string
mongosh "MONGODB_URI"

# Check whitelist in Atlas
# Verify credentials
# Check network connectivity
```

---

## Performance Optimization

### Initial Setup

- [ ] Enable MongoDB indexes (already in models)
- [ ] Configure pagination limits
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Cache frequently accessed products

### Monitoring

```bash
# Monitor Render metrics
# Memory: Should be <500MB for starter plan
# CPU: Should be <50% average
# Database: Monitor query performance
```

---

## Scaling (Future)

When scaling beyond startup plan:

```bash
# 1. Upgrade Render plan
# 2. Add Redis for caching
# 3. Implement database sharding
# 4. Setup CDN (Cloudflare)
# 5. Load testing (Apache JMeter)
# 6. Performance monitoring (New Relic)
```

---

## Backup & Recovery

### Database Backups

MongoDB Atlas provides:
- Automatic daily backups (free)
- Point-in-time restore
- Snapshot downloads

### Application Backups

```bash
# Backup local files
git push to GitHub (automatic version control)

# Backup logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/

# Backup invoices
tar -czf invoices-backup-$(date +%Y%m%d).tar.gz invoices/
```

---

## Cost Optimization

### Free Tier Services

- ✅ MongoDB Atlas (free 512MB)
- ✅ Render (free with limitations)
- ✅ Cloudinary (free 25GB/month)

### Cost Estimates (Monthly)

| Service | Free | Paid |
|---------|------|------|
| MongoDB | $0 | $50+ |
| Render | $7 | $50+ |
| Cloudinary | $0 | $29 |
| SendGrid Email | $0 | $0 (free tier) |
| **Total** | **$7** | **$130+** |

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Meta WhatsApp API**: https://developers.facebook.com/docs/whatsapp
- **Ozow Integration**: https://ozow.com/developers
- **Cloudinary**: https://cloudinary.com/documentation

---

## Final Checklist Before Going Live

- [ ] All environment variables set in Render
- [ ] WhatsApp webhook configured
- [ ] Ozow webhook configured
- [ ] Test user created and account working
- [ ] At least 1 product created
- [ ] Payment flow tested end-to-end
- [ ] Invoice generation tested
- [ ] Analytics dashboard working
- [ ] Logs being collected
- [ ] Database backups verified
- [ ] Error handling tested
- [ ] Rate limiting tested
- [ ] Security headers verified

✅ **Once all items checked, you're LIVE!**

---

**Ready to launch? You're all set!** 🚀

Your WhatsApp Commerce OS is production-ready and deployed to Render with full integration to WhatsApp Cloud API, Ozow payments, and Cloudinary image storage.

Start selling! 💰
