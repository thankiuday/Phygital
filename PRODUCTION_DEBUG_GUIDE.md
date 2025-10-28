# Production Analytics Debug Guide

## Issues Identified
1. **Video views showing 0** - Requests may be failing validation or silently failing
2. **Metrics doubling** - Deduplication not working properly in production

## Changes Made

### Frontend Changes

#### 1. Enhanced Logging in `useARLogic.js`
- Added detailed logs when video starts playing
- Shows userId, projectId, and tracking decision
- Logs success/failure with full error details

#### 2. Enhanced Logging in `useAnalytics.js`
- Logs request body before sending
- Logs response status and data
- Shows full error messages from backend

#### 3. Improved Deduplication in `analyticsDeduplication.js`
- Cache now loads from sessionStorage on initialization
- Stores timestamps instead of just 'true'
- Cleanup removes expired entries from both memory and sessionStorage

### Backend Changes

#### 1. Fixed Validation in `analytics.js`
- Changed `userId` validation from `.isMongoId()` to `.isString()`
- Now accepts both MongoDB IDs and project IDs

#### 2. Enhanced Logging in `analytics.js` (video-view route)
- Logs incoming request body
- Logs validation results
- Logs user and project lookup
- Shows before/after counts for video views

#### 3. Enhanced Logging in `analyticsDeduplication.js` middleware
- Logs every request with timestamp
- Shows cache size and status
- Logs when duplicates are blocked

## How to Debug in Production

### Step 1: Deploy Changes
```bash
# Push changes to GitHub
git add .
git commit -m "Add comprehensive analytics logging for production debugging"
git push origin main

# Render will auto-deploy both frontend and backend
```

### Step 2: Test with Console Open
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Scan QR code and access AR experience
4. Play video
5. Click social links

### Step 3: Check Frontend Logs
Look for these log messages:

**Video View Tracking:**
```
🎬 Video playing, checking if should track...
📊 Tracking video view in AR experience
🌐 Sending analytics request:
📡 Analytics response:
✅ Analytics API success response:
```

**If you see errors:**
```
❌ Video view tracking failed:
Error details: { message, stack, userId, projectId }
```

### Step 4: Check Backend Logs
In Render dashboard > Your backend service > Logs

Look for:
```
📹 Video view request received:
✅ Video view validation passed:
📊 Updating user analytics for video view...
🔍 Looking for project: [projectId]
📦 Project found: [project name]
✅ Project video views updated: 0 -> 1
```

**If validation fails:**
```
❌ Video view validation failed:
```

**If duplicate detected:**
```
⚠️ DUPLICATE videoView request detected and blocked:
```

### Step 5: Check for Double Counting
Frontend deduplication logs:
```
✅ Analytics event will be tracked: scan (scan_[userId]_[projectId]_[minute])
OR
ℹ️ Analytics event already tracked: scan
```

Backend deduplication logs:
```
✅ videoView request allowed (backend):
OR
⚠️ DUPLICATE videoView request detected and blocked:
```

## Common Issues & Solutions

### Issue: Video Views = 0

**Possible Causes:**
1. Backend validation rejecting userId
   - **Solution**: Check if userId format is correct
   
2. User or Project not found in database
   - **Solution**: Verify userId and projectId match database

3. Frontend tracking not being called
   - **Solution**: Check if `trackAnalytics` function exists

4. Network request failing
   - **Solution**: Check Network tab for failed requests

### Issue: Metrics Doubling

**Possible Causes:**
1. Frontend deduplication cache not initialized
   - **Solution**: Cache now loads from sessionStorage on page load
   
2. Backend middleware not blocking duplicates
   - **Solution**: Check backend logs for duplicate detection

3. Multiple components calling same tracking
   - **Solution**: Check which component is triggering twice

## Testing Checklist

- [ ] Deploy to production
- [ ] Open browser console
- [ ] Scan QR code
- [ ] Check "📊 Tracking QR scan..." log
- [ ] Play video in AR
- [ ] Check "🎬 Video playing..." log
- [ ] Check "✅ Video view tracked" log
- [ ] Click social link
- [ ] Check "🔗 Social link clicked" log
- [ ] Verify in Render backend logs
- [ ] Check analytics page for correct counts
- [ ] Test with second scan (should be deduplicated)

## Expected Log Flow

### Successful Video View:
```
Frontend:
🎬 Video playing, checking if should track...
📊 Tracking video view in AR experience
🌐 Sending analytics request: { event: 'videoView', ... }
📡 Analytics response: { status: 200, ok: true }
✅ Analytics API success response: { status: 'success', ... }
✅ Video view tracked successfully

Backend:
✅ videoView request allowed (backend): { cacheKey: '...', userId, projectId }
📹 Video view request received: { body: {...} }
✅ Video view validation passed: { userId, projectId }
📊 Updating user analytics for video view...
✅ User analytics updated
🔍 Looking for project: [projectId]
📦 Project found: [project name]
✅ Project video views updated: 0 -> 1
```

### Deduplicated Request:
```
Frontend:
ℹ️ Analytics event already tracked: videoView (videoView_...)

Backend:
⚠️ DUPLICATE videoView request detected and blocked: { cacheKey, timeSinceCache }
```

## Contact
If issues persist after reviewing logs, provide:
1. Frontend console logs (full)
2. Backend Render logs (last 100 lines)
3. Network tab HAR file
4. Screenshot of analytics page

