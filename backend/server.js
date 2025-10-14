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
    console.log('🔍 CORS check - Origin:', origin);
    console.log('🔍 CORS check - Allowed origins:', allowedOrigins);
    
    if (!origin) {
      console.log('✅ CORS - No origin (server-to-server request)');
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        const match = allowedOrigin === origin;
        console.log(`🔍 CORS - String check: ${allowedOrigin} === ${origin} = ${match}`);
        return match;
      } else if (allowedOrigin instanceof RegExp) {
        const match = allowedOrigin.test(origin);
        console.log(`🔍 CORS - Regex check: ${allowedOrigin} test ${origin} = ${match}`);
        return match;
      }
      return false;
    });
    
    if (isAllowed) {
      console.log('✅ CORS - Origin allowed:', origin);
      callback(null, true);
    } else {
      console.warn(`❌ CORS - Origin blocked: ${origin}`);
      console.warn(`❌ CORS - Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
// Ensure preflight requests always succeed with proper headers
app.options('*', cors(corsOptions));

// Additional CORS middleware for development/debugging
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
}

// Production CORS fallback for Render deployment
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes('onrender.com') || origin.includes('localhost'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    next();
  });
}

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting to prevent abuse (increased limits for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for analytics)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory (for local development)
app.use('/uploads', express.static('uploads'));

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
    process.exit(1);
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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error:', err);
  
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Phygital Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
