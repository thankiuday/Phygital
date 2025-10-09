# URL Structure Testing Guide

## Quick Test Instructions

### 1. Test with Existing User (Backward Compatibility)

**Old URL (should still work):**
```
https://phygital-frontend.onrender.com/#/ar/project/1759398950678
```

**New URL with 'default' project:**
```
https://phygital-frontend.onrender.com/#/ar/user/68c7d41c925256c5878cc65e/project/default
```

**Expected Behavior:**
- Both URLs should load the same AR experience
- Should use root-level `uploadedFiles` data
- Console should show: "📦 Using root-level data for backward compatibility (project: default)"

### 2. Test API Endpoint

**New Endpoint:**
```bash
GET https://phygital-backend-wcgs.onrender.com/api/qr/user/68c7d41c925256c5878cc65e/project/default
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "68c7d41c925256c5878cc65e",
    "projectId": "default",
    "projectName": "Default Project",
    "name": "username",
    "designUrl": "https://res.cloudinary.com/...",
    "compositeDesignUrl": "https://res.cloudinary.com/...",
    "videoUrl": "https://res.cloudinary.com/...",
    ...
  }
}
```

### 3. Test QR Code Generation

**Check Generated QR URLs:**

1. **Generate QR Code via API:**
```bash
GET https://phygital-backend-wcgs.onrender.com/api/qr/generate/{userId}
```

2. **Scan the QR Code** - it should contain:
```
https://phygital-frontend.onrender.com/#/ar/user/{userId}/project/default
```

### 4. Test Upload Flow

1. **Upload a new design:**
```bash
POST https://phygital-backend-wcgs.onrender.com/api/upload/design
```

2. **Check the generated composite image QR URL** in logs:
```
🔗 Personalized URL: https://phygital-frontend.onrender.com/#/ar/user/{userId}/project/default
```

### 5. Verify Frontend Routing

**Test these routes in browser:**

```
✅ /ar/user/{userId}/project/{projectId}  (New format)
✅ /ar/{userId}                           (Legacy - should work)
✅ /ar/project/{projectId}                (Legacy - should work)
```

## Debugging

### Check Backend Logs

Look for these log messages:

```
🔍 Looking for project {projectId} belonging to user {userId}
📦 Using root-level data for backward compatibility (project: default)
```

### Check Frontend Console

Look for these debug messages:

```
[AR Debug] 🌐 API URL: https://phygital-backend-wcgs.onrender.com/api/qr/user/{userId}/project/{projectId}
[AR Debug] ✅ Project data loaded successfully
```

### Common Issues

**Issue:** "Project not found"
- **Solution:** Use `projectId='default'` for existing users
- **Check:** Ensure user has root-level `uploadedFiles`

**Issue:** "Project not complete"
- **Solution:** Ensure user has both design and video uploaded
- **Check:** Database `uploadedFiles.design.url` and `uploadedFiles.video.url`

**Issue:** Old QR codes not working
- **Solution:** Verify legacy routes are still in App.jsx
- **Check:** `/ar/:userId` and `/ar/project/:projectId` routes exist

## Testing Checklist

### Backend
- [ ] New API endpoint `/api/qr/user/:userId/project/:projectId` works
- [ ] Returns data for existing users with `projectId='default'`
- [ ] Returns 404 for non-existent users
- [ ] Returns 404 for non-existent projects
- [ ] QR code generation uses new URL format

### Frontend
- [ ] New route `/ar/user/:userId/project/:projectId` loads
- [ ] Legacy route `/ar/:userId` still works
- [ ] Legacy route `/ar/project/:projectId` still works
- [ ] `useProjectData` hook uses correct endpoint
- [ ] AR experience loads with new URL

### Integration
- [ ] Scan QR code with new format works
- [ ] AR tracking with composite image works
- [ ] Video playback works
- [ ] Analytics tracking works
- [ ] Social links work

## Next Steps

After basic testing passes:

1. **Create test user with multiple projects** (future enhancement)
2. **Test project switching** (future enhancement)
3. **Test project-specific analytics** (future enhancement)
4. **Test project management UI** (future enhancement)

## Rollback Plan

If issues occur:

1. **Revert frontend routes** in `App.jsx`
2. **Comment out new backend endpoint** in `routes/qr.js`
3. **Revert QR generation** in `routes/upload.js` and `routes/qr.js`
4. **Deploy previous version**

All changes are backward compatible, so existing functionality should not break.


