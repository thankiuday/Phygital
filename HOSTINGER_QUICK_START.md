# Hostinger VPS Quick Start Guide

Ultra-fast deployment guide for Phygital on Hostinger VPS with SSL.

---

## 🚀 Quick Deploy in 30 Minutes

### Prerequisites

- Ubuntu 22.04 VPS on Hostinger
- Domain from Hostinger
- VPS IP address
- Email for SSL

---

## Step-by-Step Quick Deploy

### 1. Connect to VPS (1 min)

```bash
ssh root@YOUR_VPS_IP
```

### 2. One-Command Setup (5 min)

Upload and run the quick deploy script:

```bash
# Download the repository or upload files
cd /tmp
# Upload quick-deploy-vps.sh to server

# Make executable and run
chmod +x quick-deploy-vps.sh
./quick-deploy-vps.sh
```

**The script will ask for:**
- Domain name
- Email for SSL
- MongoDB passwords
- Confirmation

**It will automatically:**
- ✓ Update system
- ✓ Install Node.js, Nginx, MongoDB
- ✓ Configure database
- ✓ Install PM2
- ✓ Create directories
- ✓ Generate SSL certificate

### 3. Configure DNS (5-30 min)

**In Hostinger Dashboard:**

1. Go to **Domains** → **Your Domain** → **DNS**
2. Add these records:

```
Type: A    Name: @      Value: YOUR_VPS_IP
Type: A    Name: www    Value: YOUR_VPS_IP  
Type: A    Name: api    Value: YOUR_VPS_IP
```

3. Wait for propagation (5-30 minutes)

### 4. Upload Your Code (5 min)

**From your local machine (PowerShell):**

```powershell
# Navigate to your project
cd C:\NeardsAndGeeks\Phygital

# Upload to VPS
scp -r backend frontend package.json root@YOUR_VPS_IP:/var/www/phygital/
```

### 5. Deploy Application (10 min)

**On VPS:**

```bash
cd /var/www/phygital

# Install dependencies
cd backend && npm install --production
cd ../frontend && npm install && npm run build

# Configure environment files
nano backend/.env
# Add your configuration (see template below)

nano frontend/.env.production
# Add: VITE_API_URL=https://api.yourdomain.com

# Start application
cd backend
pm2 start server.js --name phygital-backend
pm2 save

# Reload Nginx
sudo systemctl reload nginx
```

### 6. Generate SSL (3 min)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

Follow prompts:
- Enter email
- Agree to terms (Y)
- Redirect to HTTPS (2)

### 7. Verify (2 min)

```bash
# Check services
pm2 status
sudo systemctl status nginx

# Test URLs
curl https://yourdomain.com
curl https://api.yourdomain.com/health
```

**In browser:**
- https://yourdomain.com
- https://api.yourdomain.com

---

## 📋 Environment Template

### Backend .env

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
MONGODB_URI=mongodb://phygital_user:password@localhost:27017/phygital
JWT_SECRET=your-generated-secret-here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Frontend .env.production

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Phygital
```

---

## 🔧 Essential Commands

### Check Status
```bash
pm2 status                          # Backend status
sudo systemctl status nginx         # Nginx status
sudo systemctl status mongod        # MongoDB status
```

### View Logs
```bash
pm2 logs phygital-backend          # Backend logs
sudo tail -f /var/log/nginx/error.log  # Nginx errors
```

### Restart Services
```bash
pm2 restart phygital-backend       # Restart backend
sudo systemctl reload nginx        # Reload Nginx
```

### Deploy Updates
```bash
cd /var/www/phygital
git pull origin master
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart phygital-backend
```

---

## 🆘 Quick Troubleshooting

### SSL Certificate Failed
```bash
# Check DNS first
nslookup yourdomain.com

# Try again
sudo certbot --nginx -d yourdomain.com
```

### 502 Bad Gateway
```bash
# Check backend
pm2 logs phygital-backend
pm2 restart phygital-backend
```

### Site Not Loading
```bash
# Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl reload nginx
```

### Can't Connect to Database
```bash
# Check MongoDB
sudo systemctl status mongod
sudo systemctl restart mongod

# Test connection
mongosh phygital
```

---

## 📚 Full Documentation

For detailed guides, see:

- **`HOSTINGER_VPS_DEPLOYMENT.md`** - Complete deployment guide
- **`HOSTINGER_DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist
- **`VPS_TROUBLESHOOTING_GUIDE.md`** - Troubleshooting help

---

## 🎯 What You Get

✅ Node.js application running  
✅ MongoDB database  
✅ Nginx web server  
✅ SSL certificate (HTTPS)  
✅ Auto-restart with PM2  
✅ Firewall configured  
✅ Production-ready setup  

---

## 🔐 Security Reminders

- [ ] Change default passwords
- [ ] Use strong MongoDB passwords
- [ ] Set up SSH keys
- [ ] Keep system updated
- [ ] Monitor logs regularly

---

## 📊 Your Application URLs

- **Frontend:** https://yourdomain.com
- **API:** https://api.yourdomain.com/health
- **Admin:** https://yourdomain.com/admin

---

**Need help?** Check `VPS_TROUBLESHOOTING_GUIDE.md` or contact Hostinger support.

**Last Updated:** October 28, 2025


