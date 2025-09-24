/**
 * QR Code Routes
 * Handles QR code generation and management
 * Creates unique QR codes that link to user's personalized pages
 */

const express = require('express');
const QRCode = require('qrcode');
const User = require('../models/User');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireUploadedFiles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/qr/generate/:userId
 * Generate QR code for a specific user
 * Returns QR code as base64 image or SVG
 */
router.get('/generate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'png', size = 200 } = req.query;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User has not completed setup'
      });
    }
    
    // Generate personalized URL - use scan route for AR experience
    const personalizedUrl = `${process.env.FRONTEND_URL}/scan/${user._id}`;
    
    // QR code options
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };
    
    // Generate QR code
    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(personalizedUrl, {
        type: 'svg',
        quality: qrOptions.quality,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeData);
    } else {
      qrCodeData = await QRCode.toDataURL(personalizedUrl, qrOptions);
      
      // Extract base64 data
      const base64Data = qrCodeData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('QR generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/my-qr
 * Get current user's QR code
 * Requires authentication
 */
router.get('/my-qr', authenticateToken, requireUploadedFiles, async (req, res) => {
  try {
    const { format = 'png', size = 200 } = req.query;
    
    // Generate personalized URL - use scan route for AR experience
    const personalizedUrl = `${process.env.FRONTEND_URL}/scan/${req.user._id}`;
    
    // QR code options
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };
    
    // Generate QR code
    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(personalizedUrl, {
        type: 'svg',
        quality: qrOptions.quality,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeData);
    } else {
      qrCodeData = await QRCode.toDataURL(personalizedUrl, qrOptions);
      
      // Extract base64 data
      const base64Data = qrCodeData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('My QR generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/info/:userId
 * Get QR code information and user data
 * Used by the personalized page to display user content
 */
router.get('/info/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Build query based on whether userId is a valid ObjectId or username
    let query;
    if (isValidObjectId) {
      query = { _id: userId };
    } else {
      query = { username: userId };
    }
    
    // Find user by ID or username
    const user = await User.findOne(query).select('-password -email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User profile not complete'
      });
    }
    
    // Return user data for the personalized page
    const userData = {
      username: user.username,
      uploadedFiles: user.uploadedFiles,
      socialLinks: user.socialLinks,
      qrPosition: user.qrPosition,
      analytics: {
        totalScans: user.analytics.totalScans,
        videoViews: user.analytics.videoViews,
        linkClicks: user.analytics.linkClicks
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: userData
    });
    
  } catch (error) {
    console.error('QR info error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get QR information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/qr/scan
 * Track QR code scan event
 * Increments scan counter and logs analytics
 */
router.post('/scan', async (req, res) => {
  try {
    const { userId, scanData } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        status: 'error',
        message: 'User ID is required'
      });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update analytics
    await user.updateAnalytics('scan');
    
    // Log detailed analytics if Analytics model is available
    try {
      const Analytics = require('../models/Analytics');
      await Analytics.trackEvent(userId, 'scan', {
        scanLocation: scanData?.location || {},
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer
      });
    } catch (analyticsError) {
      console.error('Analytics tracking error:', analyticsError);
      // Continue even if analytics tracking fails
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Scan tracked successfully',
      data: {
        totalScans: user.analytics.totalScans + 1
      }
    });
    
  } catch (error) {
    console.error('QR scan tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track scan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/project-data/:projectId
 * Get specific project data for QR scan page
 * Returns project-specific data formatted for AR experience
 */
router.get('/project-data/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Find user who owns this project
    const user = await User.findOne({ 'projects.id': projectId }).select('-password -email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Find the specific project
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Project not complete'
      });
    }
    
    // Return project-specific data for AR experience
    const projectData = {
      id: project.id,
      projectId: project.id,
      userId: user._id,
      name: project.name,
      description: project.description,
      designUrl: user.uploadedFiles.design.url,
      videoUrl: user.uploadedFiles.video.url,
      socialLinks: user.socialLinks || {},
      qrPosition: user.qrPosition,
      designDimensions: {
        width: user.uploadedFiles.design.dimensions?.width || 0.32,
        height: user.uploadedFiles.design.dimensions?.height || 0.44
      },
      username: user.username,
      status: project.status,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
    
    res.status(200).json({
      status: 'success',
      data: projectData
    });
    
  } catch (error) {
    console.error('Project data fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get project data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/user-data/:userId
 * Get user data for QR scan page (legacy support)
 * Returns user data formatted for AR experience
 */
router.get('/user-data/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Build query based on whether userId is a valid ObjectId or username
    let query;
    if (isValidObjectId) {
      query = { _id: userId };
    } else {
      query = { username: userId };
    }
    
    // Find user by ID or username
    const user = await User.findOne(query).select('-password -email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User profile not complete'
      });
    }
    
    // Return formatted data for AR experience
    const projectData = {
      id: user._id,
      designUrl: user.uploadedFiles.design.url,
      videoUrl: user.uploadedFiles.video.url,
      socialLinks: user.socialLinks || {},
      qrPosition: user.qrPosition,
      designDimensions: {
        width: 0.32,
        height: 0.44
      },
      username: user.username
    };
    
    res.status(200).json({
      status: 'success',
      data: projectData
    });
    
  } catch (error) {
    console.error('Project data fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get project data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/project/:projectId
 * Generate QR code for a specific project
 * Returns QR code as base64 image or SVG
 */
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'png', size = 200 } = req.query;
    
    // Find user and get the specific project
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the specific project
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User has not completed setup'
      });
    }
    
    // Generate project-specific URL - use project ID for specific AR experience
    const personalizedUrl = `${process.env.FRONTEND_URL}/scan/project/${projectId}`;
    
    // QR code options
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };
    
    // Generate QR code
    let qrCodeData;
    if (format === 'svg') {
      qrCodeData = await QRCode.toString(personalizedUrl, {
        type: 'svg',
        quality: qrOptions.quality,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeData);
    } else {
      qrCodeData = await QRCode.toDataURL(personalizedUrl, qrOptions);
      
      // Extract base64 data
      const base64Data = qrCodeData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('Project QR generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate project QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/download/project/:projectId
 * Download QR code for a specific project as file
 * Returns QR code as downloadable file
 */
router.get('/download/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'png', size = 300 } = req.query;
    
    // Find user and get the specific project
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the specific project
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Generate personalized URL with project context - use scan route for AR experience
    const personalizedUrl = `${process.env.FRONTEND_URL}/scan/${user._id}`;
    
    // QR code options
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };
    
    // Generate QR code
    if (format === 'svg') {
      const qrCodeData = await QRCode.toString(personalizedUrl, {
        type: 'svg',
        quality: qrOptions.quality,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${project.name.toLowerCase().replace(/\s+/g, '-')}.svg"`);
      res.send(qrCodeData);
    } else {
      const qrCodeData = await QRCode.toDataURL(personalizedUrl, qrOptions);
      
      // Extract base64 data
      const base64Data = qrCodeData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${project.name.toLowerCase().replace(/\s+/g, '-')}.png"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('Project QR download error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download project QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/project-data/:projectId
 * Get project data for QR scan page
 * Returns project information needed for AR experience
 */
router.get('/project-data/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Validate if projectId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(projectId);
    
    // Build query based on whether projectId is a valid ObjectId or username
    let query;
    if (isValidObjectId) {
      query = { _id: projectId };
    } else {
      query = { username: projectId };
    }
    
    // Find user by project ID
    const user = await User.findOne(query).select('-password -email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Project not complete'
      });
    }
    
    // Return project data for the AR experience
    const projectData = {
      id: user._id,
      username: user.username,
      designUrl: user.uploadedFiles.design.url,
      videoUrl: user.uploadedFiles.video.url,
      socialLinks: user.socialLinks || {},
      designDimensions: user.uploadedFiles.design.dimensions || {
        width: 800, // Fallback dimensions
        height: 600,
        aspectRatio: 800 / 600
      },
      qrPosition: user.qrPosition || { x: 0, y: 0, scale: 1 }
    };
    
    res.status(200).json({
      status: 'success',
      data: projectData
    });
    
  } catch (error) {
    console.error('Project data fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch project data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/qr/download/:userId
 * Download QR code as file
 * Returns QR code as downloadable file
 */
router.get('/download/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'png', size = 300 } = req.query;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Generate personalized URL - use AR route for AR experience
    const personalizedUrl = `${process.env.FRONTEND_URL}/ar/${user._id}`;
    
    // QR code options
    const qrOptions = {
      type: format === 'svg' ? 'svg' : 'png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: parseInt(size)
    };
    
    // Generate QR code
    if (format === 'svg') {
      const qrCodeData = await QRCode.toString(personalizedUrl, {
        type: 'svg',
        quality: qrOptions.quality,
        margin: qrOptions.margin,
        color: qrOptions.color,
        width: qrOptions.width
      });
      
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${user.username}.svg"`);
      res.send(qrCodeData);
    } else {
      const qrCodeData = await QRCode.toDataURL(personalizedUrl, qrOptions);
      
      // Extract base64 data
      const base64Data = qrCodeData.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="qr-${user.username}.png"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    }
    
  } catch (error) {
    console.error('QR download error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download QR code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
