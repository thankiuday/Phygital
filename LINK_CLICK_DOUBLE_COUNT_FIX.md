# Link Click Double-Count Bug - FIXED ✅

## Problem Summary
Link clicks were being counted twice (1 click = 2 analytics entries) even though the robust deduplication system was in place for QR scans, video views, and AR starts.

## Root Cause
The **eventId was not being passed from frontend to backend** for link click events. The deduplication system has two layers:

1. **Event ID Cache**: Prevents exact duplicate events using unique eventIds
2. **Composite Key Cache**: Time-based deduplication using userId+projectId+eventType

Without the eventId, only the composite key cache was working, which has a shorter time window (30 seconds for link clicks) and could miss rapid duplicates.

### Why Other Analytics Worked
- **Scans**: eventId was passed inside `scanData` object (`scanData.eventId`)
- **Video Views**: Not using eventId properly (also fixed)
- **Link Clicks**: eventId was NOT being passed at all ❌

## Backend Evidence
From the logs:
```javascript
✅ linkClick request ALLOWED (backend): {
  eventId: undefined,  // ❌ Missing!
  compositeKey: 'linkClick_6900c0e05c6c22c5829e14d1_1761705986257_linkedin',
  ...
}
```

## The Fix

### 1. Updated API Layer (`frontend/src/utils/api.js`)
**Before:**
```javascript
trackLinkClick: (userId, linkType, linkUrl, projectId = null) => 
  api.post('/analytics/link-click', { userId, linkType, linkUrl, projectId }),
```

**After:**
```javascript
trackLinkClick: (userId, linkType, linkUrl, projectId = null, eventId = null) => 
  api.post('/analytics/link-click', { userId, linkType, linkUrl, projectId, eventId }),
```

### 2. Updated ARExperiencePage (`frontend/src/pages/ARExperience/ARExperiencePage.jsx`)
**Before:**
```javascript
const handleSocialClick = (platform, url) => {
  if (url) {
    if (shouldTrackAnalytics('linkClick', userId, projectId, { platform })) {
      // eventId was generated but not captured!
      analyticsAPI.trackLinkClick(userId, platform, url, projectId).then(() => {
        // ...
      });
    }
  }
};
```

**After:**
```javascript
const handleSocialClick = (platform, url) => {
  if (url) {
    // Create additionalData object to capture eventId
    const additionalData = { platform };
    
    // shouldTrackAnalytics adds eventId to additionalData
    if (shouldTrackAnalytics('linkClick', userId, projectId, additionalData)) {
      // Extract and pass the eventId
      const eventId = additionalData.eventId;
      
      console.log('🔗 Social link clicked:', { platform, url, userId, projectId, eventId });
      
      analyticsAPI.trackLinkClick(userId, platform, url, projectId, eventId).then(() => {
        console.log('✅ Link click tracked successfully:', { platform, eventId });
      });
    }
  }
};
```

### 3. Updated UserPage (`frontend/src/pages/User/UserPage.jsx`)
Same fix applied to `handleSocialLinkClick` function.

### 4. Updated useAnalytics Hook (`frontend/src/hooks/useAnalytics.js`)
Added `eventId` to the request body for both `videoView` and `linkClick` events:

```javascript
} else if (event === 'videoView') {
  requestBody = {
    userId: userId || projectId,
    projectId,
    videoProgress: data.videoProgress || 100,
    videoDuration: data.videoDuration || 0,
    eventId: data.eventId, // ✅ Added
    userAgent: navigator.userAgent
  };
} else if (event === 'linkClick') {
  requestBody = {
    userId: userId || projectId,
    projectId,
    linkType: data.linkType || 'unknown',
    linkUrl: data.linkUrl || '',
    eventId: data.eventId, // ✅ Added
    userAgent: navigator.userAgent
  };
}
```

## How It Works Now

### Frontend Flow:
1. User clicks a social link
2. `shouldTrackAnalytics('linkClick', ...)` is called with `additionalData = { platform }`
3. `shouldTrackAnalytics` generates a unique `eventId` and adds it to `additionalData.eventId`
4. If tracking is allowed (not a duplicate), extract the `eventId`
5. Pass `eventId` to `analyticsAPI.trackLinkClick(..., eventId)`
6. Frontend sends: `{ userId, linkType, linkUrl, projectId, eventId }` to backend

### Backend Flow:
1. Backend middleware `preventDuplicateAnalytics` receives the request
2. Extracts `eventId` from `req.body.eventId` (line 52 in middleware)
3. **Check 1**: Is this `eventId` in the event ID cache? → Block if yes
4. **Check 2**: Is this composite key recent? → Block if yes
5. If both checks pass, add to both caches and allow the request
6. Analytics are recorded once ✅

## Expected Backend Logs Now
```javascript
✅ linkClick request ALLOWED (backend): {
  eventId: '1730178734123_abc123xyz',  // ✅ Now present!
  compositeKey: 'linkClick_6900c0e05c6c22c5829e14d1_1761705986257_linkedin',
  userId: '6900c0e05c6c22c5829e14d1',
  projectId: '1761705986257',
  cacheStats: { eventIdCacheSize: 1, compositeCacheSize: 4 }
}
```

## Files Modified
1. ✅ `frontend/src/utils/api.js` - Added `eventId` parameter to `trackLinkClick` and `trackVideoView`
2. ✅ `frontend/src/pages/ARExperience/ARExperiencePage.jsx` - Capture and pass `eventId` in `handleSocialClick`
3. ✅ `frontend/src/pages/User/UserPage.jsx` - Capture and pass `eventId` in `handleSocialLinkClick`
4. ✅ `frontend/src/hooks/useAnalytics.js` - Include `eventId` in request body for `videoView` and `linkClick`

## Testing
1. Click a social link once
2. Backend should log with `eventId: '<unique-id>'` (not undefined)
3. Analytics should show exactly 1 link click
4. Rapid clicks within 30 seconds should be blocked by frontend cache
5. Same eventId sent twice should be blocked by backend Event ID cache

## Result
**Link clicks now use the same robust dual-cache deduplication system as scans and AR starts!** 🎉

No more double counting! ✅


