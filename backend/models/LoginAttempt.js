/**
 * Login Attempt Model
 * Tracks login attempts for brute force protection
 */

const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String
  },
  success: {
    type: Boolean,
    required: true,
    default: false
  },
  failureReason: {
    type: String,
    enum: ['invalid_credentials', 'account_locked', 'account_inactive', 'rate_limited', 'ip_blocked'],
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    expires: 86400 // Auto-delete after 24 hours
  },
  isAdmin: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
loginAttemptSchema.index({ email: 1, timestamp: -1 });
loginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });
loginAttemptSchema.index({ isAdmin: 1, timestamp: -1 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);

