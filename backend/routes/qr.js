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
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Centralized QR code generation helper
const generateQRCode = async (url, format = 'png', size = 200) => {
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
  
  if (format === 'svg') {
    return await QRCode.toString(url, qrOptions);
  } else {
    return await QRCode.toDataURL(url, qrOptions);
  }
};

// Validation middleware for user existence
const validateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    if (!isValidObjectId) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    const user = await User.findById(userId).select('-password -email');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'User validation failed'
    });
  }
};

// Validation middleware for project existence
const validateProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    const user = await User.findOne({ 'projects.id': projectId }).select('-password -email');
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    req.user = user;
    req.project = project;
    next();
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Project validation failed'
    });
  }
};

/**
 * GET /api/assets/targets/:file
 * Serve .mind files as raw binary with correct headers
 */
router.get('/assets/targets/:file', (req, res) => {
  try {
    const fileName = req.params.file;
    
    // Validate file extension
    if (!fileName.endsWith('.mind')) {
      return res.status(400).json({
        status: 'error',
        message: 'Only .mind files are allowed'
      });
    }
    
    // Construct file path (adjust based on your file structure)
    const filePath = path.join(__dirname, '..', 'public', 'targets', fileName);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Mind file not found'
      });
    }
    
    // Set correct headers for binary .mind file
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Send file as binary
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('sendFile error:', err);
        res.status(500).json({
          status: 'error',
          message: 'Failed to serve mind file'
        });
      }
    });
    
  } catch (error) {
    console.error('Mind file serve error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to serve mind file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
/**
 * GET /api/qr/user-data/:userId
 * Returns AR project data including design, video and optional mind target
 */
router.get('/user-data/:userId', validateUser, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has completed setup with null safety
    if (!user.uploadedFiles?.design?.url || !user.uploadedFiles?.video?.url) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User profile not complete' 
      });
    }
    
    // Check if we have a composite design, if not, we need to generate one
    const hasCompositeDesign = user.uploadedFiles.compositeDesign?.url;
    const hasOriginalDesign = user.uploadedFiles.design?.url;
    
    if (!hasCompositeDesign && hasOriginalDesign) {
      console.warn('⚠️ No composite design found - AR tracking may not work properly');
      console.log('💡 Composite design (design + QR code) is required for AR tracking');
    }
    
    // For user-data endpoint, use user's global social links (this is for backward compatibility)
    const socialLinks = user.socialLinks || {};
    
    console.log('🔗 User Social Links Debug:', {
      userSocialLinks: user.socialLinks,
      finalSocialLinks: socialLinks
    });
    
    const data = {
      userId: user._id.toString(),
      projectId: user.currentProject || null,
      name: user.username,
      designUrl: user.uploadedFiles.compositeDesign?.url || user.uploadedFiles.design.url,
      compositeDesignUrl: user.uploadedFiles.compositeDesign?.url || null,
      originalDesignUrl: user.uploadedFiles.design?.url || null,
      videoUrl: user.uploadedFiles.video.url,
      mindTargetUrl: user.uploadedFiles.mindTarget?.url || null,
      socialLinks: socialLinks,
      designDimensions: user.uploadedFiles.design?.dimensions || null,
      qrPosition: user.qrPosition,
      arReady: !!user.uploadedFiles.mindTarget?.url,
      mindTargetGenerated: user.uploadedFiles.mindTarget?.generated || false,
      hasCompositeDesign: !!hasCompositeDesign,
      needsCompositeGeneration: !hasCompositeDesign && hasOriginalDesign
    };
    
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('user-data error:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch user data' 
    });
  }
});

/**
 * GET /api/qr/project-data/:projectId
 * Returns project-specific data for AR experience
 */
router.get('/project-data/:projectId', validateProject, async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = req.user;
    const project = req.project;
    
    // Check if user has completed setup with null safety
    if (!user.uploadedFiles?.design?.url || !user.uploadedFiles?.video?.url) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'User profile not complete' 
      });
    }
    
    // Check if we have a composite design, if not, we need to generate one
    const hasCompositeDesign = user.uploadedFiles.compositeDesign?.url;
    const hasOriginalDesign = user.uploadedFiles.design?.url;
    
    if (!hasCompositeDesign && hasOriginalDesign) {
      console.warn('⚠️ No composite design found - AR tracking may not work properly');
      console.log('💡 Composite design (design + QR code) is required for AR tracking');
    }
    
    // For project-data endpoint, use user's global social links (this is for backward compatibility)
    const socialLinks = user.socialLinks || {};
    
    console.log('🔗 Project Data Social Links Debug:', {
      userSocialLinks: user.socialLinks,
      finalSocialLinks: socialLinks
    });
    
    const data = {
      userId: user._id.toString(),
      projectId,
      name: user.username,
      designUrl: user.uploadedFiles.compositeDesign?.url || user.uploadedFiles.design.url,
      compositeDesignUrl: user.uploadedFiles.compositeDesign?.url || null,
      originalDesignUrl: user.uploadedFiles.design?.url || null,
      videoUrl: user.uploadedFiles.video.url,
      mindTargetUrl: user.uploadedFiles.mindTarget?.url || null,
      socialLinks: socialLinks,
      designDimensions: user.uploadedFiles.design?.dimensions || null,
      qrPosition: user.qrPosition,
      arReady: !!user.uploadedFiles.mindTarget?.url,
      mindTargetGenerated: user.uploadedFiles.mindTarget?.generated || false,
      hasCompositeDesign: !!hasCompositeDesign,
      needsCompositeGeneration: !hasCompositeDesign && hasOriginalDesign
    };
    
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('project-data error:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch project data' 
    });
  }
});

/**
 * GET /api/qr/user/:userId/project/:projectId
 * Returns project-specific data for a user's project
 * This is the new endpoint that matches the URL structure: /ar/user/{userId}/project/{projectId}
 */
router.get('/user/:userId/project/:projectId', async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    console.log(`🔍 Looking for project ${projectId} belonging to user ${userId}`);
    
    // Find user
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Find the specific project
    let project = user.projects?.find(p => p.id === projectId);
    
    // BACKWARD COMPATIBILITY: If project not found, use root-level uploadedFiles
    // This handles both 'default' and timestamp-based project IDs for existing users
    if (!project) {
      console.log(`📦 Project ${projectId} not found in projects array - using root-level data for backward compatibility`);
      
      // Check if user has root-level data
      if (user.uploadedFiles?.design?.url || user.uploadedFiles?.video?.url) {
        console.log('✅ Found root-level uploadedFiles - creating virtual project');
        project = {
          id: projectId, // Use the requested project ID
          name: user.uploadedFiles?.design?.originalName || 'Default Project',
          uploadedFiles: user.uploadedFiles,
          qrPosition: user.qrPosition,
          analytics: user.analytics,
          status: 'active',
          description: 'Auto-migrated from root-level data'
        };
      } else {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found and no root-level data available'
        });
      }
    }
    
    // Check if project is enabled
    if (project.isEnabled === false) {
      console.log(`🚫 Project ${projectId} is disabled by owner`);
      return res.status(403).json({
        status: 'error',
        message: 'This project has been disabled by its owner',
        projectName: project.name,
        isDisabled: true
      });
    }
    
    // Check if project has completed setup
    const hasDesign = !!project.uploadedFiles?.design?.url;
    const hasVideo = !!project.uploadedFiles?.video?.url;
    
    if (!hasDesign || !hasVideo) {
      const missing = [];
      if (!hasDesign) missing.push('design');
      if (!hasVideo) missing.push('video');
      
      console.log(`⚠️ Project incomplete - missing: ${missing.join(', ')}`);
      return res.status(400).json({ 
        status: 'error', 
        message: `Project not complete - missing ${missing.join(' and ')}`,
        missingFiles: missing
      });
    }
    
    // Check for composite design
    const hasCompositeDesign = project.uploadedFiles.compositeDesign?.url;
    const hasOriginalDesign = project.uploadedFiles.design?.url;
    
    if (!hasCompositeDesign && hasOriginalDesign) {
      console.warn('⚠️ No composite design found for project - AR tracking may not work properly');
      console.log('💡 Composite design (design + QR code) is required for AR tracking');
    }
    
    // Log what files are available
    console.log('📊 Project files available:', {
      hasDesign: !!project.uploadedFiles?.design?.url,
      hasVideo: !!project.uploadedFiles?.video?.url,
      hasComposite: !!project.uploadedFiles?.compositeDesign?.url,
      hasMindTarget: !!project.uploadedFiles?.mindTarget?.url,
      compositeUrl: project.uploadedFiles?.compositeDesign?.url?.substring(0, 50) + '...',
      mindTargetUrl: project.uploadedFiles?.mindTarget?.url?.substring(0, 50) + '...'
    });
    
    // Process mindTarget URL to ensure raw binary download from Cloudinary
    let mindTargetUrl = project.uploadedFiles.mindTarget?.url || null;
    if (mindTargetUrl && mindTargetUrl.includes('cloudinary.com')) {
      // Add fl_attachment flag to force binary download without any transformations
      const urlParts = mindTargetUrl.split('/upload/');
      if (urlParts.length === 2) {
        mindTargetUrl = `${urlParts[0]}/upload/fl_attachment/${urlParts[1]}`;
        console.log('🔧 Modified .mind URL for raw binary download:', mindTargetUrl);
      }
    }
    
    // Use project-specific social links if available, otherwise fall back to user's global social links
    const socialLinks = project.socialLinks && Object.values(project.socialLinks).some(link => link) 
      ? project.socialLinks 
      : user.socialLinks || {};
    
    console.log('🔗 Social Links Debug:', {
      projectSocialLinks: project.socialLinks,
      userSocialLinks: user.socialLinks,
      finalSocialLinks: socialLinks,
      hasProjectSocialLinks: !!(project.socialLinks && Object.values(project.socialLinks).some(link => link))
    });
    
    const data = {
      userId: user._id.toString(),
      projectId,
      projectName: project.name,
      name: user.username,
      designUrl: project.uploadedFiles.compositeDesign?.url || project.uploadedFiles.design.url,
      compositeDesignUrl: project.uploadedFiles.compositeDesign?.url || null,
      originalDesignUrl: project.uploadedFiles.design?.url || null,
      videoUrl: project.uploadedFiles.video.url,
      mindTargetUrl: mindTargetUrl,
      socialLinks: socialLinks,
      designDimensions: project.uploadedFiles.design?.dimensions || null,
      qrPosition: project.qrPosition,
      arReady: !!project.uploadedFiles.mindTarget?.url,
      mindTargetGenerated: project.uploadedFiles.mindTarget?.generated || false,
      hasCompositeDesign: !!hasCompositeDesign,
      needsCompositeGeneration: !hasCompositeDesign && hasOriginalDesign,
      projectStatus: project.status,
      projectDescription: project.description
    };
    
    console.log('📤 Sending response with mindTargetUrl:', data.mindTargetUrl || 'null');
    
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('user/project data error:', err);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch project data' 
    });
  }
});

/**
 * GET /api/qr/generate/:userId
 * Generate QR code for a specific user
 * Returns QR code as base64 image or SVG
 */
router.get('/generate/:userId', validateUser, async (req, res) => {
  try {
    const { format = 'png', size = 200 } = req.query;
    const user = req.user;
    
    // Check if user has at least uploaded a design (video can be optional for QR generation)
    if (!user.uploadedFiles?.design?.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User must upload a design first'
      });
    }
    
    // Generate personalized URL - use scan route for AR experience with hash routing
    // Format: /ar/user/{userId}/project/{projectId}
    const currentProjectId = user.currentProject || 'default';
    const personalizedUrl = `${process.env.FRONTEND_URL}/#/ar/user/${user._id}/project/${currentProjectId}`;
    
    // Generate QR code using centralized function
    const qrCodeData = await generateQRCode(personalizedUrl, format, size);
    
    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeData);
    } else {
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
router.get('/my-qr', authenticateToken, async (req, res) => {
  try {
    const { format = 'png', size = 200 } = req.query;
    
    // Generate personalized URL - use scan route for AR experience with hash routing
    // Format: /ar/user/{userId}/project/{projectId}
    const user = await User.findById(req.user._id);
    const currentProjectId = user?.currentProject || 'default';
    const personalizedUrl = `${process.env.FRONTEND_URL}/#/ar/user/${req.user._id}/project/${currentProjectId}`;
    
    // Generate QR code using centralized function
    const qrCodeData = await generateQRCode(personalizedUrl, format, size);
    
    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.send(qrCodeData);
    } else {
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
    console.log(`🔍 Looking for project with ID: ${projectId}`);
    
    // Find user who owns this project
    const user = await User.findOne({ 'projects.id': projectId }).select('-password -email');
    console.log(`👤 Found user: ${user ? user.username : 'NOT FOUND'}`);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Find the specific project
    const project = user.projects.find(p => p.id === projectId);
    console.log(`📁 Found project: ${project ? project.name : 'NOT FOUND'}`);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Check if user has completed setup
    console.log(`🖼️ Design URL: ${user.uploadedFiles.design?.url || 'MISSING'}`);
    console.log(`🎬 Video URL: ${user.uploadedFiles.video?.url || 'MISSING'}`);
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Project not complete'
      });
    }
    
    // Return project-specific data for AR experience
    console.log(`✅ Returning project data for: ${project.name}`);
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
    
    // Generate project-specific URL - use project ID for specific AR experience with hash routing
    // Format: /ar/user/{userId}/project/{projectId}
    const personalizedUrl = `${process.env.FRONTEND_URL}/#/ar/user/${user._id}/project/${projectId}`;
    
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
    // Format: /ar/user/{userId}/project/{projectId}
    const currentProjectId = user.currentProject || 'default';
    const personalizedUrl = `${process.env.FRONTEND_URL}/#/ar/user/${user._id}/project/${currentProjectId}`;
    
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
