# Phygital Frontend - Deployment Guide

## 🚀 Render Deployment

### Prerequisites
- ✅ Code pushed to GitHub repository
- ✅ Render account created
- ✅ Backend API deployed and accessible

### Deployment Steps

#### 1. Create Static Site on Render
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Static Site"
3. Connect your GitHub repository
4. Configure the following:

#### 2. Build Settings
```
Build Command: npm ci && npm run build
Publish Directory: dist
```

#### 3. Environment Variables
Set these in Render dashboard:
```
VITE_API_URL=https://your-backend-url.onrender.com/api
VITE_FRONTEND_URL=https://your-frontend-url.onrender.com
VITE_NODE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
VITE_ENABLE_PWA=false
VITE_ENABLE_OFFLINE_MODE=false
VITE_ENABLE_SERVICE_WORKER=false
VITE_CACHE_DURATION=3600
```

#### 4. Custom Headers (Optional)
```
/*: X-Frame-Options: DENY
/*: X-Content-Type-Options: nosniff
/*: Referrer-Policy: strict-origin-when-cross-origin
/assets/*: Cache-Control: public, max-age=31536000, immutable
/*: Cache-Control: public, max-age=3600
```

### 🔧 Build Configuration

#### Vite Configuration
- ✅ Production build optimized
- ✅ Code splitting enabled
- ✅ Asset optimization
- ✅ Source maps disabled for security
- ✅ ES2015 target for compatibility

#### Dependencies
- ✅ All dependencies properly configured
- ✅ Dev dependencies excluded from production
- ✅ CDN libraries (MindAR, Three.js) handled correctly

### 🐛 Troubleshooting

#### Common Issues

1. **Build Fails**
   - Check Node.js version (should be 18+)
   - Verify all dependencies are in package.json
   - Check for TypeScript errors

2. **AR Not Working**
   - Ensure HTTPS is enabled (required for camera access)
   - Check browser console for CORS errors
   - Verify MindAR libraries are loading from CDN

3. **API Connection Issues**
   - Verify VITE_API_URL points to correct backend
   - Check CORS configuration on backend
   - Ensure backend is deployed and accessible

#### Debug Steps
1. Check browser console for errors
2. Verify environment variables are set
3. Test API endpoints directly
4. Check network tab for failed requests

### 📊 Performance

#### Bundle Size
- Main bundle: ~1MB (includes Three.js, MindAR)
- Vendor chunks: ~141KB (React, etc.)
- UI chunks: ~13KB (UI components)
- Total gzipped: ~350KB

#### Optimization
- ✅ Code splitting by feature
- ✅ Lazy loading for heavy components
- ✅ Asset compression
- ✅ CDN for AR libraries

### 🔒 Security

#### Headers
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin-when-cross-origin

#### Content Security Policy
Consider adding CSP headers for additional security.

### 🌐 Domain Configuration

#### Custom Domain
1. Add custom domain in Render dashboard
2. Configure DNS records
3. Enable SSL certificate (automatic)

#### Subdomain
If using subdomain, update VITE_FRONTEND_URL accordingly.

### 📱 Mobile Considerations

#### PWA Features
- Service worker available (disabled by default)
- Manifest.json included
- Offline capability (can be enabled)

#### Mobile Optimization
- ✅ Responsive design
- ✅ Touch-friendly interface
- ✅ Camera permissions handled
- ✅ Mobile browser compatibility

### 🔄 Updates

#### Automatic Deploys
- ✅ Deploys automatically on git push to main branch
- ✅ Build logs available in Render dashboard
- ✅ Rollback capability available

#### Manual Deploys
- Trigger manual deploy from Render dashboard
- Use specific git commit hash if needed

### 📞 Support

#### Monitoring
- Render provides built-in monitoring
- Check deployment logs for issues
- Monitor build times and success rates

#### Contact
- Render Support: support@render.com
- Documentation: https://render.com/docs

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render static site created
- [ ] Build command configured
- [ ] Environment variables set
- [ ] Custom headers configured (optional)
- [ ] SSL certificate enabled
- [ ] Custom domain configured (optional)
- [ ] First deployment successful
- [ ] AR functionality tested
- [ ] API connectivity verified
- [ ] Mobile compatibility tested
- [ ] Performance monitoring set up

---

**Last Updated:** $(date)
**Version:** v5.0.0 - AR Experience Fixed
