# Phygital Production Deployment Guide for Render

This guide will help you deploy both the frontend and backend of Phygital to Render.

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Atlas**: Set up a MongoDB Atlas database
4. **AWS S3**: Set up S3 bucket for file storage (optional - can use Cloudinary)

## Step 1: Deploy Backend

### 1.1 Create Backend Service on Render

1. Go to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `phygital-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 1.2 Set Environment Variables

In the Render dashboard, go to Environment tab and add:

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority
JWT_SECRET=your_super_secure_jwt_secret_here
FRONTEND_URL=https://your-frontend-app.onrender.com
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-production
```

### 1.3 Deploy Backend

1. Click "Create Web Service"
2. Wait for deployment to complete
3. Note the backend URL (e.g., `https://phygital-backend.onrender.com`)

## Step 2: Deploy Frontend

### 2.1 Create Frontend Service on Render

1. Go to your Render dashboard
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `phygital-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Plan**: Free

### 2.2 Set Environment Variables

In the Render dashboard, go to Environment tab and add:

```bash
VITE_API_URL=https://phygital-backend.onrender.com/api
VITE_FRONTEND_URL=https://phygital-frontend.onrender.com
VITE_NODE_ENV=production
```

### 2.3 Deploy Frontend

1. Click "Create Static Site"
2. Wait for deployment to complete
3. Note the frontend URL (e.g., `https://phygital-frontend.onrender.com`)

## Step 3: Update Backend Environment Variables

After getting both URLs, update the backend environment variables:

1. Go to your backend service on Render
2. Update `FRONTEND_URL` to your actual frontend URL
3. Redeploy the backend

## Step 4: Test Production Deployment

### 4.1 Test Backend Health

Visit: `https://your-backend.onrender.com/api/health`

Expected response:
```json
{
  "status": "success",
  "message": "Phygital API is running!",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4.2 Test Frontend

1. Visit your frontend URL
2. Try registering a new user
3. Upload a design and video
4. Generate a QR code
5. Scan the QR code to test the AR experience

### 4.3 Test QR Code Flow

1. Generate a QR code from your dashboard
2. Scan it with a mobile device
3. Verify it opens the correct URL
4. Test the AR experience

## Step 5: Production Optimization

### 5.1 Enable HTTPS

Render automatically provides HTTPS for all services.

### 5.2 Set Up Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Go to Settings → Custom Domains
3. Add your custom domain
4. Update DNS records as instructed

### 5.3 Monitor Performance

1. Use Render's built-in monitoring
2. Set up error alerts
3. Monitor database performance

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `FRONTEND_URL` is set correctly in backend
2. **Database Connection**: Verify MongoDB URI is correct
3. **File Upload Issues**: Check AWS credentials and bucket permissions
4. **QR Code Issues**: Verify frontend URL in backend environment

### Debug Steps

1. Check Render logs for errors
2. Verify environment variables
3. Test API endpoints directly
4. Check browser console for frontend errors

## Environment Variables Reference

### Backend Required Variables

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_jwt_secret
FRONTEND_URL=https://your-frontend.onrender.com
```

### Frontend Required Variables

```bash
VITE_API_URL=https://your-backend.onrender.com/api
VITE_FRONTEND_URL=https://your-frontend.onrender.com
VITE_NODE_ENV=production
```

### Optional Variables

```bash
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-production
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

## Support

If you encounter issues:

1. Check the Render documentation
2. Review the application logs
3. Verify all environment variables are set
4. Test each component individually

Your Phygital application should now be fully deployed and production-ready on Render!
