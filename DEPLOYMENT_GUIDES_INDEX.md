# Phygital Deployment Guides - Complete Index

This document provides an overview of all deployment resources available for the Phygital application.

---

## 📚 Documentation Overview

### 🎯 Quick Start Guides

1. **[HOSTINGER_QUICK_START.md](HOSTINGER_QUICK_START.md)**
   - ⚡ Ultra-fast deployment in 30 minutes
   - ✅ Step-by-step commands
   - 🎯 Best for: Quick production deployment
   - **Start here if:** You want to deploy quickly

2. **[HOSTINGER_DEPLOYMENT_CHECKLIST.md](HOSTINGER_DEPLOYMENT_CHECKLIST.md)**
   - 📋 Complete checklist format
   - ✅ Checkbox for each step
   - 🎯 Best for: Systematic deployment
   - **Start here if:** You want to track progress carefully

### 📖 Detailed Guides

3. **[HOSTINGER_VPS_DEPLOYMENT.md](HOSTINGER_VPS_DEPLOYMENT.md)**
   - 📚 Comprehensive deployment guide
   - 🔍 Detailed explanations
   - 💡 Multiple options for each step
   - 🎯 Best for: Understanding the full process
   - **Use this if:** You want to understand what each step does

4. **[VPS_TROUBLESHOOTING_GUIDE.md](VPS_TROUBLESHOOTING_GUIDE.md)**
   - 🔧 Common issues and solutions
   - 🆘 Error diagnosis steps
   - 💊 Fix commands
   - 🎯 Best for: Solving deployment problems
   - **Use this if:** Something isn't working

---

## 🛠️ Deployment Scripts

### Automated Deployment

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `server-setup.sh` | Initial VPS setup | First time setup only |
| `quick-deploy-vps.sh` | Complete automated deployment | First deployment (interactive) |
| `deploy-vps.sh` | Deploy code updates | Every time you update code |
| `backup-vps.sh` | Backup database & files | Daily (auto via cron) |
| `restore-vps.sh` | Restore from backup | When needed |
| `health-check-vps.sh` | Check system health | Every 5 min (auto via cron) |
| `setup-cron-jobs.sh` | Setup automation | Once after deployment |

### Configuration Files

| File | Purpose |
|------|---------|
| `ecosystem.config.js` | PM2 process management |
| `nginx-config-template.conf` | Nginx web server config |
| `backend/production-vps.env.example` | Backend environment template |
| `frontend/production-vps.env.example` | Frontend environment template |

---

## 🚀 Recommended Deployment Path

### For First-Time Deployment

**Option A: Quick Deploy (Automated)**
```
1. Read: HOSTINGER_QUICK_START.md
2. Run: quick-deploy-vps.sh
3. Follow: On-screen prompts
4. Test: Your application
```

**Option B: Manual Deploy (Detailed)**
```
1. Read: HOSTINGER_VPS_DEPLOYMENT.md
2. Follow: HOSTINGER_DEPLOYMENT_CHECKLIST.md
3. Use: Individual scripts as needed
4. Verify: Each step
```

### For Updates After Initial Deployment

```bash
# Simple method
cd /var/www/phygital
./deploy-vps.sh

# Manual method
git pull
cd backend && npm install --production
cd ../frontend && npm install && npm run build
pm2 restart phygital-backend
sudo systemctl reload nginx
```

---

## 📋 Pre-Deployment Requirements

### What You Need

- [ ] **VPS Account**
  - Ubuntu 22.04 on Hostinger
  - Root/sudo access
  - At least 2GB RAM recommended

- [ ] **Domain**
  - Domain registered with Hostinger
  - DNS access

- [ ] **Access Information**
  - VPS IP address
  - SSH credentials
  - Email for SSL certificate

- [ ] **External Services**
  - MongoDB (local or Atlas)
  - AWS S3 or Cloudinary account
  - SMTP credentials (optional)

- [ ] **Development Environment**
  - Code tested locally
  - Environment variables prepared
  - Dependencies verified

---

## 🎯 Deployment Scenarios

### Scenario 1: Fresh VPS, First Deployment

**Follow this order:**
1. `HOSTINGER_QUICK_START.md` OR `HOSTINGER_DEPLOYMENT_CHECKLIST.md`
2. Run `server-setup.sh` (if manual) OR `quick-deploy-vps.sh` (if automated)
3. Configure DNS in Hostinger
4. Upload code
5. Configure environment files
6. Install dependencies and build
7. Generate SSL certificate
8. Run `setup-cron-jobs.sh`
9. Test everything

**Estimated time:** 1-2 hours

### Scenario 2: Code Update on Existing Deployment

**Simple approach:**
```bash
cd /var/www/phygital
./deploy-vps.sh
```

**Estimated time:** 5-10 minutes

### Scenario 3: Something Broke, Need to Fix

**Follow this order:**
1. Check `VPS_TROUBLESHOOTING_GUIDE.md`
2. Run `health-check-vps.sh` to diagnose
3. Check logs: `pm2 logs` and nginx logs
4. Apply fixes from troubleshooting guide
5. Restart services if needed

### Scenario 4: Restore from Backup

```bash
# List available backups
ls -lh /var/backups/phygital/

# Restore
./restore-vps.sh BACKUP_DATE
```

**Estimated time:** 15-30 minutes

---

## 🔄 Deployment Workflow

### Development → Staging → Production

```
Local Development
    ↓
  Git Commit
    ↓
  Git Push
    ↓
VPS (SSH)
    ↓
./deploy-vps.sh
    ↓
Testing
    ↓
✅ Live
```

### Automated Updates (Recommended)

```
Cron Job (Daily 2 AM) → Backup
Cron Job (Every 5 min) → Health Check
Cron Job (Daily 3 AM) → SSL Renewal Check
```

---

## 📊 File Structure After Deployment

```
/var/www/phygital/
├── backend/
│   ├── .env                    # Environment variables (secure)
│   ├── server.js              # Entry point
│   ├── package.json
│   └── ...
├── frontend/
│   ├── .env.production        # Build environment
│   ├── dist/                  # Built files (served by Nginx)
│   ├── package.json
│   └── ...
├── deploy-vps.sh              # Update script
├── backup-vps.sh              # Backup script
├── restore-vps.sh             # Restore script
├── health-check-vps.sh        # Health monitoring
└── ecosystem.config.js        # PM2 config

/etc/nginx/sites-available/
└── phygital                   # Nginx configuration

/var/log/phygital/
├── backup.log                 # Backup logs
├── health-check.log           # Health check logs
└── app.log                    # Application logs

/var/backups/phygital/
├── mongodb_DATE.tar.gz        # Database backups
├── app_DATE.tar.gz            # Code backups
└── config_DATE.tar.gz         # Config backups
```

---

## 🔐 Security Checklist

After deployment, ensure:

- [ ] Firewall is enabled (UFW)
- [ ] Only ports 22, 80, 443 are open
- [ ] SSL certificate is valid
- [ ] Environment files have 600 permissions
- [ ] MongoDB has authentication enabled
- [ ] SSH password auth is disabled (use keys)
- [ ] Fail2Ban is running
- [ ] Regular backups are scheduled
- [ ] Health monitoring is active

**Check security:**
```bash
sudo ufw status
sudo systemctl status fail2ban
ls -la /var/www/phygital/backend/.env
sudo certbot certificates
```

---

## 🆘 Getting Help

### Self-Help Resources

1. **Check logs first:**
   ```bash
   pm2 logs phygital-backend
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/mongodb/mongod.log
   ```

2. **Run health check:**
   ```bash
   ./health-check-vps.sh
   ```

3. **Consult troubleshooting guide:**
   - `VPS_TROUBLESHOOTING_GUIDE.md`

### Common Issues Quick Links

| Issue | Solution Guide | Section |
|-------|---------------|---------|
| SSL certificate fails | VPS_TROUBLESHOOTING_GUIDE.md | Issue 1 |
| 502 Bad Gateway | VPS_TROUBLESHOOTING_GUIDE.md | Issue 2 |
| Database connection | VPS_TROUBLESHOOTING_GUIDE.md | Issue 3 |
| Blank frontend | VPS_TROUBLESHOOTING_GUIDE.md | Issue 4 |
| Upload fails | VPS_TROUBLESHOOTING_GUIDE.md | Issue 5 |
| HTTPS issues | VPS_TROUBLESHOOTING_GUIDE.md | Issue 6 |
| AR not working | VPS_TROUBLESHOOTING_GUIDE.md | Issue 7 |

### External Support

- **Hostinger Support:** help.hostinger.com
- **Community:** Hostinger community forums
- **Stack Overflow:** Tag questions with `hostinger`, `nginx`, `nodejs`

---

## 📈 Monitoring & Maintenance

### Daily Checks

```bash
# Quick status check
pm2 status
sudo systemctl status nginx mongod
df -h  # Disk space
free -m  # Memory
```

### Weekly Tasks

```bash
# Review logs
pm2 logs phygital-backend --lines 100
sudo tail -n 100 /var/log/nginx/error.log

# Check backups
ls -lh /var/backups/phygital/

# System updates
sudo apt update && sudo apt upgrade -y
```

### Monthly Tasks

```bash
# Review health check logs
tail -n 500 /var/log/phygital/health-check.log

# Clean old logs
sudo journalctl --vacuum-time=30d
pm2 flush

# Review security
sudo fail2ban-client status
sudo ufw status
```

---

## 🎓 Learning Path

### For Beginners

1. Start with: `HOSTINGER_QUICK_START.md`
2. Use automated script: `quick-deploy-vps.sh`
3. Learn from: `HOSTINGER_VPS_DEPLOYMENT.md`
4. Practice with: Updates using `deploy-vps.sh`

### For Intermediate Users

1. Follow: `HOSTINGER_DEPLOYMENT_CHECKLIST.md`
2. Understand: Each manual step
3. Customize: Configuration files
4. Monitor: Logs and performance

### For Advanced Users

1. Read: `HOSTINGER_VPS_DEPLOYMENT.md` (all sections)
2. Customize: All scripts and configs
3. Implement: Custom monitoring and alerts
4. Optimize: Performance and security
5. Automate: CI/CD pipeline

---

## 🔄 Update History

| Date | Changes |
|------|---------|
| 2025-10-28 | Initial deployment guides created |
| | - Quick start guide |
| | - Detailed deployment guide |
| | - Troubleshooting guide |
| | - Automated scripts |
| | - Checklist |

---

## 📞 Quick Reference

### Essential Commands

```bash
# Status
pm2 status
sudo systemctl status nginx mongod

# Logs
pm2 logs phygital-backend
sudo tail -f /var/log/nginx/error.log

# Restart
pm2 restart phygital-backend
sudo systemctl reload nginx

# Deploy
cd /var/www/phygital && ./deploy-vps.sh

# Backup
./backup-vps.sh

# Health Check
./health-check-vps.sh
```

### File Locations

| File | Path |
|------|------|
| Backend code | `/var/www/phygital/backend/` |
| Frontend code | `/var/www/phygital/frontend/` |
| Backend .env | `/var/www/phygital/backend/.env` |
| Nginx config | `/etc/nginx/sites-available/phygital` |
| PM2 config | `/var/www/phygital/ecosystem.config.js` |
| App logs | `/var/log/phygital/` |
| Nginx logs | `/var/log/nginx/` |
| Backups | `/var/backups/phygital/` |

### Important URLs

- **Frontend:** https://yourdomain.com
- **API:** https://api.yourdomain.com
- **Health Check:** https://api.yourdomain.com/health
- **Admin:** https://yourdomain.com/admin
- **Hostinger Panel:** https://hpanel.hostinger.com

---

## ✅ Next Steps After Reading This

1. **Choose your deployment path:**
   - Quick: Follow `HOSTINGER_QUICK_START.md`
   - Detailed: Follow `HOSTINGER_DEPLOYMENT_CHECKLIST.md`

2. **Prepare your information:**
   - VPS IP address
   - Domain name
   - Email for SSL
   - External service credentials

3. **Start deployment:**
   - Follow chosen guide
   - Use provided scripts
   - Test thoroughly

4. **Setup automation:**
   - Run `setup-cron-jobs.sh`
   - Configure monitoring

5. **Learn maintenance:**
   - Bookmark `VPS_TROUBLESHOOTING_GUIDE.md`
   - Practice update workflow
   - Monitor logs regularly

---

**Good luck with your deployment! 🚀**

For questions or issues, refer to the troubleshooting guide or contact Hostinger support.

---

**Last Updated:** October 28, 2025  
**Version:** 1.0.0



