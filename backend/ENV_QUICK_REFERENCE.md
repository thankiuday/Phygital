# 🚀 Render Production Environment Variables - Quick Reference

## 📋 Essential Variables for Render Dashboard

Copy these variables to your Render backend service environment:

### Core Configuration
```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/phygital?retryWrites=true&w=majority
JWT_SECRET=your_super_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRE=7d
FRONTEND_URL=https://phygital-frontend.onrender.com
```

### File Storage (Choose ONE)
```bash
# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-production

# OR Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### Security & Performance
```bash
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
ENABLE_ANALYTICS=true
LOG_LEVEL=info
```

## 🔧 How to Set in Render Dashboard

1. **Go to your backend service** in Render dashboard
2. **Click "Environment" tab**
3. **Add each variable** by clicking "Add Environment Variable"
4. **Save changes** - service will auto-redeploy

## 🔐 Generate Secure JWT Secret

```bash
# Using OpenSSL
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## ✅ Verification Checklist

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000`
- [ ] `MONGODB_URI` (valid connection string)
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `FRONTEND_URL` (your actual frontend URL)
- [ ] File storage credentials (AWS S3 OR Cloudinary)
- [ ] All variables set in Render dashboard

## 🧪 Test Your Configuration

```bash
# Health check
curl https://phygital-backend.onrender.com/api/health

# Should return:
{
  "status": "success",
  "message": "Phygital API is running!",
  "database": { "status": "connected" }
}
```

## 🆘 Common Issues

- **Database Error**: Check MongoDB URI and IP whitelist
- **CORS Error**: Verify `FRONTEND_URL` matches your frontend URL
- **Upload Error**: Check AWS/Cloudinary credentials
- **JWT Error**: Ensure `JWT_SECRET` is 32+ characters

Your backend is now ready for Render deployment! 🎉
