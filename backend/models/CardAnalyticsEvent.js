/**
 * CardAnalyticsEvent Model
 * Stores individual analytics events for business cards.
 * Enables time-series queries, device breakdown, referrer tracking, etc.
 */

const mongoose = require('mongoose');

const cardAnalyticsEventSchema = new mongoose.Schema({
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessCard',
    required: true,
    index: true
  },

  event: {
    type: String,
    required: true,
    enum: ['view', 'contactClick', 'socialClick', 'vcardDownload', 'linkClick']
  },

  // Which specific action (e.g. 'phone', 'email', 'instagram', 'linkedin')
  target: { type: String, default: '' },

  // Device & browser info (parsed from User-Agent)
  device: {
    type: { type: String, default: 'unknown', enum: ['mobile', 'tablet', 'desktop', 'unknown'] },
    os: { type: String, default: '' },
    browser: { type: String, default: '' }
  },

  // Where the visitor came from
  referrer: { type: String, default: '' },
  referrerDomain: { type: String, default: '' },

  // Source: 'qr' if scanned from QR, 'direct' if typed/bookmarked, 'link' if from shared link
  source: {
    type: String,
    default: 'direct',
    enum: ['qr', 'direct', 'link', 'social', 'unknown']
  },

  // Country/city (from IP, optional - set if available)
  country: { type: String, default: '' },
  city: { type: String, default: '' },

  // IP hash for unique visitor estimation (hashed, not raw IP)
  visitorHash: { type: String, default: '' },

  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false
});

// Compound indexes for efficient queries
cardAnalyticsEventSchema.index({ cardId: 1, timestamp: -1 });
cardAnalyticsEventSchema.index({ cardId: 1, event: 1, timestamp: -1 });
cardAnalyticsEventSchema.index({ cardId: 1, visitorHash: 1 });

// TTL: auto-delete events older than 1 year to save space
cardAnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('CardAnalyticsEvent', cardAnalyticsEventSchema);
