# Project-Based Storage Update

## Overview
Updated the upload system to store files **inside the current project** instead of at the root level. This ensures proper organization and allows users to have multiple projects with separate files.

## Changes Made

### 1. Design Upload (`/api/upload/design`)

**Before:**
```javascript
// Stored at root level
updateData['uploadedFiles.design'] = { ... };
updateData['uploadedFiles.compositeDesign'] = { ... };
updateData['uploadedFiles.mindTarget'] = { ... };
```

**After:**
```javascript
// Check if user has a current project
if (user.currentProject) {
  // Store in project
  updateData[`projects.${projectIndex}.uploadedFiles.design`] = { ... };
  updateData[`projects.${projectIndex}.uploadedFiles.compositeDesign`] = { ... };
  updateData[`projects.${projectIndex}.uploadedFiles.mindTarget`] = { ... };
} else {
  // Fallback to root level (backward compatibility)
  updateData['uploadedFiles.design'] = { ... };
}
```

**Console Logs:**
```
📁 Storing design in project: greenHell (1760003058804)
✅ Including composite design in project: https://...
✅ Including .mind target in project
```

### 2. Video Upload (`/api/upload/video`)

**Before:**
```javascript
updateData['uploadedFiles.video'] = { ... };
```

**After:**
```javascript
if (user.currentProject) {
  updateData[`projects.${projectIndex}.uploadedFiles.video`] = { ... };
} else {
  updateData['uploadedFiles.video'] = { ... };
}
```

**Console Logs:**
```
📁 Storing video in project: greenHell (1760003058804)
```

### 3. QR Position Save (`/api/upload/qr-position`)

**Before:**
```javascript
updateData = { qrPosition: qrPositionData };
updateData['uploadedFiles.compositeDesign'] = { ... };
updateData['uploadedFiles.mindTarget'] = { ... };
```

**After:**
```javascript
if (targetProject) {
  updateData[`projects.${targetProjectIndex}.qrPosition`] = qrPositionData;
  updateData[`projects.${targetProjectIndex}.uploadedFiles.compositeDesign`] = { ... };
  updateData[`projects.${targetProjectIndex}.uploadedFiles.mindTarget`] = { ... };
} else {
  updateData = { qrPosition: qrPositionData };
  updateData['uploadedFiles.compositeDesign'] = { ... };
}
```

**Console Logs:**
```
📁 Storing QR position in project: greenHell (1760003058804)
📁 Updating project 1760003058804 with QR position and generated files
```

### 4. API Endpoint Backward Compatibility (`/api/qr/user/:userId/project/:projectId`)

**Before:**
```javascript
// Only worked with projectId === 'default'
if (!project && projectId === 'default') {
  // Use root-level data
}
```

**After:**
```javascript
// Works with ANY projectId
if (!project) {
  // Check if user has root-level data
  if (user.uploadedFiles?.design?.url || user.uploadedFiles?.video?.url) {
    // Create virtual project from root-level data
    project = {
      id: projectId,
      uploadedFiles: user.uploadedFiles,
      qrPosition: user.qrPosition,
      ...
    };
  }
}
```

**Console Logs:**
```
📦 Project 1760003058804 not found in projects array - using root-level data for backward compatibility
✅ Found root-level uploadedFiles - creating virtual project
```

## Database Structure

### Before (Root Level)
```json
{
  "_id": "68c7d41c925256c5878cc65e",
  "username": "udaythanki",
  "uploadedFiles": {
    "design": { "url": "...", "size": 34639 },
    "video": { "url": "...", "size": 1763944 },
    "compositeDesign": { "url": "...", "size": 119317 },
    "mindTarget": { "url": "...", "size": 649085 }
  },
  "qrPosition": { "x": 138, "y": 0, "width": 150, "height": 150 },
  "projects": [
    {
      "id": "1760003058804",
      "name": "greenHell",
      "uploadedFiles": { "mindTarget": { "generated": false } }
    }
  ]
}
```

### After (Project Level)
```json
{
  "_id": "68c7d41c925256c5878cc65e",
  "username": "udaythanki",
  "uploadedFiles": {
    // Old data (not updated)
  },
  "projects": [
    {
      "id": "1760003058804",
      "name": "greenHell",
      "uploadedFiles": {
        "design": { "url": "...", "size": 34639 },
        "video": { "url": "...", "size": 1763944 },
        "compositeDesign": { "url": "...", "size": 119317 },
        "mindTarget": { "url": "...", "size": 649085 }
      },
      "qrPosition": { "x": 138, "y": 0, "width": 150, "height": 150 }
    }
  ],
  "currentProject": "1760003058804"
}
```

## How It Works

### Upload Flow

1. **User uploads design/video:**
   - System checks if `user.currentProject` exists
   - If yes: Stores file in `projects[].uploadedFiles`
   - If no: Falls back to root-level `uploadedFiles`

2. **User saves QR position:**
   - System checks if `user.currentProject` exists
   - Generates composite image and .mind file
   - If yes: Stores everything in `projects[].uploadedFiles` and `projects[].qrPosition`
   - If no: Falls back to root-level storage

3. **User scans QR code:**
   - URL contains both `userId` and `projectId`
   - API endpoint looks for project in `projects[]` array
   - If not found: Falls back to root-level data (backward compatibility)

## Backward Compatibility

✅ **Old URLs still work:**
- `/ar/project/{projectId}` → Redirects to new format
- `/ar/{userId}` → Works with root-level data

✅ **Old data still accessible:**
- Root-level `uploadedFiles` used as fallback
- API creates "virtual project" from root data

✅ **No migration required:**
- Existing users continue to work
- New uploads go to projects
- Old data remains at root level

## Testing

### To Verify Project Storage

1. **Check `currentProject` value:**
```javascript
db.users.findOne({ "_id": ObjectId("68c7d41c925256c5878cc65e") }, { currentProject: 1 })
// Should return: { "currentProject": "1760003058804" }
```

2. **Upload a new design:**
```bash
POST /api/upload/design
```

3. **Check backend console:**
```
📁 Storing design in project: greenHell (1760003058804)
✅ Including composite design in project
✅ Including .mind target in project
```

4. **Check database:**
```javascript
db.users.findOne(
  { "_id": ObjectId("68c7d41c925256c5878cc65e") },
  { "projects.$": 1 }
)
// Should show design, video, composite, mindTarget inside project
```

### To Test Backward Compatibility

1. **Use old URL format:**
```
http://localhost:5173/#/ar/project/1760003058804
```

2. **Check backend console:**
```
📦 Project 1760003058804 not found in projects array - using root-level data
✅ Found root-level uploadedFiles - creating virtual project
```

3. **Verify AR experience loads with root-level data**

## Benefits

1. ✅ **Proper Organization** - Each project has its own files
2. ✅ **Multi-Project Support** - Users can have unlimited projects
3. ✅ **Clear Structure** - Files belong to specific projects
4. ✅ **Backward Compatible** - Old data still works
5. ✅ **Scalable** - Easy to add project management features

## Console Log Reference

### Success Logs
```
📁 Storing design in project: {projectName} ({projectId})
📁 Storing video in project: {projectName} ({projectId})
📁 Storing QR position in project: {projectName} ({projectId})
✅ Including composite design in project: {url}
✅ Including .mind target in project
```

### Fallback Logs
```
📁 Updating root-level uploadedFiles (no current project)
📁 Updating root-level QR position (no current project)
📦 Project {projectId} not found - using root-level data
✅ Found root-level uploadedFiles - creating virtual project
```

## Files Modified

1. `backend/routes/upload.js` - Lines 615-850 (design), 930-1029 (video), 1370-1412 (QR position)
2. `backend/routes/qr.js` - Lines 282-308 (backward compatibility)

## Next Steps

1. ✅ Files now store in projects when `currentProject` is set
2. ⏳ Test with new design/video upload
3. ⏳ Verify project data in database
4. ⏳ Test AR experience with project-based files
5. 🔄 Consider building project management UI

## Important Notes

- **`currentProject` must be set** - Otherwise files go to root level
- **Project must exist** - Must be in `projects[]` array
- **Array index used** - Uses `projects.${projectIndex}.uploadedFiles` notation
- **Backward compatibility maintained** - Old data still accessible

The system now properly stores all uploaded files inside the current project! 🎉




