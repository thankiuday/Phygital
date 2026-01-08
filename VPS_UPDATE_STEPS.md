# 🚀 Hostinger VPS Update Steps

Quick guide to update your Hostinger VPS with the latest changes from GitHub.

## 📋 Prerequisites

- SSH access to your Hostinger VPS
- Root or sudo access
- Git repository configured on VPS

---

## 🔧 Quick Update Steps (Recommended)

### Option 1: Using the Automated Deployment Script

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Navigate to application directory
cd /var/www/phygital/Phygital

# 3. Run the deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

The script will automatically:
- ✅ Pull latest code from GitHub
- ✅ Install backend dependencies
- ✅ Build frontend for production
- ✅ Restart backend with PM2
- ✅ Reload Nginx
- ✅ Verify deployment

---

## 📝 Manual Update Steps (Alternative)

If you prefer to update manually:

### Step 1: Connect to VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Navigate to Application Directory

```bash
cd /var/www/phygital/Phygital
```

### Step 3: Pull Latest Code from GitHub

```bash
git pull origin master
```

If you get merge conflicts:
```bash
git stash
git pull origin master
git stash pop
```

### Step 4: Update Backend

```bash
cd backend

# Install/update dependencies
npm install --production

# Restart backend with PM2
pm2 restart phygital-backend

# Check status
pm2 status
pm2 logs phygital-backend --lines 50
```

### Step 5: Update Frontend

```bash
cd ../frontend

# Install/update dependencies
npm install

# Build for production
npm run build

# Verify build was successful
ls -la dist/
```

### Step 6: Reload Nginx

```bash
sudo systemctl reload nginx

# Check Nginx status
sudo systemctl status nginx
```

### Step 7: Verify Deployment

```bash
# Check PM2 backend status
pm2 show phygital-backend

# Check if frontend build exists
ls -la frontend/dist/

# Check Nginx is running
sudo systemctl is-active nginx

# View backend logs for any errors
pm2 logs phygital-backend --lines 100
```

---

## 🐛 Troubleshooting

### If Git Pull Fails

```bash
# Check git status
git status

# If there are uncommitted changes, stash them
git stash

# Pull again
git pull origin master

# Restore stashed changes if needed
git stash pop
```

### If Backend Fails to Start

```bash
# Check PM2 logs
pm2 logs phygital-backend --lines 100

# Check for errors in logs
pm2 logs phygital-backend --err

# Restart with fresh logs
pm2 delete phygital-backend
pm2 start backend/server.js --name phygital-backend
pm2 save
```

### If Frontend Build Fails

```bash
cd frontend

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite dist

# Build again
npm run build
```

### If Nginx Fails to Reload

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx if needed
sudo systemctl restart nginx
```

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] Backend is running: `pm2 status` shows `phygital-backend` as online
- [ ] Frontend build exists: `frontend/dist/index.html` exists
- [ ] Nginx is running: `sudo systemctl status nginx` shows active
- [ ] Website loads: Visit `https://yourdomain.com` in browser
- [ ] API works: Test API endpoint `https://yourdomain.com/api/health`
- [ ] No errors in logs: Check `pm2 logs phygital-backend` for errors

---

## 🔍 Quick Status Check Commands

```bash
# Check all services status
echo "=== PM2 Status ==="
pm2 list

echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager

echo "=== Backend Logs (last 20 lines) ==="
pm2 logs phygital-backend --lines 20 --nostream

echo "=== Disk Space ==="
df -h

echo "=== Memory Usage ==="
free -h
```

---

## 🚨 Rollback Steps (If Needed)

If something goes wrong and you need to rollback:

```bash
cd /var/www/phygital/Phygital

# Check recent commits
git log --oneline -5

# Rollback to previous commit (replace COMMIT_HASH)
git reset --hard COMMIT_HASH

# Rebuild frontend
cd frontend
npm run build

# Restart backend
cd ../backend
pm2 restart phygital-backend

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📞 Support

If you encounter issues:

1. Check backend logs: `pm2 logs phygital-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check frontend build: `ls -la frontend/dist/`
4. Verify environment variables: `cat backend/.env`
5. Test API health: `curl https://yourdomain.com/api/health`

---

## ✅ Post-Deployment Checklist

- [ ] All services are running
- [ ] Website is accessible
- [ ] API endpoints are working
- [ ] Document viewer works correctly
- [ ] Video/document download buttons are removed
- [ ] Analytics tracking works (no user-facing errors)
- [ ] PDF viewer modal works with back button
- [ ] Responsive design works on mobile

---

## 🎯 Summary

**Quick Update Command:**
```bash
cd /var/www/phygital/Phygital && ./deploy-vps.sh
```

**Manual Update:**
1. `git pull origin master`
2. `cd backend && npm install --production && pm2 restart phygital-backend`
3. `cd ../frontend && npm install && npm run build`
4. `sudo systemctl reload nginx`

That's it! Your VPS should now be updated with the latest changes.

