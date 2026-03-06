/**
 * ReferralCode Model
 * One-time (or limited-use) referral / unlock codes that upgrade a user's subscription plan.
 */

const mongoose = require('mongoose');

const referralCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  plan: {
    type: String,
    default: 'phygital',
    trim: true
  },
  usageLimit: {
    type: Number,
    default: 1,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  note: {
    type: String,
    trim: true,
    maxlength: 200
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

referralCodeSchema.index({ code: 1 });

module.exports = mongoose.model('ReferralCode', referralCodeSchema);

