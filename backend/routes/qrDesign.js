/**
 * QR Design Routes
 * Handles saving, retrieving, and managing custom QR code designs for users
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const { uploadQRDesign, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * POST /api/qr-design/save
 * Save a new QR design to Cloudinary and user's history
 */
router.post('/save', authenticateToken, async (req, res) => {
  try {
    console.log('=== QR DESIGN SAVE REQUEST ===');
    console.log('User ID:', req.user._id);

    const { redirectUrl, iconType, iconId, iconUrl, size, qrCodeDataUrl } = req.body;

    // Validate required fields
    if (!redirectUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Redirect URL is required'
      });
    }

    if (!qrCodeDataUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'QR code image data is required'
      });
    }

    // Generate unique design ID
    const designId = Date.now().toString();
    
    // Convert data URL to buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('QR design buffer size:', buffer.length);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadQRDesign(buffer, req.user._id.toString(), designId);
    console.log('QR design uploaded to Cloudinary:', cloudinaryResult.url);

    // Generate design name
    const designName = `QR Design - ${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    // Create design object
    const qrDesign = {
      id: designId,
      name: designName,
      redirectUrl: redirectUrl,
      iconType: iconType || 'none',
      iconId: iconId || null,
      iconUrl: iconUrl || null,
      qrCodeUrl: cloudinaryResult.url,
      size: size || 300,
      createdAt: new Date(),
      downloadCount: 0
    };

    // Add to user's QR design history
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Initialize qrDesignHistory if it doesn't exist
    if (!user.qrDesignHistory) {
      user.qrDesignHistory = [];
    }

    // Add new design to history
    user.qrDesignHistory.push(qrDesign);
    await user.save();

    console.log('✅ QR design saved to user history');

    res.status(201).json({
      status: 'success',
      message: 'QR design saved successfully',
      data: {
        design: qrDesign
      }
    });

  } catch (error) {
    console.error('QR design save error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save QR design',
      error: error.message
    });
  }
});

/**
 * GET /api/qr-design/history
 * Get user's QR design history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    console.log('=== QR DESIGN HISTORY REQUEST ===');
    console.log('User ID:', req.user._id);

    const user = await User.findById(req.user._id).select('qrDesignHistory');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Get history and sort by createdAt (newest first)
    const history = user.qrDesignHistory || [];
    const sortedHistory = history.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    console.log(`✅ Retrieved ${sortedHistory.length} QR designs`);

    res.status(200).json({
      status: 'success',
      data: {
        designs: sortedHistory,
        count: sortedHistory.length
      }
    });

  } catch (error) {
    console.error('QR design history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve QR design history',
      error: error.message
    });
  }
});

/**
 * DELETE /api/qr-design/:id
 * Delete a QR design from history and Cloudinary
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('=== QR DESIGN DELETE REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('Design ID:', req.params.id);

    const { id } = req.params;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Find the design
    const design = user.qrDesignHistory?.find(d => d.id === id);
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'QR design not found'
      });
    }

    // Delete from Cloudinary
    try {
      const publicId = `phygital-zone/users/${req.user._id}/qr-designs/qr-design-${id}`;
      await deleteFromCloudinary(publicId);
      console.log('✅ Deleted from Cloudinary');
    } catch (cloudinaryError) {
      console.warn('Failed to delete from Cloudinary:', cloudinaryError.message);
      // Continue with database deletion even if Cloudinary fails
    }

    // Remove from user's history
    user.qrDesignHistory = user.qrDesignHistory.filter(d => d.id !== id);
    await user.save();

    console.log('✅ QR design deleted from history');

    res.status(200).json({
      status: 'success',
      message: 'QR design deleted successfully'
    });

  } catch (error) {
    console.error('QR design delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete QR design',
      error: error.message
    });
  }
});

/**
 * GET /api/qr-design/download/:id
 * Download a specific QR design and increment download count
 */
router.get('/download/:id', authenticateToken, async (req, res) => {
  try {
    console.log('=== QR DESIGN DOWNLOAD REQUEST ===');
    console.log('User ID:', req.user._id);
    console.log('Design ID:', req.params.id);

    const { id } = req.params;

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Find the design
    const designIndex = user.qrDesignHistory?.findIndex(d => d.id === id);
    
    if (designIndex === -1 || designIndex === undefined) {
      return res.status(404).json({
        status: 'error',
        message: 'QR design not found'
      });
    }

    const design = user.qrDesignHistory[designIndex];

    // Increment download count
    user.qrDesignHistory[designIndex].downloadCount = (design.downloadCount || 0) + 1;
    await user.save();

    console.log('✅ Download count incremented:', user.qrDesignHistory[designIndex].downloadCount);

    // Return QR code URL for download
    res.status(200).json({
      status: 'success',
      data: {
        qrCodeUrl: design.qrCodeUrl,
        design: user.qrDesignHistory[designIndex]
      }
    });

  } catch (error) {
    console.error('QR design download error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download QR design',
      error: error.message
    });
  }
});

module.exports = router;

