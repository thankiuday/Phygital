/**
 * Admin Activity Model
 * Logs all admin activities for security auditing
 */

const mongoose = require('mongoose');

const adminActivitySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'user_view',
      'user_activate',
      'user_deactivate',
      'user_delete',
      'project_view',
      'settings_update',
      'maintenance_toggle',
      'contact_update',
      'analytics_view'
    ]
  },
  targetType: {
    type: String,
    enum: ['user', 'project', 'system', 'contact', 'analytics', null]
  },
  targetId: {
    type: String
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
adminActivitySchema.index({ adminId: 1, timestamp: -1 });
adminActivitySchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AdminActivity', adminActivitySchema);





















