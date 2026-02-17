/**
 * BusinessCard Model
 * Standalone model for Digital Business Card feature.
 * Each card has a profile, contact info, flexible ordered sections,
 * social links, theme settings, and basic analytics.
 */

const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['heading', 'text', 'about', 'contact', 'images', 'videos', 'social_links', 'links', 'testimonials']
  },
  title: { type: String, default: '' },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  order: { type: Number, default: 0 },
  visible: { type: Boolean, default: true }
}, { _id: true });

const businessCardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 80,
    match: [/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Slug must be URL-safe (letters, numbers, hyphens)']
  },

  templateId: { type: String, default: 'professional' },

  profile: {
    photo: { type: String, default: '' },           // Cloudinary URL
    bannerImage: { type: String, default: '' },     // Cloudinary URL for banner
    showPhoto: { type: Boolean, default: true },    // Toggle visibility in digital card
    showBanner: { type: Boolean, default: true },   // Toggle visibility in digital card
    name: { type: String, default: '', maxlength: 100 },
    title: { type: String, default: '', maxlength: 120 },
    company: { type: String, default: '', maxlength: 100 },
    bio: { type: String, default: '', maxlength: 500 }
  },

  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    sms: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    website: { type: String, default: '' }
  },

  sections: [sectionSchema],

  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    github: { type: String, default: '' },
    pinterest: { type: String, default: '' },
    snapchat: { type: String, default: '' },
    telegram: { type: String, default: '' }
  },

  theme: {
    primaryColor: { type: String, default: '#8B5CF6' },
    secondaryColor: { type: String, default: '#EC4899' },
    fontFamily: { type: String, default: 'Inter' },
    cardStyle: { type: String, default: 'rounded', enum: ['rounded', 'sharp', 'glass'] }
  },

  printableCard: {
    generatedFrontUrl: { type: String, default: '' },
    generatedBackUrl: { type: String, default: '' }
  },

  analytics: {
    totalViews: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    contactClicks: { type: Number, default: 0 },
    socialClicks: { type: Number, default: 0 },
    vcardDownloads: { type: Number, default: 0 },
    linkClicks: { type: Number, default: 0 },
    qrScans: { type: Number, default: 0 },
    directVisits: { type: Number, default: 0 },
    lastViewedAt: { type: Date }
  },

  isPublished: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
businessCardSchema.index({ slug: 1 }, { unique: true });
businessCardSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('BusinessCard', businessCardSchema);
