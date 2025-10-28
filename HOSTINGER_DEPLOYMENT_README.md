# 🚀 Deploy Phygital to Hostinger VPS with SSL

Complete production deployment guide for Ubuntu 22.04 VPS with automatic SSL certificates.

---

## ⚡ Quick Start (30 Minutes)

### What You Need

✅ Ubuntu 22.04 VPS on Hostinger  
✅ Domain name from Hostinger  
✅ VPS IP address  
✅ Email for SSL certificate  

### Deploy in 3 Steps

#### 1️⃣ Run Setup Script on VPS

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Upload and run quick deploy script
chmod +x quick-deploy-vps.sh
./quick-deploy-vps.sh
```

#### 2️⃣ Configure DNS in Hostinger

In Hostinger Dashboard → Domains → DNS:

```
A    @      YOUR_VPS_IP
A    www    YOUR_VPS_IP
A    api    YOUR_VPS_IP
```

Wait 5-30 minutes for DNS propagation.

#### 3️⃣ Upload Code & Deploy

```bash
# Upload your code to /var/www/phygital
# Then run:
cd /var/www/phygital
./deploy-vps.sh
```

**That's it! Your app is live at:** `https://yourdomain.com`

---

## 📚 Complete Documentation

| Document | Purpose | Best For |
|----------|---------|----------|
| **[HOSTINGER_QUICK_START.md](HOSTINGER_QUICK_START.md)** | Ultra-fast deployment | Quick setup in 30 min |
| **[HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md)** | Step-by-step checklist | Tracking progress |
| **[HOSTINGER_VPS_DEPLOYMENT.md](HOSTINGER_VPS_DEPLOYMENT.md)** | Detailed guide | Understanding everything |
| **[VPS_TROUBLESHOOTING_GUIDE.md](VPS_TROUBLESHOOTING_GUIDE.md)** | Problem solving | When issues occur |
| **[DEPLOYMENT_GUIDES_INDEX.md](DEPLOYMENT_GUIDES_INDEX.md)** | Overview of all guides | Navigation |

---

## 🛠️ Deployment Scripts

All scripts are ready to use - just upload to your VPS:

### Setup & Deployment

| Script | Purpose | Usage |
|--------|---------|-------|
| `server-setup.sh` | Initial VPS setup | `sudo ./server-setup.sh` |
| `quick-deploy-vps.sh` | Automated full deployment | `./quick-deploy-vps.sh` |
| `deploy-vps.sh` | Deploy code updates | `./deploy-vps.sh` |

### Maintenance

| Script | Purpose | Usage |
|--------|---------|-------|
| `backup-vps.sh` | Backup everything | `./backup-vps.sh` |
| `restore-vps.sh` | Restore from backup | `./restore-vps.sh DATE` |
| `health-check-vps.sh` | Check system health | `./health-check-vps.sh` |
| `setup-cron-jobs.sh` | Setup automation | `./setup-cron-jobs.sh` |

---

## 📋 What Gets Installed

✅ **Node.js 18.x** - Runtime for backend  
✅ **Nginx** - Web server & reverse proxy  
✅ **MongoDB 6.0** - Database  
✅ **PM2** - Process manager  
✅ **Certbot** - SSL certificates (Let's Encrypt)  
✅ **UFW Firewall** - Security  
✅ **Fail2Ban** - Intrusion prevention  

---

## 🔐 SSL Certificate (HTTPS)

SSL is automatically configured with Let's Encrypt:

```bash
# Automatically done by quick-deploy-vps.sh
# Or manually:
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

**Features:**
- ✅ Free SSL certificate
- ✅ Auto-renewal every 90 days
- ✅ Automatic HTTP → HTTPS redirect
- ✅ A+ SSL rating

---

## 🌐 Your Application URLs

After deployment:

| Service | URL |
|---------|-----|
| **Frontend** | https://yourdomain.com |
| **Backend API** | https://api.yourdomain.com |
| **Health Check** | https://api.yourdomain.com/health |
| **Admin Dashboard** | https://yourdomain.com/admin |

---

## 🎯 Deployment Paths

### Path 1: Automated (Recommended for Beginners)

```bash
# One command does everything
./quick-deploy-vps.sh
```

**Pros:** Fast, automated, guided  
**Time:** 30 minutes  
**Difficulty:** Easy ⭐

### Path 2: Manual (Recommended for Learning)

Follow: `HOSTINGER_DEPLOYMENT_CHECKLIST.md`

**Pros:** Understand each step, customizable  
**Time:** 1-2 hours  
**Difficulty:** Medium ⭐⭐

### Path 3: Detailed (Recommended for Advanced)

Follow: `HOSTINGER_VPS_DEPLOYMENT.md`

**Pros:** Complete understanding, full control  
**Time:** 2-3 hours  
**Difficulty:** Advanced ⭐⭐⭐

---

## 🔄 Update Workflow

After initial deployment, updating is simple:

```bash
# On VPS
cd /var/www/phygital
./deploy-vps.sh
```

**This will:**
1. Pull latest code
2. Install dependencies
3. Build frontend
4. Restart backend
5. Reload Nginx

**Time:** 5 minutes

---

## 📊 Monitoring & Automation

### Automatic Tasks (via Cron)

After running `setup-cron-jobs.sh`:

| Task | Frequency | Time |
|------|-----------|------|
| Backup database & files | Daily | 2:00 AM |
| Health check | Every 5 min | Always |
| SSL renewal check | Daily | 3:00 AM |
| Clean old logs | Weekly | Sunday 5:00 AM |

### Manual Checks

```bash
# Check everything is running
pm2 status
sudo systemctl status nginx mongod

# View logs
pm2 logs phygital-backend
sudo tail -f /var/log/nginx/error.log

# Health check
./health-check-vps.sh
```

---

## 🆘 Troubleshooting

### Common Issues

| Problem | Quick Fix |
|---------|-----------|
| SSL fails | Check DNS propagation: `nslookup yourdomain.com` |
| 502 Error | Backend not running: `pm2 restart phygital-backend` |
| Blank page | Check browser console, verify `VITE_API_URL` |
| Can't upload | Increase Nginx size: `client_max_body_size 100M;` |

**Full troubleshooting:** See `VPS_TROUBLESHOOTING_GUIDE.md`

### Get Help

```bash
# Check logs
pm2 logs phygital-backend --lines 100
sudo tail -n 100 /var/log/nginx/error.log

# Run diagnostics
./health-check-vps.sh

# Check services
sudo systemctl status nginx mongod
pm2 list
```

---

## 🔐 Security Features

### Included Security

✅ **UFW Firewall** - Only essential ports open  
✅ **Fail2Ban** - Blocks brute force attacks  
✅ **SSL/TLS** - Encrypted connections  
✅ **MongoDB Auth** - Database password protected  
✅ **Secure Headers** - XSS, clickjacking protection  
✅ **Rate Limiting** - Prevents abuse  

### Security Best Practices

```bash
# Check firewall
sudo ufw status

# Check Fail2Ban
sudo fail2ban-client status

# Check SSL
sudo certbot certificates

# Check file permissions
ls -la /var/www/phygital/backend/.env  # Should be 600
```

---

## 💾 Backup & Restore

### Create Backup

```bash
./backup-vps.sh
```

**Backs up:**
- MongoDB database
- Application files
- Configuration files
- Nginx configuration

**Location:** `/var/backups/phygital/`

### Restore Backup

```bash
# List backups
ls -lh /var/backups/phygital/

# Restore
./restore-vps.sh 20251028_120000
```

---

## 📈 Performance Optimization

### Included Optimizations

✅ **Gzip compression** - Faster page loads  
✅ **Static file caching** - CDN-like performance  
✅ **PM2 cluster mode** - Use multiple CPU cores  
✅ **Database indexing** - Faster queries  
✅ **Asset optimization** - Minified JS/CSS  

### Monitor Performance

```bash
# CPU and memory
pm2 monit

# Disk usage
df -h

# Database performance
mongosh phygital
db.stats()
```

---

## 🎓 Step-by-Step Guide

### For Complete Beginners

1. **Read:** `HOSTINGER_QUICK_START.md`
2. **Follow:** Instructions exactly
3. **Run:** `quick-deploy-vps.sh`
4. **Test:** Your application
5. **Learn:** How it works from other guides

### For Those Who Want Control

1. **Read:** `HOSTINGER_DEPLOYMENT_CHECKLIST.md`
2. **Follow:** Each step carefully
3. **Check off:** Items as you complete them
4. **Verify:** Each step works
5. **Troubleshoot:** If needed using troubleshooting guide

---

## 📞 Support Resources

### Documentation

- **Quick Start:** `HOSTINGER_QUICK_START.md`
- **Full Guide:** `HOSTINGER_VPS_DEPLOYMENT.md`
- **Checklist:** `HOSTINGER_DEPLOYMENT_CHECKLIST.md`
- **Troubleshooting:** `VPS_TROUBLESHOOTING_GUIDE.md`
- **Index:** `DEPLOYMENT_GUIDES_INDEX.md`

### External Help

- **Hostinger Support:** https://help.hostinger.com
- **Hostinger Panel:** https://hpanel.hostinger.com
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **PM2 Docs:** https://pm2.keymetrics.io/docs/
- **Nginx Docs:** https://nginx.org/en/docs/

---

## ✅ Pre-Deployment Checklist

Before you start, make sure you have:

- [ ] VPS purchased and accessible
- [ ] VPS IP address noted
- [ ] Domain name registered
- [ ] Domain DNS access
- [ ] Email address for SSL
- [ ] Code tested locally
- [ ] Database credentials prepared
- [ ] File storage credentials (AWS/Cloudinary)
- [ ] SMTP credentials (optional)

---

## 🎯 Deployment Timeline

### Expected Time for Each Approach

**Automated (Quick Deploy):**
- Setup: 10 minutes
- DNS: 5-30 minutes (waiting)
- Deploy: 10 minutes
- Testing: 5 minutes
- **Total: 30-60 minutes**

**Manual (Checklist):**
- Setup: 30 minutes
- DNS: 5-30 minutes (waiting)
- Configuration: 30 minutes
- Deploy: 15 minutes
- Testing: 15 minutes
- **Total: 1.5-2 hours**

**Detailed (Full Guide):**
- Reading: 30 minutes
- Setup: 45 minutes
- DNS: 5-30 minutes (waiting)
- Configuration: 45 minutes
- Deploy: 20 minutes
- Testing & optimization: 30 minutes
- **Total: 3-4 hours**

---

## 🌟 Features After Deployment

✅ **Production-Ready Application**
- HTTPS enabled
- Auto-restart on crash
- Process monitoring
- Error logging

✅ **Automated Maintenance**
- Daily backups
- Health monitoring
- SSL auto-renewal
- Log rotation

✅ **Security Hardened**
- Firewall configured
- Intrusion detection
- Secure headers
- Database authentication

✅ **Performance Optimized**
- Gzip compression
- Static file caching
- Database indexing
- Fast response times

---

## 🔧 Environment Configuration

### Backend Environment Variables

Create `/var/www/phygital/backend/.env`:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
MONGODB_URI=mongodb://user:pass@localhost:27017/phygital
JWT_SECRET=your-secret-here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

See `backend/production-vps.env.example` for full template.

### Frontend Environment Variables

Create `/var/www/phygital/frontend/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Phygital
```

See `frontend/production-vps.env.example` for full template.

---

## 📱 Testing Your Deployment

### Automated Tests

```bash
# Run health check
./health-check-vps.sh

# Check all services
pm2 status
sudo systemctl status nginx mongod
```

### Manual Tests

**In Browser:**
1. ✅ Visit https://yourdomain.com (should load)
2. ✅ Check HTTPS lock icon (should be secure)
3. ✅ Register new account (should work)
4. ✅ Login (should work)
5. ✅ Upload file (should work)
6. ✅ Test AR features (should work)

**Command Line:**
```bash
# Test API
curl https://api.yourdomain.com/health

# Test SSL
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

---

## 🎉 Success!

Once deployed, you'll have:

🌐 **Live Application:** https://yourdomain.com  
🔒 **Secure HTTPS:** SSL certificate active  
⚡ **Fast Performance:** Optimized and cached  
🛡️ **Protected:** Firewall and security enabled  
🔄 **Auto-Maintained:** Backups and monitoring  
📊 **Monitored:** Health checks every 5 minutes  

**Congratulations on your deployment! 🚀**

---

## 📖 Additional Resources

### Configuration Files

- `ecosystem.config.js` - PM2 configuration
- `nginx-config-template.conf` - Nginx template
- `backend/production-vps.env.example` - Backend env template
- `frontend/production-vps.env.example` - Frontend env template

### Learning Resources

- Node.js best practices
- Nginx optimization
- MongoDB performance tuning
- SSL/TLS configuration
- Linux server administration

---

## 🤝 Contributing

Found an issue or have improvements?
1. Test the fix
2. Update relevant documentation
3. Submit changes

---

## 📄 License

This deployment guide is part of the Phygital project.

---

**Need Help?** Start with `HOSTINGER_QUICK_START.md` or `VPS_TROUBLESHOOTING_GUIDE.md`

**Last Updated:** October 28, 2025  
**Version:** 1.0.0

---

**Happy Deploying! 🚀🎉**


