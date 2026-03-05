# ChatCommerce OS - Deployment Guide

## 🚀 Deployment Options

### Option 1: Render (Recommended for Quick Setup)

#### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial ChatCommerce OS deployment"
git remote add origin <your-github-repo>
git push -u origin main
```

#### Step 2: Setup MongoDB Atlas
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create database user
4. Whitelist all IPs (0.0.0.0/0) for Render
5. Get connection string

#### Step 3: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: chatcommerce-os
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free or Starter

#### Step 4: Add Environment Variables
In Render dashboard, add these environment variables:
```
NODE_ENV=production
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<generate-strong-secret>
REFRESH_TOKEN_SECRET=<generate-strong-secret>
OZOW_SITE_CODE=<your-ozow-site-code>
OZOW_PRIVATE_KEY=<your-ozow-private-key>
OZOW_API_KEY=<your-ozow-api-key>
OZOW_IS_TEST=true
WHATSAPP_PHONE_ID=<your-whatsapp-phone-id>
WHATSAPP_TOKEN=<your-whatsapp-token>
APP_URL=https://your-app.onrender.com
```

#### Step 5: Deploy
- Render will automatically build and deploy
- Wait for deployment to complete
- Access your app at the provided URL

---

### Option 2: Docker on VPS (Ubuntu/Debian)

#### Prerequisites
- VPS with Ubuntu 20.04+ (DigitalOcean, AWS, etc.)
- Root or sudo access
- Domain name (optional but recommended)

#### Step 1: Setup VPS
```bash
# SSH into your VPS
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Create app directory
mkdir -p /opt/chatcommerce
cd /opt/chatcommerce
```

#### Step 2: Clone Repository
```bash
git clone <your-repo-url> .
```

#### Step 3: Configure Environment
```bash
cp .env.example .env
nano .env
# Edit with your configuration
```

#### Step 4: Deploy with Docker Compose
```bash
# Start services
docker-compose up -d

# Check logs
docker-compose logs -f app

# Check status
docker-compose ps
```

#### Step 5: Setup Nginx Reverse Proxy (Optional)
```bash
# Install Nginx
apt install nginx -y

# Create Nginx config
nano /etc/nginx/sites-available/chatcommerce
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/chatcommerce /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL with Let's Encrypt
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com
```

---

### Option 3: PM2 on VPS (Without Docker)

#### Step 1: Install Node.js
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install nodejs -y

# Verify
node --version
npm --version
```

#### Step 2: Install MongoDB
```bash
# Import MongoDB public key
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Create list file
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
apt update
apt install mongodb-org -y

# Start MongoDB
systemctl start mongod
systemctl enable mongod
```

#### Step 3: Setup Application
```bash
# Create app directory
mkdir -p /opt/chatcommerce
cd /opt/chatcommerce

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env

# Build application
npm run build
```

#### Step 4: Install and Configure PM2
```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup systemd

# Monitor
pm2 monit
```

#### Step 5: Setup Nginx (same as Docker option above)

---

## 📋 Post-Deployment Checklist

### Security
- [ ] All environment variables are set
- [ ] JWT secrets are strong (32+ characters)
- [ ] MongoDB is secured (authentication enabled)
- [ ] HTTPS is enabled
- [ ] Firewall is configured (ufw on Ubuntu)
- [ ] Rate limiting is working
- [ ] Webhook signatures are verified

### Functionality
- [ ] User registration works
- [ ] Login and authentication works
- [ ] Product creation works
- [ ] Order creation works
- [ ] Payment links generate correctly
- [ ] Webhooks receive Ozow notifications
- [ ] WhatsApp messages send successfully
- [ ] PDF invoices generate
- [ ] Analytics dashboard displays data

### Monitoring
- [ ] Logs are being written
- [ ] Error tracking is set up
- [ ] Uptime monitoring configured
- [ ] Backup strategy in place
- [ ] Alert system configured

---

## 🔍 Testing Your Deployment

### API Health Check
```bash
curl https://your-domain.com/api/health
```

### Test User Registration
```bash
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123",
    "businessName": "Test Business",
    "whatsappNumber": "+27123456789"
  }'
```

### Test Login
```bash
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

---

## 🔧 Maintenance

### Update Application
```bash
# Pull latest code
git pull origin main

# Docker deployment
docker-compose down
docker-compose build
docker-compose up -d

# PM2 deployment
npm install
npm run build
pm2 restart chatcommerce-os
```

### Backup Database
```bash
# MongoDB backup
mongodump --uri="your_mongodb_uri" --out=/backup/$(date +%Y%m%d)

# Automated daily backup script
echo "0 2 * * * mongodump --uri='your_mongodb_uri' --out=/backup/\$(date +\%Y\%m\%d)" | crontab -
```

### View Logs
```bash
# Docker
docker-compose logs -f app

# PM2
pm2 logs chatcommerce-os

# Application logs
tail -f logs/combined-*.log
tail -f logs/error-*.log
```

### Monitor Performance
```bash
# Docker stats
docker stats

# PM2 monitoring
pm2 monit

# System resources
htop
```

---

## 🚨 Troubleshooting

### Application Won't Start
1. Check logs for errors
2. Verify environment variables
3. Ensure MongoDB is accessible
4. Check port availability

### MongoDB Connection Failed
1. Verify connection string
2. Check network connectivity
3. Ensure MongoDB is running
4. Verify authentication credentials

### WhatsApp Messages Not Sending
1. Verify WHATSAPP_TOKEN is correct
2. Check WHATSAPP_PHONE_ID
3. Ensure phone number format (+27...)
4. Check WhatsApp Business API status

### Webhooks Not Working
1. Verify webhook URL is accessible
2. Check signature verification
3. Ensure OZOW_PRIVATE_KEY is correct
4. Review webhook logs

---

## 📞 Support

For deployment assistance:
- GitHub Issues: [Report Issue]
- Email: support@chatcommerce.co.za
- Documentation: https://docs.chatcommerce.co.za

---

**🎉 Congratulations on deploying ChatCommerce OS!**
