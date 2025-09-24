# Deploy Phygital to Render - Complete Guide

This guide provides step-by-step instructions to deploy both the frontend and backend of Phygital to Render.

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Atlas**: Set up a MongoDB Atlas database (free tier available)
4. **AWS S3 or Cloudinary**: Set up file storage service

## Quick Deployment Steps

### Step 1: Deploy Backend Service

1. **Create Web Service on Render**
   - Go to Render Dashboard → "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository and branch

2. **Configure Backend Service**
   ```
   Name: phygital-backend
   Environment: Node
   Region: Oregon (recommended)
   Branch: main (or your default branch)
   Root Directory: backend
   Build Command: npm ci
   Start Command: npm start
   ```

3. **Set Environment Variables**
   Go to Environment tab and add these variables:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority
   JWT_SECRET=your_super_secure_jwt_secret_min_32_characters
   JWT_EXPIRE=7d
   FRONTEND_URL=https://phygital-frontend.onrender.com
   
   # Choose either AWS S3 OR Cloudinary (not both)
   # For AWS S3:
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=phygital-production
   
   # For Cloudinary (alternative to S3):
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```

4. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment (usually 5-10 minutes)
   - Note the backend URL: `https://phygital-backend.onrender.com`

### Step 2: Deploy Frontend Service

1. **Create Static Site on Render**
   - Go to Render Dashboard → "New +" → "Static Site"
   - Connect your GitHub repository
   - Select the repository and branch

2. **Configure Frontend Service**
   ```
   Name: phygital-frontend
   Branch: main (or your default branch)
   Root Directory: frontend
   Build Command: npm ci && npm run build
   Publish Directory: dist
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
   - Wait for deployment (usually 3-5 minutes)
   - Note the frontend URL: `https://phygital-frontend.onrender.com`

### Step 3: Update Backend Environment

After getting both URLs, update the backend environment:
1. Go to your backend service on Render
2. Update `FRONTEND_URL` to your actual frontend URL
3. Click "Manual Deploy" to redeploy

## Database Setup (MongoDB Atlas)

1. **Create MongoDB Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create free account and cluster

2. **Configure Database**
   - Create database user
   - Whitelist IP addresses (0.0.0.0/0 for Render)
   - Get connection string

3. **Update Connection String**
   - Replace `<username>` and `<password>` in MONGODB_URI
   - Use the connection string in backend environment variables

## File Storage Setup

### Option A: AWS S3 (Recommended)

1. **Create S3 Bucket**
   - Go to AWS Console → S3
   - Create bucket with public read access
   - Note bucket name and region

2. **Create IAM User**
   - Go to AWS Console → IAM
   - Create user with S3 permissions
   - Generate access keys

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

### Option B: Cloudinary (Alternative)

1. **Create Cloudinary Account**
   - Go to [cloudinary.com](https://cloudinary.com)
   - Create free account

2. **Get API Credentials**
   - Go to Dashboard
   - Note Cloud Name, API Key, and API Secret

## Testing Deployment

### 1. Test Backend Health
Visit: `https://your-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "success",
  "message": "Phygital API is running!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Test Frontend
1. Visit your frontend URL
2. Register a new user
3. Upload a design and video
4. Generate QR code
5. Test QR code scanning

### 3. Test Full Flow
1. Create a project
2. Upload files
3. Generate QR code
4. Scan QR code on mobile device
5. Verify AR experience works

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `FRONTEND_URL` is set correctly in backend
   - Check browser console for specific CORS errors

2. **Database Connection Failed**
   - Verify MongoDB URI is correct
   - Check if IP whitelist includes 0.0.0.0/0
   - Ensure database user has correct permissions

3. **File Upload Errors**
   - Check AWS/Cloudinary credentials
   - Verify bucket permissions
   - Check file size limits

4. **Build Failures**
   - Check build logs in Render dashboard
   - Verify all dependencies are in package.json
   - Check for syntax errors

### Debug Steps

1. **Check Render Logs**
   - Go to service in Render dashboard
   - Click "Logs" tab
   - Look for error messages

2. **Test API Endpoints**
   - Use Postman or curl to test backend endpoints
   - Check authentication headers
   - Verify request/response format

3. **Check Environment Variables**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure sensitive values are not exposed

## Performance Optimization

### Backend Optimizations
- Enable compression (already configured)
- Use rate limiting (already configured)
- Monitor memory usage
- Optimize database queries

### Frontend Optimizations
- Code splitting (already configured)
- Asset optimization
- CDN usage (automatic with Render)
- Service worker for caching

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to Git
   - Use Render's environment variable system
   - Rotate secrets regularly

2. **CORS Configuration**
   - Restrict origins to your domains only
   - Don't use wildcards in production

3. **Rate Limiting**
   - Monitor API usage
   - Adjust rate limits as needed
   - Implement user-specific limits

## Monitoring and Maintenance

1. **Set Up Alerts**
   - Configure Render alerts for downtime
   - Monitor error rates
   - Set up database monitoring

2. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Test updates in staging first

3. **Backup Strategy**
   - Regular database backups
   - File storage backups
   - Configuration backups

## Support

If you encounter issues:
1. Check Render documentation
2. Review application logs
3. Verify environment variables
4. Test components individually
5. Check GitHub issues for known problems

Your Phygital application should now be fully deployed and production-ready on Render!

## URLs After Deployment

- **Frontend**: https://phygital-frontend.onrender.com
- **Backend**: https://phygital-backend.onrender.com
- **API Health Check**: https://phygital-backend.onrender.com/api/health
- **API Documentation**: https://phygital-backend.onrender.com/api (if implemented)

Remember to update these URLs in your environment variables once you have the actual Render URLs!
