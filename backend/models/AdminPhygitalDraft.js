/**
 * Admin Phygital Draft Model
 * Stores admin-created Phygital QR drafts before granting to a user
 * Separate from user.projects until granted
 */

const mongoose = require('mongoose');

const uploadedFilesSchema = {
  design: {
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    uploadedAt: Date,
    dimensions: { width: Number, height: Number, aspectRatio: Number }
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
  videos: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    duration: Number,
    uploadedAt: Date,
    compressed: Boolean,
    videoId: String
  }],
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
  },
  documents: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimetype: String,
    format: String,
    resource_type: String,
    uploadedAt: Date
  }]
};

const phygitalizedDataSchema = {
  fileUrl: String,
  fileType: String,
  pdfUrl: String,
  videoUrl: String,
  designUrl: String,
  compositeDesignUrl: String,
  documentUrls: [String],
  phoneNumber: String,
  whatsappNumber: String,
  qrPosition: { x: Number, y: Number, width: Number, height: Number },
  links: [{ label: String, url: String }],
  socialLinks: {
    website: String,
    instagram: String,
    facebook: String,
    twitter: String,
    linkedin: String,
    contactNumber: String,
    whatsappNumber: String,
    tiktok: String
  },
  qrCodeUrl: String,
  landingPageUrl: String,
  arExperienceUrl: String,
  targetUrl: String,
  templateId: { type: String, default: 'default' },
  templateConfig: mongoose.Schema.Types.Mixed,
  qrDesign: mongoose.Schema.Types.Mixed
};

const adminPhygitalDraftSchema = new mongoose.Schema({
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'granted', 'cancelled'],
    default: 'draft',
    index: true
  },
  campaignType: {
    type: String,
    default: 'qr-links-ar-video'
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  uploadedFiles: { type: uploadedFilesSchema, default: () => ({}) },
  qrPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width: { type: Number, default: 100 },
    height: { type: Number, default: 100 }
  },
  qrFrameConfig: {
    frameType: { type: Number, default: 1, min: 1, max: 10 },
    textContent: { type: String, default: 'SCAN ME' },
    textStyle: {
      bold: { type: Boolean, default: true },
      italic: { type: Boolean, default: false },
      color: { type: String, default: '#FFFFFF' },
      gradient: { type: [String], default: null }
    },
    transparentBackground: { type: Boolean, default: false }
  },
  phygitalizedData: { type: phygitalizedDataSchema, default: () => ({}) },
  socialLinks: {
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
    contactNumber: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' }
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  grantedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  grantedAt: { type: Date },
  grantedProjectId: { type: String },
  adminNotes: { type: String, trim: true }
}, {
  timestamps: true
});

adminPhygitalDraftSchema.index({ targetUserId: 1, status: 1 });
adminPhygitalDraftSchema.index({ createdByAdminId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminPhygitalDraft', adminPhygitalDraftSchema);
