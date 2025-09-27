# Render Deployment Fix Guide

## Current Issues
- Syntax error in index.html (old build cached)
- 404 for sw.js and manifest.json (not included in deployed build)

## Solution: Reconfigure Render Deployment

### 1. Render Service Settings
Go to your Render dashboard and update these settings:

**Service Type:** Static Site
**Root Directory:** `frontend`
**Build Command:** `npm ci && npm run build`
**Publish Directory:** `dist`

### 2. Environment Variables
Add these environment variables in Render:
```
NODE_ENV=production
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### 3. Clear Build Cache
1. Go to Render dashboard
2. Click on your frontend service
3. Go to "Settings" tab
4. Click "Clear build cache"
5. Click "Manual Deploy" → "Deploy latest commit"

### 4. Verify Files Are Built
After deployment, check these URLs should return 200:
- `https://phygital-frontend.onrender.com/manifest.json`
- `https://phygital-frontend.onrender.com/sw.js`
- `https://phygital-frontend.onrender.com/` (should not have syntax errors)

### 5. Force Browser Cache Clear
After successful deployment:
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open in incognito/private window

## Alternative: Manual Build Test
Test locally that build includes public files:
```bash
cd frontend
npm run build
ls dist/
```
Should show: `manifest.json`, `sw.js`, `index.html`

## If Still Not Working
1. Check Render build logs for errors
2. Verify `copyPublicDir: true` in vite.config.js
3. Ensure public files are not in .gitignore
4. Try deploying with `npm run build:production` instead
