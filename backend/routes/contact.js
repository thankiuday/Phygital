/**
 * Contact Routes
 * Handles contact form submissions and contact management
 */

const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

/**
 * POST /api/contact/submit
 * Submit a contact form (public route)
 */
router.post('/submit', async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email address'
      });
    }

    // Validate message length
    if (message.length < 10) {
      return res.status(400).json({
        status: 'error',
        message: 'Message must be at least 10 characters long'
      });
    }

    // Create contact entry
    const contact = new Contact({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      status: 'new'
    });

    await contact.save();

    console.log('✅ Contact form submission saved:', {
      id: contact._id,
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      subject: contact.subject
    });

    res.status(201).json({
      status: 'success',
      message: 'Thank you for contacting us! We\'ll get back to you soon.',
      data: {
        id: contact._id,
        createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Contact form submission error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to submit contact form. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/contact/all
 * Get all contact submissions (protected route - admin only)
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    // Build query
    const query = {};
    if (status && ['new', 'read', 'responded', 'archived'].includes(status)) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get contacts
    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await Contact.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        contacts,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contacts'
    });
  }
});

/**
 * GET /api/contact/statistics
 * Get contact form statistics (protected route - admin only)
 */
router.get('/statistics', authenticateToken, async (req, res) => {
  try {
    const stats = await Contact.getStatistics();
    
    res.status(200).json({
      status: 'success',
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching contact statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/contact/:id
 * Get a specific contact by ID (protected route - admin only)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    // Mark as read if it's new
    if (contact.status === 'new') {
      await contact.markAsRead();
    }

    res.status(200).json({
      status: 'success',
      data: { contact }
    });

  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contact'
    });
  }
});

/**
 * PATCH /api/contact/:id/status
 * Update contact status (protected route - admin only)
 */
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['new', 'read', 'responded', 'archived'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    // Update status using appropriate method
    if (status === 'read') {
      await contact.markAsRead();
    } else if (status === 'responded') {
      await contact.markAsResponded();
    } else {
      contact.status = status;
      await contact.save();
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact status updated successfully',
      data: { contact }
    });

  } catch (error) {
    console.error('❌ Error updating contact status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update contact status'
    });
  }
});

/**
 * PATCH /api/contact/:id/notes
 * Add notes to a contact (protected route - admin only)
 */
router.patch('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { notes } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    contact.notes = notes || '';
    await contact.save();

    res.status(200).json({
      status: 'success',
      message: 'Notes updated successfully',
      data: { contact }
    });

  } catch (error) {
    console.error('❌ Error updating contact notes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update notes'
    });
  }
});

/**
 * DELETE /api/contact/:id
 * Delete a contact (protected route - admin only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting contact:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete contact'
    });
  }
});

module.exports = router;

