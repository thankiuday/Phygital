/**
 * Phygital Backend Server
 * Main server file that sets up Express app, middleware, and routes
 * Handles authentication, file uploads, QR generation, and analytics
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import route handlers
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const qrRoutes = require('./routes/qr');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/user');
const historyRoutes = require('./routes/history');
const arExperienceRoutes = require('./routes/arExperience');
const contactRoutes = require('./routes/contact');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust proxy for accurate IP detection on Render/cloud platforms
app.set('trust proxy', 1);

// CORS configuration (must be BEFORE any other middleware)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5173',
  /^https:\/\/.*\.onrender\.com$/,
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://phygital-frontend.onrender.com',
  'https://phygital-backend-wcgs.onrender.com'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Only log blocked origins (not every request)
      console.warn(`❌ CORS - Origin blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
// Ensure preflight requests always succeed with proper headers
app.options('*', cors(corsOptions));

// Additional CORS middleware for development/debugging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Production CORS fallback for Render deployment and custom domains
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes('onrender.com') || origin.includes('localhost') || origin.includes('phygital.zone'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });
}

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting to prevent abuse
// More lenient in development, stricter in production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // 10000 for dev, 1000 for production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development for localhost
    if (process.env.NODE_ENV === 'development') {
      const origin = req.headers.origin || req.headers.host;
      return origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    }
    return false;
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory (for local development)
app.use('/uploads', express.static('uploads'));

// Serve frontend static files (for production deployment)
// Use path.join to correctly reference the frontend dist directory
const path = require('path');
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('❌ Full error details:', error);
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('🔄 Retrying database connection...');
      connectDB();
    }, 5000);
  }
};

// Connect to database
connectDB();

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/ar-experience', arExperienceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint with detailed status
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Basic system info
    const healthInfo = {
      status: 'success',
      message: 'Phygital API is running!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        name: mongoose.connection.name || 'unknown'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    };

    // If database is disconnected, return 503
    if (dbStatus === 'disconnected') {
      return res.status(503).json({
        ...healthInfo,
        status: 'error',
        message: 'Database connection failed'
      });
    }

    res.status(200).json(healthInfo);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Serve index.html for all non-API routes (React Router support)
// This allows frontend routing to work correctly
app.get('*', (req, res) => {
  // If request is for API, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      status: 'error',
      message: 'API route not found'
    });
  }
  
  // Otherwise, serve the frontend index.html for React Router
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Import global error handler
const { globalErrorHandler } = require('./middleware/errorHandler');

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

// Enhanced server startup with error handling
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Phygital Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔄 Deployment: Updated with latest analytics endpoints`);
      console.log(`📋 All routes mounted:`, [
        '/api/auth',
        '/api/upload',
        '/api/qr',
        '/api/analytics',
        '/api/user',
        '/api/history',
        '/api/ar-experience',
        '/api/contact',
        '/api/admin'
      ]);
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
