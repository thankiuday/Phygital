# 🚀 Complete Render Deployment Steps for Phygital

This guide provides detailed step-by-step instructions to deploy both frontend and backend on Render.

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] GitHub repository with your code pushed
- [ ] Render account (sign up at [render.com](https://render.com))
- [ ] MongoDB Atlas account (free tier available)
- [ ] AWS S3 account OR Cloudinary account (for file storage)

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Commit and Push All Changes**
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

2. **Verify Repository Structure**
   Your repository should have:
   ```
   ├── backend/
   │   ├── package.json
   │   ├── server.js
   │   └── render.yaml
   ├── frontend/
   │   ├── package.json
   │   ├── vite.config.js
   │   ├── public/
   │   │   ├── _redirects
   │   │   └── robots.txt
   │   └── render.yaml
   └── deploy-to-render.md
   ```

### Step 2: Set Up MongoDB Atlas Database

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free account
   - Create a new cluster (free tier)

2. **Configure Database**
   - Create database user with username/password
   - Set up network access (add IP address `0.0.0.0/0` for Render)
   - Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/phygital`)

3. **Note Your Connection String**
   - You'll need this for the backend environment variables

### Step 3: Set Up File Storage (Choose One)

#### Option A: AWS S3 (Recommended)

1. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Create bucket named `phygital-production` (or your preferred name)
   - Enable public read access for uploaded files

2. **Create IAM User**
   - Go to AWS Console → IAM
   - Create user with programmatic access
   - Attach policy for S3 full access
   - Save Access Key ID and Secret Access Key

3. **Configure CORS**
   Add this CORS configuration to your S3 bucket:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

#### Option B: Cloudinary (Alternative)

1. **Create Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Sign up for free account

2. **Get API Credentials**
   - Go to Dashboard
   - Note: Cloud Name, API Key, and API Secret

### Step 4: Deploy Backend Service

1. **Go to Render Dashboard**
   - Visit [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"

2. **Connect Repository**
   - Click "Connect GitHub"
   - Select your Phygital repository
   - Choose the branch (usually `main`)

3. **Configure Backend Service**
   ```
   Name: phygital-backend
   Environment: Node
   Region: Oregon (recommended)
   Branch: main
   Root Directory: backend
   Build Command: npm ci
   Start Command: npm start
   Plan: Free
   ```

4. **Set Environment Variables**
   Go to Environment tab and add these variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority
   JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
   JWT_EXPIRE=7d
   FRONTEND_URL=https://phygital-frontend.onrender.com
   
   # Choose ONE storage option:
   
   # For AWS S3:
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=phygital-production
   
   # OR for Cloudinary:
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

5. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note the backend URL: `https://phygital-backend.onrender.com`

6. **Test Backend Health**
   - Visit: `https://phygital-backend.onrender.com/api/health`
   - Should return JSON with status "success"

### Step 5: Deploy Frontend Service

1. **Create Static Site**
   - Go to Render Dashboard
   - Click "New +" → "Static Site"
   - Connect your GitHub repository

2. **Configure Frontend Service**
   ```
   Name: phygital-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm ci && npm run build
   Publish Directory: dist
   Plan: Free
   ```

3. **Set Environment Variables**
   Go to Environment tab and add:
   ```
   VITE_API_URL=https://phygital-backend.onrender.com/api
   VITE_FRONTEND_URL=https://phygital-frontend.onrender.com
   VITE_NODE_ENV=production
   ```

4. **Deploy Frontend**
   - Click "Create Static Site"
   - Wait for deployment (3-5 minutes)
   - Note the frontend URL: `https://phygital-frontend.onrender.com`

### Step 6: Update Backend Environment

1. **Update Frontend URL in Backend**
   - Go to your backend service in Render
   - Go to Environment tab
   - Update `FRONTEND_URL` to your actual frontend URL
   - Click "Save Changes"
   - Click "Manual Deploy" to redeploy

### Step 7: Test Complete Deployment

1. **Test Frontend**
   - Visit your frontend URL
   - Verify the site loads correctly
   - Check that all pages work (no 404 errors)

2. **Test Backend API**
   - Visit: `https://your-backend.onrender.com/api/health`
   - Should return detailed health information

3. **Test User Registration**
   - Go to frontend → Register
   - Create a new user account
   - Verify registration works

4. **Test File Upload**
   - Login to your account
   - Try uploading a design file
   - Try uploading a video file
   - Verify uploads work

5. **Test QR Code Generation**
   - Generate a QR code
   - Download the QR code
   - Verify QR code is created

6. **Test QR Code Scanning**
   - Use a mobile device to scan the QR code
   - Verify it opens the correct URL
   - Test the AR experience

## 🔧 Troubleshooting Common Issues

### Issue 1: CORS Errors
**Symptoms**: Browser console shows CORS errors
**Solution**: 
- Verify `FRONTEND_URL` in backend environment variables
- Ensure it matches your exact frontend URL
- Redeploy backend after changes

### Issue 2: 404 Errors on Frontend Routes
**Symptoms**: Frontend routes return 404
**Solution**:
- Verify `_redirects` file exists in `frontend/public/`
- Check that Render static site configuration is correct

### Issue 3: Database Connection Failed
**Symptoms**: Backend logs show database connection errors
**Solution**:
- Verify MongoDB URI is correct
- Check IP whitelist includes `0.0.0.0/0`
- Ensure database user has correct permissions

### Issue 4: File Upload Errors
**Symptoms**: File uploads fail
**Solution**:
- Check AWS S3 or Cloudinary credentials
- Verify bucket/cloud permissions
- Check file size limits

### Issue 5: Build Failures
**Symptoms**: Deployment fails during build
**Solution**:
- Check build logs in Render dashboard
- Verify all dependencies are in package.json
- Check for syntax errors in code

## 📊 Monitoring Your Deployment

### Health Checks
- **Backend Health**: `https://your-backend.onrender.com/api/health`
- **Frontend**: Visit your frontend URL and check for errors

### Render Dashboard
- Monitor service status
- Check logs for errors
- Monitor resource usage

### Performance Monitoring
- Check response times
- Monitor memory usage
- Watch for error rates

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Health check endpoint returns 200 status
- ✅ Frontend loads without errors
- ✅ User registration works
- ✅ File uploads work
- ✅ QR code generation works
- ✅ QR code scanning works
- ✅ All frontend routes work (no 404s)
- ✅ Mobile experience works

## 🔄 Post-Deployment Tasks

1. **Set Up Monitoring**
   - Configure alerts for downtime
   - Monitor error rates
   - Set up database monitoring

2. **Backup Strategy**
   - Set up regular database backups
   - Backup configuration files
   - Document deployment process

3. **Security Review**
   - Verify HTTPS is working
   - Check security headers
   - Review access controls

4. **Performance Optimization**
   - Monitor response times
   - Optimize database queries
   - Monitor memory usage

## 🆘 Getting Help

If you encounter issues:
1. Check Render service logs
2. Verify environment variables
3. Test API endpoints with curl/Postman
4. Check browser console for errors
5. Review the troubleshooting section above

## 📞 Support Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

## 🎉 Congratulations!

Once you complete these steps, your Phygital application will be fully deployed and accessible on the internet!

**Your URLs will be:**
- **Frontend**: `https://phygital-frontend.onrender.com`
- **Backend**: `https://phygital-backend.onrender.com`
- **Health Check**: `https://phygital-backend.onrender.com/api/health`

Remember to update the URLs in your environment variables once you have the actual Render URLs!
