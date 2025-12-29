# 🚀 VPS Deployment Steps - Latest Update

## ✅ Code Status
- **GitHub:** ✅ Pushed successfully
- **Commit:** `d8d23bb` - Fix: Remove root-level data fallback in FinalDesignLevel
- **Files Changed:** 
  - `frontend/src/components/Upload/LevelBasedUpload.jsx`
  - `frontend/src/components/Upload/Levels/FinalDesignLevel.jsx`

---

## 📋 Quick Deployment Steps

### Step 1: SSH into Your VPS

```bash
ssh username@your_vps_ip
# OR
ssh root@your_vps_ip
```

### Step 2: Navigate to Application Directory

```bash
cd /var/www/phygital
```

### Step 3: Pull Latest Code from GitHub

```bash
# Pull latest changes
git pull origin master

# Verify the changes
git log --oneline -1
# Should show: d8d23bb Fix: Remove root-level data fallback...
```

### Step 4: Update Backend Dependencies (if needed)

```bash
cd backend
npm install --production
cd ..
```

### Step 5: Rebuild Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 6: Restart Backend Application

```bash
# Restart PM2 process
pm2 restart phygital-backend

# Check status
pm2 status

# View logs to ensure no errors
pm2 logs phygital-backend --lines 50
```

### Step 7: Reload Nginx (if needed)

```bash
sudo systemctl reload nginx
```

### Step 8: Verify Deployment

1. **Check Backend Health:**
   ```bash
   curl https://api.yourdomain.com/api/health
   ```

2. **Test Frontend:**
   - Visit: `https://yourdomain.com`
   - Test "Generate Preview" button
   - Test "Download Final Design" button
   - Check browser console for logs showing `levelData` usage

---

## 🔄 Alternative: Using Deployment Script

If you have a deployment script:

```bash
cd /var/www/phygital
./deploy.sh
```

Or create/update the script:

```bash
#!/bin/bash
echo "🚀 Deploying Phygital Application..."

cd /var/www/phygital

echo "📥 Pulling latest code..."
git pull origin master

echo "🔧 Updating backend..."
cd backend
npm install --production
cd ..

echo "🎨 Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "🔄 Restarting backend..."
pm2 restart phygital-backend

echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
```

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Frontend loads correctly
- [ ] "Generate Preview" uses project-specific data (check console logs)
- [ ] "Download Final Design" uses project-specific data (check console logs)
- [ ] No fallback to root-level user data
- [ ] QR codes generated with correct project ID
- [ ] All previous functionality still works

---

## 📊 Monitor Logs

```bash
# Backend logs
pm2 logs phygital-backend --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check for any errors
pm2 logs phygital-backend | grep -i error
```

---

## 🔍 Verify the Fix

In browser console, when clicking "Generate Preview" or "Download Final Design", you should see:

```
🎯 Generate Preview - Using levelData: {
  hasDesign: true,
  designUrl: "https://res.cloudinary.com/...",
  hasQrPosition: true,
  qrPosition: { x: 100, y: 100, width: 275, height: 321 },
  projectId: "your-project-id"
}
```

**NOT** seeing fallback messages or root-level data.

---

## 🆘 Troubleshooting

### Issue: Git pull fails
```bash
# Check git status
git status

# If there are local changes, stash them
git stash
git pull origin master
```

### Issue: Frontend build fails
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue: Backend won't restart
```bash
# Check logs
pm2 logs phygital-backend

# Stop and start fresh
pm2 stop phygital-backend
pm2 start /var/www/phygital/backend/server.js --name phygital-backend
pm2 save
```

### Issue: Changes not reflecting
```bash
# Hard refresh browser (Ctrl+Shift+R)
# Clear browser cache
# Check if frontend was rebuilt correctly
ls -la /var/www/phygital/frontend/dist/
```

---

## 📝 Quick Reference

```bash
# Full deployment in one go
cd /var/www/phygital && \
git pull origin master && \
cd backend && npm install --production && cd .. && \
cd frontend && npm install && npm run build && cd .. && \
pm2 restart phygital-backend && \
sudo systemctl reload nginx && \
echo "✅ Deployment complete!"
```

---

## 🎯 What Changed?

This update fixes an issue where "Generate Preview" and "Download Final Design" buttons were potentially using root-level user data instead of project-specific `levelData`. 

**Before:** Fallback to `user?.uploadedFiles?.design?.url` or `user?.qrPosition`  
**After:** Only uses `levelData.design.url` and `levelData.qrPosition` (project-specific)

This ensures that each project uses its own data, preventing cross-project data contamination.

---

**Last Updated:** January 2025  
**Commit:** `d8d23bb`


