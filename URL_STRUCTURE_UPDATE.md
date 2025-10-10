# URL Structure Update - Multi-Project Support

## Overview
Updated the Phygital platform to support multiple projects per user with a new URL structure.

## Changes Made

### 1. New URL Structure
**Old Format:**
- `/ar/project/{projectId}` - Single project per platform

**New Format:**
- `/ar/user/{userId}/project/{projectId}` - Multiple projects per user

### 2. Backend Changes

#### User Schema (`backend/models/User.js`)
- **Updated `projects` array** to include project-specific data:
  - `uploadedFiles` (design, video, compositeDesign, mindTarget)
  - `qrPosition` 
  - `analytics`
  - Project metadata (name, description, status, etc.)
- **Maintains backward compatibility** with root-level `uploadedFiles` and `qrPosition`

#### QR Routes (`backend/routes/qr.js`)
- **Added new endpoint:** `GET /api/qr/user/:userId/project/:projectId`
  - Returns project-specific data
  - Includes backward compatibility for `projectId='default'`
  - Falls back to root-level data for existing users
- **Updated QR code generation** URLs to use new format:
  - `{FRONTEND_URL}/#/ar/user/{userId}/project/{projectId}`
  - Handles both current project and default fallback

#### Upload Routes (`backend/routes/upload.js`)
- **Updated all QR URL generation** to use new format
- **Supports current project context** via `user.currentProject`
- **Falls back to 'default'** project if none selected

### 3. Frontend Changes

#### App Routes (`frontend/src/App.jsx`)
- **Added new route:** `/ar/user/:userId/project/:projectId`
- **Maintained legacy routes** for backward compatibility:
  - `/ar/:userId`
  - `/ar/project/:projectId`

#### Project Data Hook (`frontend/src/hooks/useProjectData.js`)
- **Smart endpoint selection:**
  - Uses `/qr/user/{userId}/project/{projectId}` when both params available
  - Falls back to legacy endpoints for single parameter
- **Maintains backward compatibility** with existing implementations

## Migration Strategy

### Existing Users
- **No immediate migration required**
- System automatically uses root-level data when:
  - No projects array exists
  - ProjectId is 'default'
  - Project not found in projects array

### New Users
- Can create multiple projects
- Each project has its own:
  - Design and video files
  - QR position
  - Analytics tracking
  - Composite image and .mind file

## URL Examples

### Old URLs (Still Supported)
```
https://phygital-frontend.onrender.com/#/ar/project/1759398950678
```

### New URLs
```
https://phygital-frontend.onrender.com/#/ar/user/68c7d41c925256c5878cc65e/project/1759398950678
https://phygital-frontend.onrender.com/#/ar/user/68c7d41c925256c5878cc65e/project/default
```

## API Endpoints

### New Endpoint
```
GET /api/qr/user/:userId/project/:projectId
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "68c7d41c925256c5878cc65e",
    "projectId": "1759398950678",
    "projectName": "My AR Project",
    "name": "username",
    "designUrl": "...",
    "compositeDesignUrl": "...",
    "videoUrl": "...",
    "mindTargetUrl": "...",
    "socialLinks": {...},
    "qrPosition": {...},
    "projectStatus": "active"
  }
}
```

### Legacy Endpoints (Still Supported)
```
GET /api/qr/user-data/:userId
GET /api/qr/project-data/:projectId
```

## QR Code Generation

All QR codes now point to the new URL structure:
```
{FRONTEND_URL}/#/ar/user/{userId}/project/{currentProjectId || 'default'}
```

**Locations updated:**
- `backend/routes/upload.js` - All composite image generation
- `backend/routes/qr.js` - All QR code generation endpoints

## Testing Checklist

- [ ] Test new URL with existing user (should use root-level data)
- [ ] Test new URL with new user and multiple projects
- [ ] Test QR code generation with new format
- [ ] Test composite image generation with new URL
- [ ] Test .mind file generation for projects
- [ ] Verify backward compatibility with old URLs
- [ ] Test project switching functionality
- [ ] Verify analytics tracking per project

## Benefits

1. **Multi-Project Support** - Users can manage multiple AR experiences
2. **Better Organization** - Each project is self-contained
3. **Clearer URLs** - URL shows both user and project context
4. **Backward Compatible** - Existing implementations continue to work
5. **Scalable** - Easy to add project-specific features in future

## Future Enhancements

1. Project management UI
2. Project-specific analytics dashboard
3. Bulk project operations
4. Project templates
5. Project sharing/collaboration
6. Project versioning

## Notes

- **Default project** ('default') is used when no specific project is selected
- **Root-level data** is maintained for backward compatibility
- **Migration can be gradual** - no immediate data migration required
- **Old QR codes** will continue to work with legacy routes




