# 🚀 Render Deployment Update Instructions

This guide will help you update your existing Render deployment with the latest changes.

## ✅ What Has Been Updated

### QR Code URL Consistency
- ✅ All QR codes now use consistent hash-based routing: `/#/ar/user/{userId}/project/{projectId}`
- ✅ Fixed download endpoint to match standard URL pattern
- ✅ All QR generation uses `FRONTEND_URL` environment variable correctly

### Production Readiness
- ✅ All environment variables verified and production-ready
- ✅ `render.yaml` configured with correct production URLs
- ✅ No hardcoded localhost URLs in production code

## 📋 Step-by-Step Render Update Process

### Option 1: Automatic Deploy (Recommended)
If your Render service is connected to GitHub with auto-deploy enabled:

1. **Verify GitHub Connection**
   - Go to your Render dashboard
   - Check that your service is connected to GitHub
   - Auto-deploy should be enabled for the `master` branch

2. **Wait for Automatic Deployment**
   - Render will automatically detect the push to `master`
   - A new deployment will start automatically
   - Monitor the deployment in the Render dashboard

3. **Verify Deployment**
   - Wait for deployment to complete (usually 5-10 minutes)
   - Check deployment logs for any errors
   - Test the application to ensure everything works

### Option 2: Manual Deploy
If auto-deploy is disabled or you want to manually trigger:

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Select your backend service: `phygital-backend`

2. **Trigger Manual Deploy**
   - Click on "Manual Deploy" button
   - Select "Deploy latest commit"
   - Click "Deploy"

3. **Wait for Deployment**
   - Monitor the deployment logs
   - Wait for build to complete

4. **Repeat for Frontend** (if needed)
   - Select your frontend service: `phygital-frontend`
   - Click "Manual Deploy" → "Deploy latest commit"

## 🔍 Verify Environment Variables

Before deployment, verify these critical environment variables are set correctly:

### Backend Environment Variables

**Required Variables:**
```
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://phygital-frontend.onrender.com
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRE=7d
```

**Storage Configuration (choose one):**

**Option A: AWS S3**
```
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-production
```

**Option B: Cloudinary**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend Environment Variables

**Required Variables:**
```
VITE_API_URL=https://phygital-backend.onrender.com/api
VITE_FRONTEND_URL=https://phygital-frontend.onrender.com
VITE_NODE_ENV=production
```

## ✅ Post-Deployment Verification

### 1. Backend Health Check
```bash
curl https://phygital-backend.onrender.com/api/health
```
Expected response:
```json
{
  "status": "success",
  "message": "Server is healthy",
  "timestamp": "...",
  "database": {
    "status": "connected"
  }
}
```

### 2. Frontend Load Test
- Visit: `https://phygital-frontend.onrender.com`
- Verify the site loads correctly
- Check browser console for errors (should be none)

### 3. QR Code Generation Test
1. Login to your application
2. Navigate to QR Code page
3. Generate a new QR code
4. Download the QR code
5. Verify the QR code URL format:
   - Should be: `https://phygital-frontend.onrender.com/#/ar/user/{userId}/project/{projectId}`
   - Should NOT contain localhost or 127.0.0.1

### 4. QR Code Scan Test
1. Use a mobile device to scan the QR code
2. Verify it opens the correct AR experience page
3. Verify the AR experience loads correctly
4. Test video playback and social links

### 5. Full User Flow Test
1. ✅ User registration
2. ✅ User login
3. ✅ File upload (design + video)
4. ✅ QR code generation
5. ✅ QR code download
6. ✅ QR code scanning on mobile
7. ✅ AR experience functionality
8. ✅ Analytics tracking

## 🐛 Troubleshooting

### Issue: QR Codes Still Pointing to Wrong URL

**Solution:**
1. Verify `FRONTEND_URL` environment variable in Render backend dashboard
2. Ensure it's set to: `https://phygital-frontend.onrender.com`
3. Redeploy the backend service
4. Clear browser cache and regenerate QR codes

### Issue: CORS Errors

**Solution:**
1. Check `FRONTEND_URL` in backend environment variables
2. Ensure it matches your actual frontend URL exactly
3. No trailing slash: `https://phygital-frontend.onrender.com` (not `...com/`)
4. Redeploy backend after changes

### Issue: Deployment Fails

**Solution:**
1. Check deployment logs in Render dashboard
2. Verify all environment variables are set
3. Check for syntax errors in the logs
4. Ensure MongoDB connection string is valid
5. Verify storage service credentials (AWS S3 or Cloudinary)

### Issue: Frontend Not Loading

**Solution:**
1. Check frontend build logs
2. Verify `VITE_API_URL` points to correct backend URL
3. Verify `VITE_FRONTEND_URL` is set correctly
4. Check browser console for errors
5. Verify `_redirects` file exists in `frontend/public/`

## 📊 Monitor Deployment

### Render Dashboard
- Monitor service status in Render dashboard
- Check logs for any warnings or errors
- Monitor resource usage (memory, CPU)

### Application Monitoring
- Test critical user flows
- Monitor response times
- Check for any console errors
- Verify analytics are tracking correctly

## 🔄 Rollback Plan

If something goes wrong, you can rollback:

1. **In Render Dashboard:**
   - Go to your service
   - Click on "Deploys" tab
   - Select a previous successful deployment
   - Click "Redeploy"

2. **Or via Git:**
   ```bash
   git revert HEAD
   git push origin master
   ```

## 📝 Notes

- **Render Free Tier**: Services may sleep after 15 minutes of inactivity. First request after sleep may take 30+ seconds.
- **Environment Variables**: Changes to environment variables require a redeploy to take effect.
- **Build Time**: Backend builds typically take 5-10 minutes, frontend builds take 3-5 minutes.
- **Cache**: Clear browser cache after deployment to ensure you're seeing the latest version.

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ All health checks pass
- ✅ Frontend loads without errors
- ✅ QR codes generate correctly with production URLs
- ✅ QR codes scan and open correct AR experience
- ✅ All user flows work end-to-end
- ✅ No console errors
- ✅ Analytics tracking works

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Check browser console for frontend errors
3. Verify all environment variables are correct
4. Test API endpoints directly
5. Review the troubleshooting section above

---

**Last Updated**: After latest production-ready commit
**Commit Hash**: 6167057
**Branch**: master

