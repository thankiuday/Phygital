# Phygital Backend

Node.js + Express.js backend for the Phygital platform.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
backend/
├── models/           # MongoDB models
│   ├── User.js      # User schema
│   └── Analytics.js # Analytics schema
├── routes/          # API routes
│   ├── auth.js      # Authentication routes
│   ├── upload.js    # File upload routes
│   ├── qr.js        # QR code routes
│   ├── analytics.js # Analytics routes
│   └── user.js      # User routes
├── middleware/      # Custom middleware
│   └── auth.js      # Authentication middleware
├── config/          # Configuration files
│   └── aws.js       # AWS S3 configuration
├── server.js        # Main server file
├── Dockerfile       # Docker configuration
└── package.json     # Dependencies
```

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/phygital

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=phygital-videos

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t phygital-backend .

# Run container
docker run -p 5000:5000 phygital-backend
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

### Upload Endpoints
- `POST /api/upload/design` - Upload design image
- `POST /api/upload/video` - Upload video
- `PUT /api/upload/video/:userId` - Update video
- `POST /api/upload/qr-position` - Set QR position
- `POST /api/upload/social-links` - Update social links
- `GET /api/upload/status` - Get upload status

### QR Code Endpoints
- `GET /api/qr/generate/:userId` - Generate QR code
- `GET /api/qr/my-qr` - Get user's QR code
- `GET /api/qr/info/:userId` - Get QR info
- `POST /api/qr/scan` - Track scan
- `GET /api/qr/download/:userId` - Download QR code

### Analytics Endpoints
- `POST /api/analytics/scan` - Track scan
- `POST /api/analytics/video-view` - Track video view
- `POST /api/analytics/link-click` - Track link click
- `POST /api/analytics/page-view` - Track page view
- `GET /api/analytics/:userId` - Get analytics
- `GET /api/analytics/dashboard/:userId` - Get dashboard analytics

### User Endpoints
- `GET /api/user/profile` - Get profile
- `GET /api/user/:username` - Get public profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/setup/status` - Get setup status
- `DELETE /api/user/account` - Delete account
- `GET /api/user/analytics/summary` - Get analytics summary

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Input validation with express-validator
- Rate limiting
- CORS configuration
- Helmet.js security headers
- File upload validation

## 📊 Database Models

### User Model
- Basic user information (username, email, password)
- Uploaded files (design, video)
- QR code position
- Social media links
- Analytics data

### Analytics Model
- Event tracking (scans, views, clicks)
- User session data
- Device information
- Timestamps

## 🚀 Production Deployment

1. **Set production environment variables**
2. **Use MongoDB Atlas for database**
3. **Configure AWS S3 bucket**
4. **Deploy to Render/Heroku**
5. **Set up monitoring and logging**

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests

## 🤝 Contributing

1. Follow the existing code style
2. Add proper error handling
3. Include input validation
4. Write tests for new features
5. Update documentation

## 📄 License

MIT License
