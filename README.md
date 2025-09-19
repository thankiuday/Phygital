# Phygital - Physical to Digital Bridge Platform

Transform your physical designs into interactive digital experiences with QR codes and videos. Bridge the gap between physical and digital worlds.

## 🌟 Features

- **Easy Upload**: Upload design images and explanatory videos
- **QR Code Generation**: Automatically generate unique QR codes
- **Video Integration**: Embed videos that play when QR codes are scanned
- **Analytics Dashboard**: Track scans, views, and engagement
- **Social Integration**: Connect social media profiles
- **Personalized Domains**: Each user gets a unique URL
- **Mobile Optimized**: Responsive design for all devices

## 🚀 Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **MongoDB** + **Mongoose** - Database and ODM

- **JWT** - Authentication
- **AWS S3** - File storage
- **bcryptjs** - Password hashing
- **QRCode** - QR code generation

### Frontend
- **React** (JSX) - UI framework
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **React Router** - Routing
- **React Query** - Data fetching
- **React Hook Form** - Form handling

## 📁 Project Structure

```
Phygital/
├── backend/                 # Node.js + Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── config/             # AWS S3 configuration
│   └── server.js           # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── utils/          # Utility functions
│   │   └── main.jsx        # App entry point
│   └── package.json
└── README.md
```

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud)
- AWS S3 bucket
- Git

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Phygital/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/phygital
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=phygital-videos
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Backend Deployment (Render/Heroku)

1. **Prepare for deployment**
   ```bash
   cd backend
   npm install --production
   ```

2. **Deploy to Render**
   - Connect your GitHub repository
   - Set environment variables
   - Deploy

3. **Docker Deployment**
   ```bash
   docker build -t phygital-backend .
   docker run -p 5000:5000 phygital-backend
   ```

### Frontend Deployment (Vercel)

1. **Build the project**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel --prod
   ```

3. **Update environment variables**
   - Set `VITE_API_URL` to your deployed backend URL

## 📱 Usage

### For Users

1. **Register/Login** - Create an account or sign in
2. **Upload Content** - Upload your design image and explanatory video
3. **Set QR Position** - Mark where the QR code should be placed
4. **Add Social Links** - Connect your social media profiles
5. **Generate QR Code** - Download your unique QR code
6. **Print & Share** - Add QR code to your design and share
7. **Track Analytics** - Monitor engagement and performance

### For Visitors

1. **Scan QR Code** - Use any QR scanner app
2. **View Content** - See the design and watch the video
3. **Interact** - Click social links and explore
4. **Engage** - All interactions are tracked for analytics

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

### Upload
- `POST /api/upload/design` - Upload design image
- `POST /api/upload/video` - Upload video
- `POST /api/upload/qr-position` - Set QR position
- `POST /api/upload/social-links` - Update social links

### QR Code
- `GET /api/qr/generate/:userId` - Generate QR code
- `GET /api/qr/my-qr` - Get user's QR code
- `GET /api/qr/info/:userId` - Get QR info
- `POST /api/qr/scan` - Track scan

### Analytics
- `POST /api/analytics/scan` - Track scan
- `POST /api/analytics/video-view` - Track video view
- `POST /api/analytics/link-click` - Track link click
- `GET /api/analytics/:userId` - Get analytics

## 🎯 Key Features Explained

### 1. Authentication System
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes and middleware
- User session management

### 2. File Upload System
- AWS S3 integration for cloud storage
- Support for images and videos
- File validation and size limits
- Progress tracking

### 3. QR Code Generation
- Unique QR codes per user
- Customizable positioning
- Multiple format support (PNG, SVG)
- Download functionality

### 4. Analytics Tracking
- Real-time engagement tracking
- Detailed analytics dashboard
- Performance insights
- Export capabilities

### 5. Personalized Pages
- Unique URLs for each user
- Responsive design
- Video player with controls
- Social media integration

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting
- CORS configuration
- Helmet.js security headers

## 📊 Database Schema

### User Model
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  uploadedFiles: {
    design: { url, filename, size, uploadedAt },
    video: { url, filename, size, duration, uploadedAt }
  },
  qrPosition: { x, y, width, height },
  socialLinks: { instagram, facebook, twitter, linkedin, website },
  analytics: { totalScans, videoViews, linkClicks, lastScanAt, lastVideoViewAt }
}
```

### Analytics Model
```javascript
{
  userId: ObjectId,
  eventType: String,
  eventData: Object,
  timestamp: Date,
  sessionId: String,
  deviceInfo: Object
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: support@phygital.com

## 🎉 Acknowledgments

- Built with modern web technologies
- Inspired by the need to bridge physical and digital experiences
- Thanks to all contributors and users

---

**Phygital** - Where Physical Meets Digital ✨
