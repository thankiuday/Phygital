/**
 * User Model
 * Defines the schema for user accounts in the Phygital platform
 * Stores authentication data, uploaded files, social links, and analytics
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateUniqueUserCode } = require('../utils/urlCodeGenerator');

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
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please enter a valid email']
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
  
  // Social media links and contact information
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' }
  },
  
  // QR Design History - Custom QR codes created by user
  qrDesignHistory: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    redirectUrl: { type: String, required: true },
    iconType: { 
      type: String, 
      enum: ['library', 'upload', 'none'], 
      default: 'none' 
    },
    iconId: { type: String, default: null },
    iconUrl: { type: String, default: null },
    qrCodeUrl: { type: String, required: true },
    size: { type: Number, default: 300 },
    createdAt: { type: Date, default: Date.now },
    downloadCount: { type: Number, default: 0 }
  }],
  
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
  
  // Project management - Each project has its own files and settings
  projects: [{
    id: { type: String, required: true },
    urlCode: { 
      type: String, 
      trim: true,
      match: [/^[a-zA-Z0-9_-]{6,8}$/, 'URL code must be 6-8 alphanumeric characters with hyphens or underscores']
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: { type: String, enum: ['active', 'completed', 'archived'], default: 'active' },
    isEnabled: { type: Boolean, default: true }, // Toggle to enable/disable AR scanning for this project
    requiresTargetImage: { type: Boolean, default: true }, // Toggle to require target image for AR experience
    
    // Project-specific files
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
        duration: Number,
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
        generated: { type: Boolean, default: false }
      }
    },
    
    // Project-specific social links and contact info
    socialLinks: {
      instagram: { type: String, default: '' },
      facebook: { type: String, default: '' },
      twitter: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      website: { type: String, default: '' },
      contactNumber: { type: String, default: '' },
      whatsappNumber: { type: String, default: '' }
    },

    // Project-specific QR position
    qrPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      width: { type: Number, default: 100 },
      height: { type: Number, default: 100 }
    },
    
    // Project-specific analytics
    analytics: {
      totalScans: { type: Number, default: 0 },
      videoViews: { type: Number, default: 0 },
      linkClicks: { type: Number, default: 0 },
      arExperienceStarts: { type: Number, default: 0 },
      lastScanAt: Date,
      lastVideoViewAt: Date,
      lastArExperienceStartAt: Date
    },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  currentProject: { type: String, default: null },
  
  // Account status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  
  // User role (admin or user)
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // URL code for encoded URLs (like Amazon/Flipkart style)
  urlCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[a-zA-Z0-9_-]{6,8}$/, 'URL code must be 6-8 alphanumeric characters with hyphens or underscores']
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ urlCode: 1 });

// Hash password and generate urlCode before saving
userSchema.pre('save', async function(next) {
  try {
    // Generate urlCode if it doesn't exist (for new users)
    if (this.isNew && !this.urlCode) {
      try {
        this.urlCode = await generateUniqueUserCode(this.constructor);
      } catch (error) {
        console.error('Error generating urlCode:', error);
        // Continue without urlCode - migration script can handle it later
      }
    }
    
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

// Check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
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
