# 🧹 Production Cleanup Guide

Complete guide for cleaning all test/development data before deploying to production.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Gets Cleaned](#what-gets-cleaned)
3. [Safety Features](#safety-features)
4. [Usage](#usage)
5. [Step-by-Step Guide](#step-by-step-guide)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The `production-cleanup.js` script safely removes all test and development data from:
- **MongoDB Database** (all collections)
- **Cloudinary Storage** (all user uploads)

This ensures your production deployment starts with a clean slate.

---

## 🗑️ What Gets Cleaned

### MongoDB Database
All collections including:
- ✅ Users
- ✅ Analytics
- ✅ AR Experiences
- ✅ Upload History
- ✅ Contact Forms
- ✅ All other collections

### Cloudinary Storage
All files in `phygital-zone` folder:
- ✅ User images (designs)
- ✅ User videos
- ✅ Mind target files (.mind)
- ✅ QR codes
- ✅ All other uploads

---

## 🛡️ Safety Features

1. **Environment Check** - Warns if running in production
2. **Dry Run Mode** - Preview what will be deleted without actually deleting
3. **Multiple Confirmations** - Requires manual confirmation before deletion
4. **Detailed Logging** - Shows exactly what's being deleted
5. **Statistics** - Shows counts before deletion
6. **Error Handling** - Gracefully handles errors

---

## 🚀 Usage

### Method 1: NPM Scripts (Recommended)

```bash
# Preview what will be deleted (safe, no changes)
npm run cleanup:preview

# Delete database only
npm run cleanup:db

# Delete Cloudinary files only
npm run cleanup:cloud

# Delete everything (database + Cloudinary)
npm run cleanup:all

# Force delete without manual confirmation (DANGEROUS!)
npm run cleanup:force
```

### Method 2: Direct Script Execution

```bash
# Go to backend directory
cd backend

# Preview mode (dry run)
node scripts/production-cleanup.js --dry-run

# Delete database only
node scripts/production-cleanup.js --db-only --confirm

# Delete Cloudinary only
node scripts/production-cleanup.js --cloud-only --confirm

# Delete everything
node scripts/production-cleanup.js --confirm

# Skip manual confirmation (use with caution!)
node scripts/production-cleanup.js --confirm --skip-confirm
```

---

## 📖 Step-by-Step Guide

### Before Production Deployment

#### Step 1: Preview Cleanup
```bash
cd backend
npm run cleanup:preview
```

This shows you:
- Number of database collections
- Number of documents in each collection
- Number of Cloudinary files by type
- Total items that will be deleted

**Example Output:**
```
============================================================
DATABASE CLEANUP
============================================================

📋 Found 5 collections:

  📦 users: 12 documents
  📦 analytics: 145 documents
  📦 arexperiences: 8 documents
  📦 uploadhistories: 23 documents
  📦 contacts: 3 documents

📊 Total documents: 191

⚠️  DRY RUN MODE: No data will be deleted

============================================================
CLOUDINARY CLEANUP
============================================================

📁 image: 45 files
📁 video: 12 files
📁 raw: 23 files

📊 Total files: 80

⚠️  DRY RUN MODE: No files will be deleted
```

#### Step 2: Verify Environment Variables
Make sure your `.env` file has correct values:
```bash
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Step 3: Run Cleanup
```bash
npm run cleanup:all
```

You'll be asked to confirm:
```
⚠️  DELETE 191 documents from 5 collections? (type 'yes' to confirm): yes
⚠️  DELETE 80 files from Cloudinary? (type 'yes' to confirm): yes
```

#### Step 4: Verify Cleanup
Run preview again to confirm everything is clean:
```bash
npm run cleanup:preview
```

You should see:
```
Database is already empty!
Cloudinary is already empty!
```

#### Step 5: Deploy to Production
```bash
# Deploy your clean application
npm run deploy

# Or however you deploy your app
```

---

## 🎯 Common Scenarios

### Scenario 1: Clean Only Database (Keep Files)
**When:** You want to reset user data but keep uploaded files

```bash
npm run cleanup:db
```

### Scenario 2: Clean Only Cloudinary (Keep User Accounts)
**When:** You want to remove files but keep user accounts

```bash
npm run cleanup:cloud
```

### Scenario 3: Complete Fresh Start
**When:** Starting production with zero data

```bash
npm run cleanup:all
```

### Scenario 4: Automated Cleanup (CI/CD)
**When:** Running in automated deployment pipeline

```bash
# Be VERY careful with this!
npm run cleanup:force
```

⚠️ **WARNING:** `cleanup:force` skips all confirmations!

---

## ⚠️ Important Warnings

### ❌ DO NOT Run This Script If:
- You're already in production with real users
- You haven't backed up important data
- You're unsure about environment variables
- You want to keep any existing data

### ✅ DO Run This Script When:
- Deploying to production for the first time
- Resetting development/staging environment
- Cleaning up after testing
- Starting fresh after major changes

---

## 🔧 Troubleshooting

### Error: "Cannot connect to MongoDB"
**Solution:**
1. Check `MONGODB_URI` in `.env`
2. Verify MongoDB is running
3. Check network connectivity
4. Verify credentials

```bash
# Test MongoDB connection
mongosh "your_mongodb_uri"
```

### Error: "Cloudinary connection failed"
**Solution:**
1. Verify Cloudinary credentials in `.env`
2. Check internet connectivity
3. Confirm API key is active

```bash
# Test with the cleanup script
npm run cleanup:preview
```

### Error: "Permission denied"
**Solution:**
1. Check if you have delete permissions on MongoDB
2. Verify Cloudinary API key has delete access
3. Run as appropriate user with permissions

### Script Hangs During Confirmation
**Solution:**
1. Press `Ctrl+C` to cancel
2. Use `--skip-confirm` flag (cautiously)
3. Check if stdin is properly connected

### Partial Deletion Failure
**Solution:**
1. Check the error messages in console
2. Run script again (it will only delete remaining items)
3. Manually clean problematic items if needed

---

## 📊 What Happens During Cleanup

```
┌─────────────────────────────────────────┐
│  1. Environment Check                   │
│     ↓                                   │
│  2. Connect to MongoDB                  │
│     ↓                                   │
│  3. Count Documents                     │
│     ↓                                   │
│  4. User Confirmation                   │
│     ↓                                   │
│  5. Delete All Documents                │
│     ↓                                   │
│  6. Connect to Cloudinary               │
│     ↓                                   │
│  7. Scan Files                          │
│     ↓                                   │
│  8. User Confirmation                   │
│     ↓                                   │
│  9. Delete All Files                    │
│     ↓                                   │
│ 10. Show Summary                        │
│     ↓                                   │
│ 11. Done! ✅                            │
└─────────────────────────────────────────┘
```

---

## 🎓 Best Practices

1. **Always Preview First**
   ```bash
   npm run cleanup:preview
   ```

2. **Backup Important Data**
   ```bash
   mongodump --uri="your_mongodb_uri" --out=./backup
   ```

3. **Use Environment-Specific Variables**
   - Development: `.env.development`
   - Production: `.env.production`

4. **Test After Cleanup**
   - Create a test user
   - Upload a test file
   - Verify everything works

5. **Document What You Delete**
   - Save cleanup logs
   - Note the date and reason
   - Keep backup for at least 30 days

---

## 🚨 Emergency Recovery

If you accidentally deleted production data:

1. **Stop immediately** - Don't run any more operations
2. **Restore from backup** if available
3. **Contact MongoDB support** for point-in-time recovery
4. **Check Cloudinary trash** - files may be recoverable for 30 days
5. **Notify your team** immediately

---

## 📝 Checklist Before Production

- [ ] Reviewed what will be deleted with `--dry-run`
- [ ] Verified environment variables
- [ ] Backed up any important data
- [ ] Confirmed this is NOT production environment
- [ ] Ready to confirm deletions manually
- [ ] Have deployment plan ready
- [ ] Tested application after cleanup

---

## 💡 Tips

- **Run cleanup in staging first** to verify it works
- **Save cleanup logs** for audit purposes
- **Schedule cleanup** as part of deployment process
- **Automate with caution** - manual confirmation is safer
- **Monitor the process** - don't walk away during deletion

---

## 📞 Need Help?

- Check error messages carefully
- Review this guide
- Test with `--dry-run` first
- Check MongoDB and Cloudinary dashboards

---

## ✅ Success Indicators

You'll know cleanup was successful when:

1. Script shows: ✅ **"All cleanup operations completed successfully!"**
2. Preview mode shows: **"Database is already empty!"**
3. Preview mode shows: **"Cloudinary is already empty!"**
4. MongoDB Atlas shows 0 documents in all collections
5. Cloudinary console shows 0 files in `phygital-zone` folder

---

**🎉 Your database is now production-ready!**

Remember: This script is powerful. Use it wisely! 🛡️

