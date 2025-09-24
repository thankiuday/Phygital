# Render Deployment Checklist for Phygital

## Pre-Deployment Checklist

### Code Preparation
- [x] All code committed and pushed to GitHub
- [x] Environment variables configured for production
- [x] Build scripts updated for production
- [x] CORS configuration updated for production URLs
- [x] Health check endpoint implemented
- [x] Error handling and logging configured
- [x] Static file routing configured
- [x] Security headers configured

### Dependencies
- [x] All dependencies listed in package.json
- [x] No dev dependencies in production build
- [x] Package-lock.json files present
- [x] Node.js version compatibility verified

### Configuration Files
- [x] render.yaml files created for both services
- [x] _redirects file for frontend routing
- [x] robots.txt for SEO
- [x] Production environment examples updated

## Deployment Steps

### Backend Deployment
- [ ] Create Render web service
- [ ] Configure build and start commands
- [ ] Set environment variables
- [ ] Deploy and verify health endpoint
- [ ] Test API endpoints

### Frontend Deployment  
- [ ] Create Render static site
- [ ] Configure build command and publish directory
- [ ] Set environment variables
- [ ] Deploy and verify site loads
- [ ] Test client-side routing

### Database Setup
- [ ] MongoDB Atlas cluster created
- [ ] Database user configured
- [ ] IP whitelist configured (0.0.0.0/0)
- [ ] Connection string added to backend env vars

### File Storage Setup
Choose one:
- [ ] AWS S3 bucket created and configured
- [ ] Cloudinary account created and configured

## Post-Deployment Verification

### Backend Tests
- [ ] Health check endpoint responds correctly
- [ ] User registration works
- [ ] User login works
- [ ] File upload works
- [ ] QR code generation works
- [ ] Database operations work

### Frontend Tests
- [ ] Site loads correctly
- [ ] All routes work (client-side routing)
- [ ] API calls work
- [ ] File uploads work through UI
- [ ] QR code display works
- [ ] Mobile responsiveness verified

### Integration Tests
- [ ] Complete user flow works
- [ ] QR code scanning works
- [ ] AR experience loads
- [ ] Analytics tracking works
- [ ] Error handling works

## Performance Verification

### Backend Performance
- [ ] Response times under 2 seconds
- [ ] Memory usage stable
- [ ] No memory leaks detected
- [ ] Rate limiting working

### Frontend Performance
- [ ] Page load times under 3 seconds
- [ ] Bundle size optimized
- [ ] Images optimized
- [ ] Caching headers working

## Security Verification

### Backend Security
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Authentication working
- [ ] Authorization working

### Frontend Security
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] No sensitive data in client code
- [ ] XSS protection active

## Monitoring Setup

### Error Monitoring
- [ ] Backend error logging configured
- [ ] Frontend error tracking configured
- [ ] Database monitoring active
- [ ] Uptime monitoring configured

### Performance Monitoring
- [ ] Response time monitoring
- [ ] Memory usage monitoring
- [ ] Database performance monitoring
- [ ] User analytics working

## Environment Variables Checklist

### Backend Required Variables
- [ ] NODE_ENV=production
- [ ] PORT=10000
- [ ] MONGODB_URI (from database)
- [ ] JWT_SECRET (auto-generated)
- [ ] FRONTEND_URL (actual frontend URL)

### Backend Optional Variables
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_REGION
- [ ] AWS_S3_BUCKET
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY
- [ ] CLOUDINARY_API_SECRET

### Frontend Required Variables
- [ ] VITE_API_URL (actual backend URL)
- [ ] VITE_FRONTEND_URL (actual frontend URL)
- [ ] VITE_NODE_ENV=production

## Troubleshooting Checklist

### Common Issues
- [ ] CORS errors - check FRONTEND_URL in backend
- [ ] Database connection - verify MongoDB URI and IP whitelist
- [ ] File uploads - check storage service credentials
- [ ] 404 errors - verify _redirects file
- [ ] Build failures - check logs and dependencies

### Debug Steps
- [ ] Check Render service logs
- [ ] Verify environment variables
- [ ] Test API endpoints with curl/Postman
- [ ] Check browser console for errors
- [ ] Verify database connection

## Final Verification

### URLs to Test
- [ ] Frontend: https://phygital-frontend.onrender.com
- [ ] Backend: https://phygital-backend.onrender.com
- [ ] Health Check: https://phygital-backend.onrender.com/api/health

### User Flow Test
1. [ ] Visit frontend URL
2. [ ] Register new user
3. [ ] Login with credentials
4. [ ] Upload design file
5. [ ] Upload video file
6. [ ] Generate QR code
7. [ ] Download QR code
8. [ ] Scan QR code on mobile
9. [ ] Verify AR experience works
10. [ ] Check analytics data

## Maintenance Tasks

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Check performance metrics weekly
- [ ] Update dependencies monthly
- [ ] Backup database weekly
- [ ] Review security settings monthly

### Emergency Procedures
- [ ] Rollback procedure documented
- [ ] Emergency contact list ready
- [ ] Backup restoration procedure tested
- [ ] Incident response plan ready

## Success Criteria

The deployment is successful when:
- [ ] All health checks pass
- [ ] Complete user flow works end-to-end
- [ ] Performance meets requirements
- [ ] Security measures are active
- [ ] Monitoring is operational
- [ ] Documentation is complete

## Notes

- Render free tier has limitations (services sleep after 15 minutes of inactivity)
- First request after sleep may take 30+ seconds to respond
- Consider upgrading to paid tier for production use
- Monitor usage to avoid hitting free tier limits

## Support Resources

- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

**Deployment Date**: ___________
**Deployed By**: ___________
**Frontend URL**: ___________
**Backend URL**: ___________
**Database**: ___________
**File Storage**: ___________
