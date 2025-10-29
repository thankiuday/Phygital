# Hostinger VPS Deployment Checklist

Complete step-by-step checklist for deploying Phygital on Hostinger VPS with SSL.

---

## 📋 Pre-Deployment Checklist

### Domain & VPS Setup

- [ ] VPS purchased from Hostinger (Ubuntu 22.04)
- [ ] Domain purchased from Hostinger
- [ ] VPS IP address noted: `________________`
- [ ] Domain name: `________________`
- [ ] SSH access credentials available
- [ ] Root or sudo access confirmed

### Required Information

Prepare the following information before starting:

- [ ] VPS IP Address
- [ ] Domain Name
- [ ] Email for SSL certificate
- [ ] MongoDB passwords (create 2 strong passwords)
- [ ] JWT Secret (will be auto-generated if not provided)
- [ ] AWS S3 or Cloudinary credentials (for file storage)

---

## 🚀 Deployment Steps

### Phase 1: Initial VPS Setup (30-45 minutes)

#### Step 1.1: Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

- [ ] Successfully connected to VPS
- [ ] Confirmed Ubuntu 22.04 version: `lsb_release -a`

#### Step 1.2: Run Server Setup Script

```bash
# Upload server-setup.sh to VPS
# Then run:
chmod +x server-setup.sh
sudo ./server-setup.sh
```

**What this installs:**
- [ ] Node.js 18.x
- [ ] Nginx
- [ ] MongoDB 6.0
- [ ] Certbot (for SSL)
- [ ] PM2
- [ ] Fail2Ban (security)
- [ ] UFW Firewall

**Verify installation:**
```bash
node --version    # Should show v18.x.x
nginx -v          # Should show nginx version
mongod --version  # Should show MongoDB 6.0.x
pm2 --version     # Should show PM2 version
```

- [ ] All software installed successfully
- [ ] All services running

---

### Phase 2: Domain Configuration (5-30 minutes)

#### Step 2.1: Configure DNS in Hostinger

1. **Login to Hostinger Dashboard**
2. **Navigate to:** Domains → Your Domain → DNS/Nameservers
3. **Add DNS Records:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_VPS_IP | 3600 |
| A | www | YOUR_VPS_IP | 3600 |
| A | api | YOUR_VPS_IP | 3600 |

**Example:**
```
A    @      123.45.67.89    3600
A    www    123.45.67.89    3600
A    api    123.45.67.89    3600
```

- [ ] DNS records created
- [ ] Saved configuration

#### Step 2.2: Verify DNS Propagation

```bash
# Wait 5-30 minutes, then check:
nslookup yourdomain.com
nslookup www.yourdomain.com
nslookup api.yourdomain.com
```

- [ ] Domain resolves to correct IP
- [ ] All subdomains resolve correctly

---

### Phase 3: Upload Application Code (10-15 minutes)

#### Step 3.1: Prepare Local Code

On your **local Windows machine** (PowerShell):

```powershell
# Navigate to project
cd C:\NeardsAndGeeks\Phygital

# Make sure code is committed
git status

# Option 1: Using SCP
scp -r * root@YOUR_VPS_IP:/var/www/phygital/

# Option 2: Using Git
git push production master
```

- [ ] Code uploaded to VPS
- [ ] Files exist in `/var/www/phygital/`

#### Step 3.2: Verify Code on VPS

```bash
# On VPS
ls -la /var/www/phygital/
ls -la /var/www/phygital/backend/
ls -la /var/www/phygital/frontend/
```

- [ ] Backend directory exists
- [ ] Frontend directory exists
- [ ] package.json files present

---

### Phase 4: Database Configuration (10 minutes)

#### Step 4.1: Create MongoDB Users

```bash
mongosh

# In MongoDB shell:
use admin
db.createUser({
  user: "admin",
  pwd: "YOUR_STRONG_PASSWORD_1",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

use phygital
db.createUser({
  user: "phygital_user",
  pwd: "YOUR_STRONG_PASSWORD_2",
  roles: ["readWrite"]
})

exit
```

- [ ] Admin user created
- [ ] App user created
- [ ] Passwords saved securely

---

### Phase 5: Environment Configuration (15 minutes)

#### Step 5.1: Backend Environment

```bash
cd /var/www/phygital/backend
nano .env
```

**Copy from `production-vps.env.example` and fill in:**

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com

MONGODB_URI=mongodb://phygital_user:PASSWORD@localhost:27017/phygital

JWT_SECRET=YOUR_GENERATED_SECRET

# Add your AWS or Cloudinary credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_BUCKET_NAME=your-bucket

CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com
```

- [ ] Backend .env created
- [ ] All required variables filled
- [ ] File secured: `chmod 600 .env`

#### Step 5.2: Frontend Environment

```bash
cd /var/www/phygital/frontend
nano .env.production
```

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Phygital
VITE_APP_URL=https://yourdomain.com
```

- [ ] Frontend .env.production created
- [ ] API URL points to correct domain

---

### Phase 6: Install Dependencies (10-15 minutes)

#### Step 6.1: Backend Dependencies

```bash
cd /var/www/phygital/backend
npm install --production
```

- [ ] Backend dependencies installed
- [ ] No errors in installation

#### Step 6.2: Frontend Build

```bash
cd /var/www/phygital/frontend
npm install
npm run build
```

- [ ] Frontend dependencies installed
- [ ] Build completed successfully
- [ ] `dist/` folder created
- [ ] `dist/index.html` exists

---

### Phase 7: Nginx Configuration (10 minutes)

#### Step 7.1: Create Nginx Config

```bash
sudo cp /var/www/phygital/nginx-config-template.conf /etc/nginx/sites-available/phygital

# Edit with your domain
sudo nano /etc/nginx/sites-available/phygital
```

**Replace ALL instances of `yourdomain.com` with your actual domain**

- [ ] Configuration file created
- [ ] Domain names replaced
- [ ] Paths verified

#### Step 7.2: Enable Site

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/phygital /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

- [ ] Symlink created
- [ ] Configuration test passed
- [ ] Nginx reloaded successfully

---

### Phase 8: Start Backend (5 minutes)

#### Step 8.1: Start with PM2

```bash
cd /var/www/phygital/backend
pm2 start server.js --name phygital-backend

# Save process list
pm2 save

# Setup auto-start on boot
pm2 startup systemd
# Copy and run the command PM2 outputs
```

- [ ] Backend started
- [ ] PM2 process running
- [ ] Auto-start configured

#### Step 8.2: Verify Backend

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs phygital-backend --lines 50

# Test endpoint
curl http://localhost:5000/health
```

- [ ] Backend is running
- [ ] No errors in logs
- [ ] Health endpoint responds

---

### Phase 9: SSL Certificate (10 minutes)

#### Step 9.1: Generate Certificate

```bash
# Make sure DNS is propagated first!
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

**Follow prompts:**
1. Enter email address
2. Agree to Terms of Service (Y)
3. Redirect HTTP to HTTPS? (2 for Yes)

- [ ] Certificate generated successfully
- [ ] Nginx configuration updated automatically
- [ ] All domains covered

#### Step 9.2: Verify SSL

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Check certificates
sudo certbot certificates

# Reload Nginx
sudo systemctl reload nginx
```

- [ ] Auto-renewal test passed
- [ ] Certificates listed correctly

---

### Phase 10: Final Testing (15 minutes)

#### Step 10.1: Test All Services

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status
```

- [ ] Nginx: active (running)
- [ ] MongoDB: active (running)
- [ ] Backend: online

#### Step 10.2: Test URLs

**In browser, test:**

1. **Frontend:**
   - [ ] https://yourdomain.com loads
   - [ ] https://www.yourdomain.com loads
   - [ ] HTTPS lock icon shows (secure)

2. **Backend API:**
   - [ ] https://api.yourdomain.com/health returns OK
   - [ ] https://api.yourdomain.com/api/auth/check works

3. **Functionality:**
   - [ ] Register new user works
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] File upload works
   - [ ] AR features work

---

### Phase 11: Setup Automation (10 minutes)

#### Step 11.1: Make Scripts Executable

```bash
cd /var/www/phygital
chmod +x *.sh
```

- [ ] All scripts executable

#### Step 11.2: Setup Cron Jobs

```bash
./setup-cron-jobs.sh
```

**This sets up:**
- [ ] Daily backups at 2 AM
- [ ] Health checks every 5 minutes
- [ ] SSL renewal checks daily
- [ ] Log rotation weekly

#### Step 11.3: Test Scripts Manually

```bash
# Test backup
./backup-vps.sh

# Test health check
./health-check-vps.sh

# Test deployment
./deploy-vps.sh
```

- [ ] Backup script works
- [ ] Health check works
- [ ] Deployment script works

---

## ✅ Post-Deployment Verification

### Security Checklist

- [ ] Firewall enabled (`sudo ufw status`)
- [ ] Only necessary ports open (22, 80, 443)
- [ ] SSH key authentication configured
- [ ] Password authentication disabled (recommended)
- [ ] Fail2Ban running
- [ ] SSL certificate valid
- [ ] Environment files secured (600 permissions)
- [ ] MongoDB authentication enabled

### Performance Checklist

- [ ] Gzip compression enabled in Nginx
- [ ] Static files cached
- [ ] PM2 auto-restart configured
- [ ] Database indexes created

### Monitoring Checklist

- [ ] PM2 monitoring working
- [ ] Logs accessible
- [ ] Health check running
- [ ] Backups scheduled
- [ ] SSL auto-renewal working

---

## 📊 Useful Commands

### Check Status

```bash
# All services
sudo systemctl status nginx mongod
pm2 status

# Logs
pm2 logs phygital-backend
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
pm2 restart phygital-backend
sudo systemctl reload nginx
sudo systemctl restart mongod
```

### Deploy Updates

```bash
cd /var/www/phygital
./deploy-vps.sh
```

### Backup & Restore

```bash
# Create backup
./backup-vps.sh

# Restore backup
./restore-vps.sh BACKUP_DATE
```

---

## 🆘 Troubleshooting

If you encounter issues, see:
- `VPS_TROUBLESHOOTING_GUIDE.md` - Detailed troubleshooting
- `HOSTINGER_VPS_DEPLOYMENT.md` - Full deployment guide

**Common issues:**
- SSL fails → Check DNS propagation
- 502 error → Backend not running, check `pm2 logs`
- Blank page → Check browser console, verify API URL
- Upload fails → Check Nginx `client_max_body_size`

---

## 📞 Support

**Hostinger Support:**
- Dashboard: hpanel.hostinger.com
- Support: help.hostinger.com
- Email: support@hostinger.com

**VPS Access:**
- IP: `________________`
- SSH: `ssh root@YOUR_VPS_IP`

---

## 🎉 Deployment Complete!

Your Phygital application is now live at:

- **Frontend:** https://yourdomain.com
- **API:** https://api.yourdomain.com
- **Admin:** https://yourdomain.com/admin

**Next steps:**
1. Test all features thoroughly
2. Set up monitoring alerts
3. Configure backup storage (S3/other)
4. Set up custom domain email (optional)
5. Configure analytics (optional)

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Version:** _______________

---

**Last Updated:** October 28, 2025



