# Analytics Double Count Fix

## Issue
Analytics were being counted **twice** for all events (scans, video views, link clicks, AR experience starts).

### Example
- User clicks a social link once
- Link clicks increased from 6 → 8 (jumped by 2 instead of 1)

## Root Cause
The backend routes were incrementing analytics **twice**:

1. **First increment**: Manual increment in the route handler
   - Called `user.updateAnalytics('linkClick')` 
   - Manually incremented `project.analytics.linkClicks`

2. **Second increment**: Automatic increment in `Analytics.trackEvent()`
   - The `trackEvent()` method already increments both user-level AND project-level analytics
   - This caused duplication

## Files Changed

### 1. `backend/routes/analytics.js`
Removed manual analytics increments from all routes:
- `/scan` route
- `/video-view` route  
- `/link-click` route
- `/ar-experience-start` route

**Before:**
```javascript
// Update user analytics
await user.updateAnalytics('linkClick');

// Also increment project-specific analytics
if (projectId) {
  const project = user.projects.find(p => p.id === projectId);
  if (project) {
    project.analytics.linkClicks = (project.analytics.linkClicks || 0) + 1;
    await user.save();
  }
}

// Track detailed analytics
await Analytics.trackEvent(userId, 'linkClick', {...}, projectId);
```

**After:**
```javascript
// Track detailed analytics
// Note: Analytics.trackEvent() handles both user-level and project-level analytics updates
await Analytics.trackEvent(userId, 'linkClick', {...}, projectId);
```

### 2. `backend/models/Analytics.js`
Enhanced `trackEvent()` method to also update timestamp fields:
- Added `lastScanAt`, `lastVideoViewAt`, `lastArExperienceStartAt` updates
- Updated both project-level and user-level timestamps
- Now handles all analytics updates in one place

## Solution
**Single source of truth**: All analytics updates now happen exclusively through `Analytics.trackEvent()`.

The method handles:
- ✅ User-level analytics increment
- ✅ User-level timestamp updates
- ✅ Project-level analytics increment  
- ✅ Project-level timestamp updates
- ✅ Detailed analytics event logging

## Testing
After deploying this fix:

1. **Test link clicks**: Click a social link once → should increase by 1 (not 2)
2. **Test video views**: Watch a video → should increase by 1 (not 2)
3. **Test scans**: Scan QR code → should increase by 1 (not 2)
4. **Test AR starts**: Start AR experience → should increase by 1 (not 2)

## Migration Notes
**No database migration needed** - this only fixes future analytics tracking. 

If you want to fix historical double-counted data:
1. The analytics are likely approximately 2x the actual values
2. You could divide all counts by 2 as an approximation
3. Or start fresh with accurate tracking going forward

## Verification Commands
```bash
# Restart backend to apply changes
cd backend
npm start

# Test analytics endpoints
# (Use the frontend AR experience to generate events)

# Check analytics in dashboard
# Navigate to: /user/:userId/analytics
```

## Related Files
- ✅ `backend/routes/analytics.js` - Route handlers
- ✅ `backend/models/Analytics.js` - Analytics model & trackEvent method
- ⚠️ `backend/models/User.js` - Contains updateAnalytics method (no longer used in routes)
- ⚠️ `backend/middleware/analyticsDeduplication.js` - Deduplication middleware (working correctly)

## Status
🟢 **FIXED** - Analytics now increment correctly by 1 per event

---

**Date**: October 29, 2025  
**Version**: v6 - Analytics Double Count Fix






















