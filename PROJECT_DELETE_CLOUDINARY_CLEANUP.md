# Project Delete - Cloudinary Cleanup

## Overview
Updated the project deletion endpoint to properly delete all project-related files from Cloudinary, including design, video, composite image, and .mind files.

## Problem
When users clicked "Delete Project" from the history page, the project was removed from the database but **all files remained in Cloudinary**, wasting storage space and leaving orphaned files.

## Solution
Updated the `DELETE /api/upload/project/:projectId` endpoint to:
1. ✅ Check **project-specific files** (not root-level)
2. ✅ Delete all 4 file types with correct resource types
3. ✅ Handle double extensions (`.png.png`)
4. ✅ Provide detailed deletion logs

## Changes Made

### 1. Updated File Collection Logic

**Before:**
```javascript
// Only checked root-level files
if (user.uploadedFiles.design?.url) {
  filesToDelete.push(publicId);
}
```

**After:**
```javascript
// Check project-specific files first
if (project.uploadedFiles?.design?.url) {
  filesToDelete.push({ 
    publicId: extractCloudinaryPublicId(url),
    type: 'image',
    name: 'design'
  });
}

// Fallback to root-level if project files not found
if (filesToDelete.length === 0) {
  // Check user.uploadedFiles...
}
```

### 2. Updated Deletion Logic with Resource Types

**Before:**
```javascript
// Generic deletion without resource type
const deleteResult = await deleteFromCloudinary(publicId);
```

**After:**
```javascript
// Deletion with correct resource_type for each file
const cloudinary = require('cloudinary').v2;
const deleteResult = await cloudinary.uploader.destroy(publicId, {
  resource_type: type, // 'image', 'video', or 'raw'
  invalidate: true
});
```

### 3. Improved Public ID Extraction

**Before:**
```javascript
// Simple extension removal
publicId.split('.')[0]
```

**After:**
```javascript
// Handle double extensions and complex cases
let publicId = urlParts.slice(uploadIndex + 2).join('/');

// Remove file extension(s) - handle cases like 'file.png.png'
const parts = publicId.split('.');
if (parts.length > 1) {
  publicId = parts.slice(0, -1).join('.');
  // Remove again if still has extension
  if (publicId.endsWith('.png') || publicId.endsWith('.jpg') || publicId.endsWith('.jpeg')) {
    publicId = publicId.split('.').slice(0, -1).join('.');
  }
}
```

## Files Deleted by Type

### 1. Design Image (`image`)
```
phygital-zone/users/{userId}/design/design-xxx.png
Resource Type: image
```

### 2. Video File (`video`)
```
phygital-zone/users/{userId}/video/video-xxx.mp4
Resource Type: video
```

### 3. Composite Image (`image`)
```
phygital-zone/users/{userId}/composite-image/composite-xxx.png
Resource Type: image
```

### 4. Mind Target (`raw`)
```
phygital-zone/users/{userId}/targets/target-xxx.mind
Resource Type: raw ⚠️ Important for .mind files
```

## Console Logs

### Collection Phase
```
🗑️ Collecting files to delete from project: greenHell (1760003058804)
📄 Design file to delete: phygital-zone/users/68c7d41c/design/design-xxx
🎥 Video file to delete: phygital-zone/users/68c7d41c/video/video-xxx
🖼️ Composite design file to delete: phygital-zone/users/68c7d41c/composite-image/composite-xxx
🎯 Mind target file to delete: phygital-zone/users/68c7d41c/targets/target-xxx
```

### Deletion Phase
```
🗑️ Attempting to delete 4 files from Cloudinary
🗑️ Deleting design (image): phygital-zone/users/68c7d41c/design/design-xxx
✅ Successfully deleted design from Cloudinary: { result: 'ok' }
🗑️ Deleting video (video): phygital-zone/users/68c7d41c/video/video-xxx
✅ Successfully deleted video from Cloudinary: { result: 'ok' }
🗑️ Deleting composite (image): phygital-zone/users/68c7d41c/composite-image/composite-xxx
✅ Successfully deleted composite from Cloudinary: { result: 'ok' }
🗑️ Deleting mind-target (raw): phygital-zone/users/68c7d41c/targets/target-xxx
✅ Successfully deleted mind-target from Cloudinary: { result: 'ok' }
```

### Fallback (Root Level)
```
⚠️ No files found in project, checking root-level files...
📄 Design file to delete (root): phygital-zone/users/68c7d41c/design/design-xxx
```

## API Response

### Success Response
```json
{
  "success": true,
  "message": "Project deleted successfully",
  "data": {
    "deletedProject": {
      "id": "1760003058804",
      "name": "greenHell"
    },
    "deletedFiles": 4,
    "cloudinaryDeletion": {
      "successful": 4,
      "failed": 0,
      "details": {
        "successful": [
          { "publicId": "...", "name": "design", "type": "image" },
          { "publicId": "...", "name": "video", "type": "video" },
          { "publicId": "...", "name": "composite", "type": "image" },
          { "publicId": "...", "name": "mind-target", "type": "raw" }
        ],
        "failed": []
      }
    }
  }
}
```

### Partial Success Response
```json
{
  "success": true,
  "message": "Project deleted successfully (3/4 files deleted from Cloudinary)",
  "data": {
    "deletedProject": {
      "id": "1760003058804",
      "name": "greenHell"
    },
    "deletedFiles": 4,
    "cloudinaryDeletion": {
      "successful": 3,
      "failed": 1,
      "details": {
        "successful": [...],
        "failed": [
          { 
            "publicId": "...", 
            "name": "mind-target", 
            "type": "raw",
            "error": "File not found"
          }
        ]
      }
    }
  }
}
```

## Resource Types in Cloudinary

| File Type | Resource Type | Folder | Extension |
|-----------|---------------|--------|-----------|
| Design | `image` | `design/` | `.png`, `.jpg` |
| Video | `video` | `video/` | `.mp4`, `.mov` |
| Composite | `image` | `composite-image/` | `.png` |
| Mind Target | `raw` | `targets/` | `.mind` |

## Testing

### 1. Test Project Deletion

```bash
DELETE http://localhost:5000/api/upload/project/1760003058804
Authorization: Bearer {token}
```

### 2. Check Backend Console

Look for:
```
🗑️ Collecting files to delete from project: greenHell (1760003058804)
🗑️ Attempting to delete 4 files from Cloudinary
✅ Successfully deleted design from Cloudinary
✅ Successfully deleted video from Cloudinary
✅ Successfully deleted composite from Cloudinary
✅ Successfully deleted mind-target from Cloudinary
```

### 3. Verify Cloudinary

**Before Deletion:**
- Design: `https://res.cloudinary.com/.../design/design-xxx.png`
- Video: `https://res.cloudinary.com/.../video/video-xxx.mp4`
- Composite: `https://res.cloudinary.com/.../composite-image/composite-xxx.png`
- Mind: `https://res.cloudinary.com/.../targets/target-xxx.mind`

**After Deletion:**
- All files should return 404 Not Found
- Files should not appear in Cloudinary dashboard

### 4. Check Database

```javascript
db.users.findOne({ "_id": ObjectId("68c7d41c925256c5878cc65e") })

// Project should be removed from projects array
// currentProject should be null if it was the deleted project
```

## Error Handling

### Graceful Degradation
```javascript
// Project deletion continues even if some files fail to delete
try {
  await cloudinary.uploader.destroy(publicId, { resource_type: type });
  cloudinaryDeletionResults.successful.push({...});
} catch (error) {
  cloudinaryDeletionResults.failed.push({...});
  // Continue with next file
}
```

### Common Errors

**1. File Not Found**
```
Result: 'not found'
Action: Treated as success (file already gone)
```

**2. Invalid Public ID**
```
Error: "Invalid public_id"
Action: Logged and skipped, project still deleted
```

**3. Network Error**
```
Error: "Connection timeout"
Action: Logged and skipped, project still deleted
```

## Benefits

1. ✅ **Clean Storage** - No orphaned files in Cloudinary
2. ✅ **Cost Savings** - Reduced storage costs
3. ✅ **Proper Cleanup** - All 4 file types deleted
4. ✅ **Detailed Logging** - Easy to debug deletion issues
5. ✅ **Backward Compatible** - Handles root-level files too
6. ✅ **Error Resilient** - Project deleted even if files fail

## Important Notes

⚠️ **Resource Type Matters** - `.mind` files MUST use `resource_type: 'raw'` or deletion will fail

⚠️ **Double Extensions** - Composite images may have `.png.png` due to a bug, the improved extractor handles this

⚠️ **Project First** - Always checks project files before falling back to root-level

⚠️ **Invalidate Cache** - Uses `invalidate: true` to clear CDN cache

## Files Modified

- `backend/routes/upload.js` - Lines 2058-2188 (delete endpoint)

## Future Enhancements

- [ ] Batch delete multiple projects
- [ ] Soft delete with restore option
- [ ] Archive projects instead of deleting
- [ ] Background job for large deletions
- [ ] Delete confirmation UI
- [ ] Deletion history tracking

## Summary

The project deletion endpoint now properly cleans up all Cloudinary files:
1. Design image → `resource_type: 'image'`
2. Video file → `resource_type: 'video'`
3. Composite image → `resource_type: 'image'`
4. Mind target → `resource_type: 'raw'`

No more orphaned files! 🎉



