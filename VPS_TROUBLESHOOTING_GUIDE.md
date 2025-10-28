# Hostinger VPS Troubleshooting Guide

Complete troubleshooting guide for common issues when deploying Phygital on Hostinger VPS.

---

## 🔍 Quick Diagnostics

Run these commands to check overall system health:

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# Check ports
sudo netstat -tlnp | grep -E ':(80|443|5000|27017)'

# Check disk space
df -h

# Check memory
free -m

# Check logs
pm2 logs phygital-backend --lines 50
sudo tail -n 50 /var/log/nginx/error.log
```

---

## 🚨 Common Issues & Solutions

### Issue 1: SSL Certificate Generation Failed

**Symptoms:**
- Certbot fails with "Challenge failed"
- Error: "Unable to reach domain"

**Diagnosis:**
```bash
# Check DNS resolution
nslookup yourdomain.com
nslookup api.yourdomain.com

# Check if port 80 is accessible
curl http://yourdomain.com

# Check Nginx configuration
sudo nginx -t
```

**Solutions:**

**Solution A: DNS Not Propagated**
```bash
# Wait 5-30 minutes for DNS propagation
# Check propagation status
dig yourdomain.com
dig api.yourdomain.com

# Try again after DNS is propagated
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

**Solution B: Firewall Blocking**
```bash
# Check UFW status
sudo ufw status

# Ensure ports are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# Check iptables
sudo iptables -L -n
```

**Solution C: Nginx Not Running**
```bash
# Start Nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# View errors
sudo journalctl -u nginx -n 50
```

**Solution D: Use Standalone Mode**
```bash
# Stop Nginx temporarily
sudo systemctl stop nginx

# Run Certbot in standalone mode
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Start Nginx
sudo systemctl start nginx

# Manually configure Nginx SSL
# Edit /etc/nginx/sites-available/phygital and add SSL configuration
```

---

### Issue 2: Backend API Not Responding (502 Bad Gateway)

**Symptoms:**
- Browser shows "502 Bad Gateway"
- API calls fail

**Diagnosis:**
```bash
# Check if backend is running
pm2 status
pm2 logs phygital-backend

# Check if port 5000 is listening
sudo netstat -tlnp | grep :5000

# Test backend directly
curl http://localhost:5000/health
```

**Solutions:**

**Solution A: Backend Not Running**
```bash
# Check PM2 status
pm2 list

# Start backend
cd /var/www/phygital/backend
pm2 start server.js --name phygital-backend

# Save PM2 process list
pm2 save
```

**Solution B: Backend Crashed**
```bash
# View error logs
pm2 logs phygital-backend --err

# Common causes:
# - Missing .env file
# - Database connection failed
# - Syntax error in code

# Check .env file exists
ls -la /var/www/phygital/backend/.env

# Restart backend
pm2 restart phygital-backend
```

**Solution C: Port Conflict**
```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill conflicting process
sudo kill -9 <PID>

# Restart backend
pm2 restart phygital-backend
```

**Solution D: Nginx Proxy Not Configured**
```bash
# Check Nginx configuration
sudo nginx -t

# View Nginx config
sudo cat /etc/nginx/sites-available/phygital

# Ensure proxy_pass is correct
# Should be: proxy_pass http://localhost:5000;

# Reload Nginx
sudo systemctl reload nginx
```

---

### Issue 3: MongoDB Connection Failed

**Symptoms:**
- Backend logs show "MongooseServerSelectionError"
- Cannot connect to database

**Diagnosis:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Try connecting
mongosh

# Check if MongoDB is listening
sudo netstat -tlnp | grep :27017
```

**Solutions:**

**Solution A: MongoDB Not Running**
```bash
# Start MongoDB
sudo systemctl start mongod

# Enable auto-start
sudo systemctl enable mongod

# Check status
sudo systemctl status mongod
```

**Solution B: Wrong Connection String**
```bash
# Edit .env file
nano /var/www/phygital/backend/.env

# Verify MONGODB_URI format:
# Local: mongodb://username:password@localhost:27017/phygital
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/phygital

# Restart backend
pm2 restart phygital-backend
```

**Solution C: Authentication Failed**
```bash
# Connect to MongoDB
mongosh

# Check users
use admin
db.getUsers()

# Recreate user if needed
use phygital
db.dropUser("phygital_user")
db.createUser({
  user: "phygital_user",
  pwd: "your_password",
  roles: ["readWrite"]
})

exit

# Update .env with correct password
# Restart backend
pm2 restart phygital-backend
```

**Solution D: MongoDB Disk Space Full**
```bash
# Check disk space
df -h

# Clean up logs if needed
sudo rm /var/log/mongodb/mongod.log.old

# Restart MongoDB
sudo systemctl restart mongod
```

---

### Issue 4: Frontend Shows Blank Page

**Symptoms:**
- Website loads but shows blank white page
- No content visible

**Diagnosis:**
```bash
# Check if dist folder exists
ls -la /var/www/phygital/frontend/dist/

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check browser console for errors (F12)
```

**Solutions:**

**Solution A: Frontend Not Built**
```bash
# Build frontend
cd /var/www/phygital/frontend
npm run build

# Verify dist folder
ls -la dist/

# Check index.html exists
cat dist/index.html

# Reload Nginx
sudo systemctl reload nginx
```

**Solution B: Wrong API URL**
```bash
# Check frontend .env.production
cat /var/www/phygital/frontend/.env.production

# Should have:
# VITE_API_URL=https://api.yourdomain.com

# Rebuild frontend
npm run build

# Reload Nginx
sudo systemctl reload nginx
```

**Solution C: CORS Issues**
```bash
# Check backend .env
nano /var/www/phygital/backend/.env

# Ensure CORS_ORIGINS includes your domain
# CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart backend
pm2 restart phygital-backend
```

**Solution D: Nginx Not Serving Files**
```bash
# Check Nginx configuration
sudo cat /etc/nginx/sites-available/phygital

# Ensure root path is correct:
# root /var/www/phygital/frontend/dist;

# Check file permissions
ls -la /var/www/phygital/frontend/dist/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/phygital/frontend/dist/
sudo chmod -R 755 /var/www/phygital/frontend/dist/

# Reload Nginx
sudo systemctl reload nginx
```

---

### Issue 5: File Upload Fails

**Symptoms:**
- Error: "Request Entity Too Large"
- Uploads timeout

**Diagnosis:**
```bash
# Check Nginx configuration
sudo cat /etc/nginx/sites-available/phygital | grep client_max_body_size

# Check backend logs
pm2 logs phygital-backend
```

**Solutions:**

**Solution A: Nginx Body Size Limit**
```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/phygital

# Add or increase:
client_max_body_size 100M;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

**Solution B: Backend Timeout**
```bash
# Edit Nginx proxy settings
sudo nano /etc/nginx/sites-available/phygital

# Add under location / for API:
proxy_connect_timeout 600;
proxy_send_timeout 600;
proxy_read_timeout 600;
send_timeout 600;

# Reload Nginx
sudo systemctl reload nginx
```

**Solution C: Storage Service Error**
```bash
# Check backend .env for AWS/Cloudinary credentials
nano /var/www/phygital/backend/.env

# Verify credentials are correct
# Check backend logs for specific error
pm2 logs phygital-backend
```

---

### Issue 6: Can't Access via HTTPS

**Symptoms:**
- HTTP works but HTTPS doesn't
- "Connection refused" on HTTPS

**Diagnosis:**
```bash
# Check if Nginx is listening on 443
sudo netstat -tlnp | grep :443

# Check SSL certificate
sudo certbot certificates

# Check Nginx configuration
sudo cat /etc/nginx/sites-available/phygital
```

**Solutions:**

**Solution A: SSL Not Configured**
```bash
# Run Certbot
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Reload Nginx
sudo systemctl reload nginx
```

**Solution B: Firewall Blocking 443**
```bash
# Allow HTTPS
sudo ufw allow 443/tcp
sudo ufw reload

# Check status
sudo ufw status
```

**Solution C: Nginx Not Reloaded**
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Or restart if needed
sudo systemctl restart nginx
```

---

### Issue 7: AR Features Not Working

**Symptoms:**
- AR viewer doesn't load
- Camera permission issues

**Diagnosis:**
```bash
# Check browser console for errors
# Check if HTTPS is enabled (AR requires HTTPS)

# Verify files are uploaded correctly
pm2 logs phygital-backend
```

**Solutions:**

**Solution A: Not Using HTTPS**
```text
AR features require HTTPS. Ensure:
- SSL certificate is installed
- Accessing site via https://
- No mixed content warnings
```

**Solution B: MIND Files Not Accessible**
```bash
# Check file URLs in database
mongosh phygital
db.arexperiences.find({}, { mindFileUrl: 1 })

# Verify files are accessible
curl -I <file_url>

# Check storage service (S3/Cloudinary)
# Ensure files are public or have correct CORS
```

---

### Issue 8: PM2 Process Keeps Crashing

**Symptoms:**
- Backend restarts repeatedly
- PM2 shows "errored" status

**Diagnosis:**
```bash
# View error logs
pm2 logs phygital-backend --err --lines 100

# Check system resources
free -m
df -h
```

**Solutions:**

**Solution A: Memory Issue**
```bash
# Check memory usage
pm2 monit

# Increase Node.js memory limit
pm2 delete phygital-backend
pm2 start server.js --name phygital-backend --max-memory-restart 500M

pm2 save
```

**Solution B: Uncaught Exception**
```bash
# Check error logs for stack trace
pm2 logs phygital-backend --err

# Fix code issue
# Restart backend
pm2 restart phygital-backend
```

**Solution C: Environment Variables Missing**
```bash
# Verify .env file
cat /var/www/phygital/backend/.env

# Ensure all required variables are set
# Restart backend
pm2 restart phygital-backend
```

---

### Issue 9: Slow Performance

**Symptoms:**
- Pages load slowly
- API responses are slow

**Diagnosis:**
```bash
# Check system resources
htop

# Check disk I/O
iostat

# Check MongoDB performance
mongosh
db.currentOp()

# Check PM2 monitoring
pm2 monit
```

**Solutions:**

**Solution A: High Memory Usage**
```bash
# Restart backend
pm2 restart phygital-backend

# Check memory leaks in code
pm2 monit

# Upgrade VPS plan if needed
```

**Solution B: Database Not Indexed**
```bash
# Connect to MongoDB
mongosh phygital

# Create indexes
db.arexperiences.createIndex({ userId: 1 })
db.arexperiences.createIndex({ createdAt: -1 })
db.analytics.createIndex({ experienceId: 1 })
db.analytics.createIndex({ timestamp: -1 })

exit
```

**Solution C: No Gzip Compression**
```bash
# Verify Nginx gzip is enabled
sudo cat /etc/nginx/sites-available/phygital | grep gzip

# Should have:
# gzip on;
# gzip_vary on;
# etc.

# Reload Nginx
sudo systemctl reload nginx
```

---

### Issue 10: Domain Not Resolving

**Symptoms:**
- Can access site via IP but not domain
- "Server not found" error

**Diagnosis:**
```bash
# Check DNS from server
nslookup yourdomain.com
dig yourdomain.com

# Check DNS from external
# Use online tools like https://dnschecker.org/
```

**Solutions:**

**Solution A: DNS Not Configured**
```text
In Hostinger Dashboard:
1. Go to Domains → Your Domain → DNS
2. Add A records:
   - Type: A, Name: @, Value: YOUR_VPS_IP
   - Type: A, Name: www, Value: YOUR_VPS_IP
   - Type: A, Name: api, Value: YOUR_VPS_IP
3. Save and wait 5-30 minutes
```

**Solution B: Wrong IP Address**
```bash
# Get your VPS IP
curl ifconfig.me

# Verify DNS points to this IP
nslookup yourdomain.com
```

**Solution C: DNS Propagation Not Complete**
```bash
# Wait and check propagation
# Usually takes 5 minutes to 24 hours

# Force DNS flush on your computer
# Windows:
ipconfig /flushdns

# Linux:
sudo systemd-resolve --flush-caches

# Mac:
sudo dscacheutil -flushcache
```

---

## 🔧 Maintenance Commands

### Regular Maintenance

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Check disk space
df -h

# Clean up old logs
sudo journalctl --vacuum-time=7d
pm2 flush

# Renew SSL (auto-renews, but can test)
sudo certbot renew --dry-run

# Backup database
mongodump --db phygital --out /backup/$(date +%Y%m%d)

# Restart all services
pm2 restart all
sudo systemctl restart nginx
sudo systemctl restart mongod
```

### Monitor Logs in Real-Time

```bash
# Backend logs
pm2 logs phygital-backend

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# System logs
sudo journalctl -f
```

---

## 📞 Getting More Help

If issues persist:

1. **Check detailed logs:**
   ```bash
   pm2 logs phygital-backend --lines 200 > ~/backend-logs.txt
   sudo tail -n 200 /var/log/nginx/error.log > ~/nginx-logs.txt
   ```

2. **System information:**
   ```bash
   uname -a
   node --version
   npm --version
   nginx -v
   mongod --version
   ```

3. **Contact Hostinger Support** with:
   - Your VPS IP
   - Domain name
   - Error logs
   - What you've tried

---

**Last Updated:** October 28, 2025


