/**
 * User Model
 * Defines the schema for user accounts in the Phygital platform
 * Stores authentication data, uploaded files, social links, and analytics
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  
  // Uploaded files information
  uploadedFiles: {
    design: {
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      uploadedAt: Date,
      dimensions: {
        width: Number,
        height: Number,
        aspectRatio: Number
      }
    },
    video: {
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      duration: Number, // in seconds
      uploadedAt: Date,
      compressed: Boolean
    },
    compositeDesign: {
      filename: String,
      originalName: String,
      url: String,
      size: Number,
      uploadedAt: Date
    },
    mindTarget: {
      filename: String,
      url: String,
      size: Number,
      uploadedAt: Date,
      generated: { type: Boolean, default: false } // Indicates if auto-generated or manually uploaded
    }
  },
  
  // QR code position on design
  qrPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 100 },
    height: { type: Number, default: 100 }
  },
  
  // Social media links
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  
  // Analytics data
  analytics: {
    totalScans: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    linkClicks: { type: Number, default: 0 },
    arExperienceStarts: { type: Number, default: 0 },
    lastScanAt: Date,
    lastVideoViewAt: Date,
    lastArExperienceStartAt: Date
  },
  
  // Project management
  projects: [{
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  currentProject: { type: String, default: null },
  
  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  try {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Get public profile (without sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

// Update analytics method
userSchema.methods.updateAnalytics = function(type, increment = 1) {
  try {
    switch (type) {
      case 'scan':
        this.analytics.totalScans += increment;
        this.analytics.lastScanAt = new Date();
        break;
      case 'videoView':
        this.analytics.videoViews += increment;
        this.analytics.lastVideoViewAt = new Date();
        break;
      case 'linkClick':
        this.analytics.linkClicks += increment;
        break;
      case 'arExperienceStart':
        this.analytics.arExperienceStarts += increment;
        this.analytics.lastArExperienceStartAt = new Date();
        break;
      default:
        throw new Error('Invalid analytics type');
    }
    return this.save();
  } catch (error) {
    throw new Error('Failed to update analytics');
  }
};

module.exports = mongoose.model('User', userSchema);
