# Hostinger VPS Deployment Guide with SSL

## Complete Production Deployment for Ubuntu 22.04

This guide covers deploying the Phygital application on Hostinger VPS with SSL certificate using Let's Encrypt.

---

## 📋 Prerequisites

- Ubuntu 22.04 VPS on Hostinger
- Domain name from Hostinger (e.g., `yourdomain.com`)
- SSH access to VPS
- Root or sudo privileges

---

## 🔧 Part 1: Initial VPS Setup

### 1.1 Connect to VPS via SSH

```bash
ssh root@your_vps_ip
# OR if you have a non-root user:
ssh username@your_vps_ip
```

### 1.2 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Install Required Software

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install build essentials
sudo apt install -y build-essential git

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 globally (process manager)
sudo npm install -g pm2
```

---

## 🌐 Part 2: Domain & DNS Configuration

### 2.1 Configure DNS in Hostinger

1. **Login to Hostinger Dashboard**
2. **Go to Domains → Manage → DNS Records**
3. **Add/Update the following records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | `your_vps_ip` | 3600 |
| A | www | `your_vps_ip` | 3600 |
| CNAME | api | `yourdomain.com` | 3600 |

**Example:**
If your domain is `phygital.com` and VPS IP is `123.45.67.89`:
- A record: `@` → `123.45.67.89`
- A record: `www` → `123.45.67.89`
- CNAME: `api` → `phygital.com`

### 2.2 Wait for DNS Propagation

DNS changes can take 5 minutes to 24 hours. Check propagation:

```bash
# Check from your local machine
nslookup yourdomain.com
nslookup api.yourdomain.com
```

---

## 📦 Part 3: Deploy Application Code

### 3.1 Create Application Directory

```bash
sudo mkdir -p /var/www/phygital
sudo chown -R $USER:$USER /var/www/phygital
cd /var/www/phygital
```

### 3.2 Clone or Upload Your Code

**Option A: Using Git (Recommended)**

```bash
# If using GitHub/GitLab
git clone https://github.com/yourusername/phygital.git .

# Or if pushing from local
# On your local machine:
# git remote add production ssh://username@your_vps_ip/var/www/phygital
# git push production master
```

**Option B: Using SCP/SFTP**

```bash
# From your local machine (Windows PowerShell)
scp -r C:\NeardsAndGeeks\Phygital\* username@your_vps_ip:/var/www/phygital/
```

### 3.3 Install Dependencies

```bash
cd /var/www/phygital

# Install backend dependencies
cd backend
npm install --production
cd ..

# Install frontend dependencies and build
cd frontend
npm install
npm run build
cd ..
```

---

## ⚙️ Part 4: Environment Configuration

### 4.1 Backend Environment Variables

```bash
cd /var/www/phygital/backend
nano .env
```

**Add the following (replace with your actual values):**

```env
# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/phygital
# OR MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# AWS S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket-name

# Cloudinary Configuration (if using Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# CORS Origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Save and exit:** `Ctrl+X`, then `Y`, then `Enter`

### 4.2 Secure Environment File

```bash
chmod 600 /var/www/phygital/backend/.env
```

---

## 🗄️ Part 5: Database Setup

### 5.1 Install MongoDB (if hosting locally)

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

### 5.2 Secure MongoDB

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "strong_password_here",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create app database and user
use phygital
db.createUser({
  user: "phygital_user",
  pwd: "another_strong_password",
  roles: ["readWrite"]
})

exit
```

**Update MongoDB connection string in `.env`:**

```env
MONGODB_URI=mongodb://phygital_user:another_strong_password@localhost:27017/phygital
```

---

## 🌐 Part 6: Nginx Configuration

### 6.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/phygital
```

**Add the following configuration:**

```nginx
# Backend API Server
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for large file uploads
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    # Increase max body size for file uploads
    client_max_body_size 100M;
}

# Frontend Server
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/phygital/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # QR scan special routes
    location /qr-scan.html {
        try_files $uri =404;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

### 6.2 Enable Site and Test Configuration

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/phygital /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Part 7: SSL Certificate with Let's Encrypt

### 7.1 Generate SSL Certificate

```bash
# Generate SSL for both main domain and API subdomain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

**Follow the prompts:**
1. Enter your email address
2. Agree to Terms of Service
3. Choose whether to redirect HTTP to HTTPS (recommended: Yes/2)

### 7.2 Verify SSL Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Check certbot timer
sudo systemctl status certbot.timer
```

### 7.3 Verify SSL Certificate

After installation, your Nginx config will be automatically updated. Verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🚀 Part 8: Start Application with PM2

### 8.1 Start Backend Server

```bash
cd /var/www/phygital/backend

# Start with PM2
pm2 start server.js --name phygital-backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Copy and run the command that PM2 outputs
```

### 8.2 PM2 Management Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs phygital-backend

# Monitor resources
pm2 monit

# Restart application
pm2 restart phygital-backend

# Stop application
pm2 stop phygital-backend

# View detailed info
pm2 info phygital-backend
```

---

## 🔥 Part 9: Firewall Configuration

### 9.1 Configure UFW Firewall

```bash
# Enable firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

---

## ✅ Part 10: Verification & Testing

### 10.1 Check All Services

```bash
# Check Nginx
sudo systemctl status nginx

# Check MongoDB
sudo systemctl status mongod

# Check PM2
pm2 status

# Check SSL certificate
sudo certbot certificates
```

### 10.2 Test Your Endpoints

**Frontend:**
- https://yourdomain.com
- https://www.yourdomain.com

**Backend API:**
- https://api.yourdomain.com/health
- https://api.yourdomain.com/api/auth/check

### 10.3 Test from Browser

1. Visit `https://yourdomain.com` - Should load frontend
2. Check SSL certificate (lock icon in browser)
3. Test login/registration
4. Test AR features
5. Test file uploads

---

## 🔄 Part 11: Deployment Updates

### 11.1 Create Deployment Script

```bash
nano /var/www/phygital/deploy.sh
```

**Add:**

```bash
#!/bin/bash
echo "🚀 Deploying Phygital Application..."

# Navigate to project directory
cd /var/www/phygital

# Pull latest changes
echo "📥 Pulling latest code..."
git pull origin master

# Update backend
echo "🔧 Updating backend..."
cd backend
npm install --production
cd ..

# Update frontend
echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart phygital-backend

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

**Make executable:**

```bash
chmod +x /var/www/phygital/deploy.sh
```

### 11.2 Deploy Updates

```bash
cd /var/www/phygital
./deploy.sh
```

---

## 📊 Part 12: Monitoring & Logs

### 12.1 View Logs

```bash
# PM2 logs (backend)
pm2 logs phygital-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
sudo journalctl -u mongod -f
```

### 12.2 Setup Log Rotation for PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🛡️ Part 13: Security Best Practices

### 13.1 Create Non-Root User (if using root)

```bash
# Create new user
adduser phygital

# Add to sudo group
usermod -aG sudo phygital

# Switch to new user
su - phygital
```

### 13.2 Setup SSH Key Authentication

```bash
# On your local machine, generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096

# Copy public key to server
ssh-copy-id phygital@your_vps_ip
```

### 13.3 Disable Root SSH Login

```bash
sudo nano /etc/ssh/sshd_config
```

**Change:**
```
PermitRootLogin no
PasswordAuthentication no
```

**Restart SSH:**
```bash
sudo systemctl restart sshd
```

### 13.4 Install Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 🔧 Troubleshooting

### Issue: SSL Certificate Failed

```bash
# Check DNS propagation
nslookup yourdomain.com

# Check Nginx configuration
sudo nginx -t

# Check port 80 is accessible
sudo netstat -tlnp | grep :80

# Try standalone mode
sudo certbot certonly --standalone -d yourdomain.com
```

### Issue: Backend Not Starting

```bash
# Check logs
pm2 logs phygital-backend

# Check environment variables
cd /var/www/phygital/backend
cat .env

# Test manually
node server.js
```

### Issue: MongoDB Connection Failed

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if backend is running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify port 5000 is listening
sudo netstat -tlnp | grep :5000
```

---

## 📝 Quick Reference Commands

```bash
# Restart everything
pm2 restart all
sudo systemctl reload nginx
sudo systemctl restart mongod

# Update SSL certificate
sudo certbot renew

# View all logs
pm2 logs
sudo tail -f /var/log/nginx/error.log

# Deploy updates
cd /var/www/phygital && ./deploy.sh
```

---

## 🎯 Production Checklist

- [ ] VPS setup complete
- [ ] Domain DNS configured
- [ ] Node.js and dependencies installed
- [ ] Code deployed to `/var/www/phygital`
- [ ] Environment variables configured
- [ ] MongoDB installed and secured
- [ ] Nginx configured
- [ ] SSL certificate generated
- [ ] Backend running with PM2
- [ ] Frontend built and served
- [ ] Firewall configured
- [ ] All endpoints tested
- [ ] Logs monitoring setup
- [ ] Backup strategy in place

---

## 📞 Need Help?

If you encounter issues:

1. Check logs: `pm2 logs` and `/var/log/nginx/error.log`
2. Verify all services are running
3. Test DNS propagation
4. Ensure environment variables are correct
5. Check firewall rules

---

## 🎉 Your Application is Live!

- **Frontend:** https://yourdomain.com
- **API:** https://api.yourdomain.com
- **Admin:** https://yourdomain.com/admin

---

**Last Updated:** October 28, 2025



