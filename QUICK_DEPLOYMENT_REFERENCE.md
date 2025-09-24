# 🚀 Quick Deployment Reference - Phygital on Render

## ⚡ Quick Start Checklist

### Before You Start
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas account ready
- [ ] AWS S3 OR Cloudinary account ready
- [ ] Render account created

### Backend Deployment (5 minutes)
1. **Render Dashboard** → "New +" → "Web Service"
2. **Connect GitHub** → Select repository
3. **Configure**:
   - Name: `phygital-backend`
   - Root Directory: `backend`
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=your_secure_secret_32_chars_min
   FRONTEND_URL=https://phygital-frontend.onrender.com
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=phygital-production
   ```
5. **Deploy** → Wait for completion
6. **Test**: `https://phygital-backend.onrender.com/api/health`

### Frontend Deployment (5 minutes)
1. **Render Dashboard** → "New +" → "Static Site"
2. **Connect GitHub** → Select repository
3. **Configure**:
   - Name: `phygital-frontend`
   - Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://phygital-backend.onrender.com/api
   VITE_FRONTEND_URL=https://phygital-frontend.onrender.com
   VITE_NODE_ENV=production
   ```
5. **Deploy** → Wait for completion
6. **Test**: Visit frontend URL

### Final Step (2 minutes)
1. **Update Backend** → Environment Variables
2. **Change** `FRONTEND_URL` to actual frontend URL
3. **Redeploy** backend
4. **Test** complete flow

## 🔗 Expected URLs
- **Frontend**: `https://phygital-frontend.onrender.com`
- **Backend**: `https://phygital-backend.onrender.com`
- **Health**: `https://phygital-backend.onrender.com/api/health`

## 🧪 Quick Tests
1. **Health Check**: Visit backend health URL
2. **Frontend Load**: Visit frontend URL
3. **User Flow**: Register → Login → Upload → Generate QR
4. **QR Test**: Scan QR code on mobile

## 🆘 Common Issues
- **CORS Error**: Check `FRONTEND_URL` in backend
- **404 Routes**: Verify `_redirects` file exists
- **DB Error**: Check MongoDB URI and IP whitelist
- **Upload Error**: Check AWS/Cloudinary credentials

## ⏱️ Total Time: ~15 minutes
- Backend: 5 minutes
- Frontend: 5 minutes  
- Testing: 5 minutes

---
**Need detailed steps?** See `RENDER_DEPLOYMENT_STEPS.md`
