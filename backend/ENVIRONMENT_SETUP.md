# 🔧 Backend Environment Configuration for Render Deployment

This guide provides the complete environment configuration for deploying the Phygital backend to Render.

## 📋 Required Environment Variables

### Core Configuration
```bash
# Server Configuration
NODE_ENV=production
PORT=10000

# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRE=7d

# Frontend URL (update after frontend deployment)
FRONTEND_URL=https://phygital-frontend.onrender.com
```

### File Storage Configuration (Choose ONE)

#### Option A: AWS S3
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-production
```

#### Option B: Cloudinary
```bash
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## 🔧 How to Set Environment Variables in Render

### Step 1: Go to Your Backend Service
1. Open [Render Dashboard](https://dashboard.render.com)
2. Click on your `phygital-backend` service
3. Go to "Environment" tab

### Step 2: Add Environment Variables
Click "Add Environment Variable" for each variable:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Server port |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `your_secure_secret_32_chars_min` | JWT signing secret |
| `JWT_EXPIRE` | `7d` | JWT token expiration |
| `FRONTEND_URL` | `https://phygital-frontend.onrender.com` | Frontend URL for CORS |
| `AWS_ACCESS_KEY_ID` | `your_aws_key` | AWS access key (if using S3) |
| `AWS_SECRET_ACCESS_KEY` | `your_aws_secret` | AWS secret key (if using S3) |
| `AWS_REGION` | `us-east-1` | AWS region (if using S3) |
| `AWS_S3_BUCKET` | `phygital-production` | S3 bucket name (if using S3) |

## 🔐 Security Best Practices

### JWT Secret Generation
Generate a secure JWT secret:
```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### MongoDB Atlas Setup
1. **Create Cluster**: Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. **Create Database User**: Username/password for application
3. **Network Access**: Add IP `0.0.0.0/0` for Render
4. **Connection String**: Copy the connection string

### AWS S3 Setup
1. **Create S3 Bucket**: Go to AWS Console → S3
2. **Create IAM User**: With S3 permissions
3. **Generate Access Keys**: Save the keys securely
4. **Configure CORS**: Add CORS policy to bucket

### Cloudinary Setup
1. **Create Account**: Go to [Cloudinary](https://cloudinary.com)
2. **Get Credentials**: From dashboard
3. **Configure Upload Presets**: For your application

## 📊 Optional Environment Variables

### Monitoring and Analytics
```bash
ENABLE_ANALYTICS=true
ENABLE_ERROR_REPORTING=true
LOG_LEVEL=info
```

### Security Configuration
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
MAX_FILES_PER_REQUEST=5
```

### Performance Configuration
```bash
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_REQUEST_LOGGING=true
```

## 🧪 Testing Your Configuration

### Health Check
After setting environment variables, test your backend:
```bash
curl https://phygital-backend.onrender.com/api/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Phygital API is running!",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": {
    "status": "connected",
    "name": "phygital"
  },
  "uptime": 123.45,
  "memory": {
    "used": "45 MB",
    "total": "128 MB"
  }
}
```

### Database Connection Test
Check if MongoDB connection is working:
```bash
curl https://phygital-backend.onrender.com/api/health | jq '.database.status'
```

Should return: `"connected"`

## 🔄 Environment Variable Updates

### Updating Variables
1. Go to Render Dashboard → Your Service → Environment
2. Edit the variable value
3. Click "Save Changes"
4. Service will automatically redeploy

### Adding New Variables
1. Click "Add Environment Variable"
2. Enter variable name and value
3. Click "Save Changes"
4. Service will automatically redeploy

## 🚨 Common Issues and Solutions

### Issue 1: Database Connection Failed
**Symptoms**: Health check shows database status as "disconnected"
**Solutions**:
- Verify MongoDB URI is correct
- Check IP whitelist includes `0.0.0.0/0`
- Ensure database user has correct permissions

### Issue 2: CORS Errors
**Symptoms**: Frontend can't connect to backend
**Solutions**:
- Verify `FRONTEND_URL` matches your actual frontend URL
- Check that frontend URL is accessible
- Ensure CORS configuration in server.js

### Issue 3: File Upload Errors
**Symptoms**: File uploads fail
**Solutions**:
- Check AWS S3 or Cloudinary credentials
- Verify bucket/cloud permissions
- Check file size limits

### Issue 4: JWT Errors
**Symptoms**: Authentication fails
**Solutions**:
- Verify `JWT_SECRET` is set and secure
- Check `JWT_EXPIRE` format
- Ensure secret is at least 32 characters

## 📝 Environment Variable Checklist

Before deploying, ensure you have:

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `MONGODB_URI` (valid MongoDB Atlas connection string)
- [ ] `JWT_SECRET` (secure 32+ character string)
- [ ] `JWT_EXPIRE=7d`
- [ ] `FRONTEND_URL` (your actual frontend URL)
- [ ] File storage credentials (AWS S3 OR Cloudinary)
- [ ] All variables set in Render dashboard

## 🔒 Security Notes

1. **Never commit `.env` files** to version control
2. **Use Render's environment variables** instead of local files
3. **Rotate secrets regularly** (every 90 days)
4. **Use strong, unique secrets** for each environment
5. **Monitor access logs** for suspicious activity

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables are set correctly
3. Test database connection
4. Check file storage permissions
5. Review CORS configuration

Your backend environment is now properly configured for production deployment on Render! 🎉
