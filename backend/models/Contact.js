/**
 * Contact Model
 * MongoDB schema for storing contact form submissions
 */

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
    match: [
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      'Please provide a valid email address'
    ]
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['new', 'read', 'responded', 'archived'],
    default: 'new'
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  },
  respondedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better query performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ createdAt: -1 });

// Virtual for full name
contactSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to mark as read
contactSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// Method to mark as responded
contactSchema.methods.markAsResponded = function() {
  this.status = 'responded';
  this.respondedAt = new Date();
  return this.save();
};

// Static method to get statistics
contactSchema.statics.getStatistics = async function() {
  const total = await this.countDocuments();
  const newCount = await this.countDocuments({ status: 'new' });
  const readCount = await this.countDocuments({ status: 'read' });
  const respondedCount = await this.countDocuments({ status: 'responded' });
  const archivedCount = await this.countDocuments({ status: 'archived' });

  return {
    total,
    new: newCount,
    read: readCount,
    responded: respondedCount,
    archived: archivedCount
  };
};

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;

