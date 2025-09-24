/**
 * Upload Routes
 * Handles file uploads for design images and videos
 * Integrates with AWS S3 for cloud storage
 * Supports video compression and QR position marking
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // For image processing and dimension extraction
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { uploadToS3, deleteFromS3, checkS3Connection } = require('../config/aws');
const { generateFinalDesign, cleanupTempFile } = require('../services/qrOverlayService');
const { 
  logDesignUpload, 
  logDesignUpdate, 
  logVideoUpload, 
  logQRPositionUpdate, 
  logSocialLinksUpdate,
  logFinalDesignGeneration,
  logFinalDesignDownload,
  logProjectDeletion
} = require('../services/historyService');

const router = express.Router();

// Configure multer for memory storage (for processing before S3 upload)
const memoryStorage = multer.memoryStorage();

// Project management routes
router.post('/project', authenticateToken, [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Project name must be 2-50 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, description } = req.body;
    const userId = req.user.id;

    // Check if project name already exists for this user
    const existingProject = await User.findOne({
      _id: userId,
      'projects.name': name
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: 'A project with this name already exists'
      });
    }

    // Create new project
    const newProject = {
      id: Date.now().toString(), // Simple ID generation
      name: name.trim(),
      description: description || `Phygital project: ${name.trim()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    // Add project to user
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $push: { projects: newProject },
        $set: { currentProject: newProject.id }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        project: newProject,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          projects: user.projects,
          currentProject: user.currentProject
        }
      }
    });

  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user projects
router.get('/projects', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('projects currentProject');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        projects: user.projects || [],
        currentProject: user.currentProject
      }
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'design') {
      // Allow only image files for design
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for design upload'), false);
      }
    } else if (file.fieldname === 'video') {
      // Allow only video files for video
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video upload'), false);
      }
    } else {
      cb(new Error('Invalid field name'), false);
    }
  }
});

/**
 * POST /api/upload/design
 * Upload design image file
 * Stores image in S3 and updates user record
 */
router.post('/design', authenticateToken, upload.single('design'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No design file uploaded'
      });
    }
    
    // Check S3 connection
    const s3Connected = await checkS3Connection();
    if (!s3Connected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    
    // Extract image dimensions using Sharp
    let imageDimensions = null;
    try {
      const metadata = await sharp(req.file.buffer).metadata();
      imageDimensions = {
        width: metadata.width,
        height: metadata.height,
        aspectRatio: metadata.width / metadata.height
      };
      console.log('📐 Extracted image dimensions:', imageDimensions);
    } catch (error) {
      console.error('Failed to extract image dimensions:', error);
      // Continue without dimensions if extraction fails
      imageDimensions = {
        width: 800, // Default fallback
        height: 600, // Default fallback
        aspectRatio: 800 / 600
      };
    }
    
    // Upload to S3
    const uploadResult = await uploadToS3(req.file, req.user._id, 'design');
    
    // Store old design data for history
    const oldDesign = req.user.uploadedFiles.design;
    const isUpdate = !!oldDesign.url;
    
    // Delete old design file if exists
    if (oldDesign.url) {
      try {
        const oldKey = oldDesign.url.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
      } catch (error) {
        console.error('Failed to delete old design file:', error);
        // Continue with update even if old file deletion fails
      }
    }
    
    // Update user record with dimensions
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        'uploadedFiles.design': {
          filename: uploadResult.key,
          originalName: req.file.originalname,
          url: uploadResult.url,
          size: uploadResult.size,
          uploadedAt: new Date(),
          dimensions: imageDimensions
        }
      },
      { new: true }
    ).select('-password');
    
    // Log activity in history
    const historyOptions = {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (isUpdate) {
      await logDesignUpdate(req.user._id, uploadResult, oldDesign, historyOptions);
    } else {
      await logDesignUpload(req.user._id, uploadResult, historyOptions);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Design uploaded successfully',
      data: {
        design: updatedUser.uploadedFiles.design,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Design upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload design',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/upload/video
 * Upload video file with optional compression
 * Stores video in S3 and updates user record
 */
router.post('/video', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No video file uploaded'
      });
    }
    
    // Check S3 connection
    const s3Connected = await checkS3Connection();
    if (!s3Connected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    
    // For now, we'll upload the video as-is
    // In production, you would implement video compression here
    // using ffmpeg or similar tools
    
    const uploadResult = await uploadToS3(req.file, req.user._id, 'video');
    
    // Delete old video file if exists
    if (req.user.uploadedFiles.video.url) {
      try {
        const oldKey = req.user.uploadedFiles.video.url.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
      } catch (error) {
        console.error('Failed to delete old video file:', error);
        // Continue with update even if old file deletion fails
      }
    }
    
    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        'uploadedFiles.video': {
          filename: uploadResult.key,
          originalName: req.file.originalname,
          url: uploadResult.url,
          size: uploadResult.size,
          duration: 0, // Would be calculated during compression
          uploadedAt: new Date(),
          compressed: false // Set to true after compression
        }
      },
      { new: true }
    ).select('-password');

    // Get current project information
    const currentProject = updatedUser.projects?.find(p => p.id === updatedUser.currentProject);
    const projectData = currentProject ? {
      id: currentProject.id,
      name: currentProject.name,
      description: currentProject.description
    } : null;

    // Log video upload activity
    await logVideoUpload(req.user._id, {
      filename: uploadResult.key,
      originalName: req.file.originalname,
      size: uploadResult.size,
      mimetype: req.file.mimetype,
      url: uploadResult.url
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, projectData);
    
    res.status(200).json({
      status: 'success',
      message: 'Video uploaded successfully',
      data: {
        video: updatedUser.uploadedFiles.video,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/upload/video/:userId
 * Re-upload/replace video file
 * Allows users to update their video content
 */
router.put('/video/:userId', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    // Verify user can only update their own video
    if (req.params.userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to update this video'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No video file uploaded'
      });
    }
    
    // Check S3 connection
    const s3Connected = await checkS3Connection();
    if (!s3Connected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    
    // Upload new video to S3
    const uploadResult = await uploadToS3(req.file, req.user._id, 'video');
    
    // Delete old video file
    if (req.user.uploadedFiles.video.url) {
      try {
        const oldKey = req.user.uploadedFiles.video.url.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
      } catch (error) {
        console.error('Failed to delete old video file:', error);
      }
    }
    
    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        'uploadedFiles.video': {
          filename: uploadResult.key,
          originalName: req.file.originalname,
          url: uploadResult.url,
          size: uploadResult.size,
          duration: 0, // Would be calculated during compression
          uploadedAt: new Date(),
          compressed: false
        }
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json({
      status: 'success',
      message: 'Video updated successfully',
      data: {
        video: updatedUser.uploadedFiles.video,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Video update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update video',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/upload/project/:projectId/video
 * Update video for a specific project
 * Allows users to update video content for existing projects
 */
router.put('/project/:projectId/video', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }
    
    // Find user and project
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Upload video to S3
    const uploadResult = await uploadToS3(req.file, userId, 'video');
    
    // Update user's video
    user.uploadedFiles.video = {
      filename: uploadResult.key.split('/').pop(), // Extract filename from S3 key
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: uploadResult.url
    };
    
    // Update project's updatedAt timestamp
    project.updatedAt = new Date();
    
    await user.save();
    
    // Log video update activity
    await logVideoUpload(userId, {
      filename: uploadResult.key.split('/').pop(),
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: uploadResult.url
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, {
      id: project.id,
      name: project.name,
      description: project.description
    });
    
    res.json({
      success: true,
      message: 'Video updated successfully',
      data: {
        video: user.uploadedFiles.video,
        project: {
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt
        }
      }
    });
    
  } catch (error) {
    console.error('Error updating project video:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/upload/qr-position
 * Set QR code position on the design
 * Stores coordinates where QR code should be placed
 */
router.post('/qr-position', authenticateToken, [
  body('x').isFloat({ min: 0 }).withMessage('X coordinate must be a positive number'),
  body('y').isFloat({ min: 0 }).withMessage('Y coordinate must be a positive number'),
  body('width').isFloat({ min: 1 }).withMessage('Width must be a positive number'),
  body('height').isFloat({ min: 1 }).withMessage('Height must be a positive number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { x, y, width, height } = req.body;
    
    // Ensure values are numbers
    const qrPositionData = {
      x: parseFloat(x),
      y: parseFloat(y),
      width: parseFloat(width),
      height: parseFloat(height)
    };
    
    // Check if user has uploaded a design
    if (!req.user.uploadedFiles.design.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    // Store old QR position for history
    const oldQrPosition = req.user.qrPosition;
    
    // Update QR position
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        qrPosition: qrPositionData
      },
      { new: true }
    ).select('-password');
    
    // Log activity in history
    await logQRPositionUpdate(
      req.user._id, 
      qrPositionData, 
      oldQrPosition,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'QR position updated successfully',
      data: {
        qrPosition: updatedUser.qrPosition,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('QR position update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update QR position',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/upload/social-links
 * Update social media links
 * Stores user's social media profiles
 */
router.post('/social-links', authenticateToken, [
  body('instagram').optional().isString().withMessage('Instagram must be a string'),
  body('facebook').optional().isString().withMessage('Facebook must be a string'),
  body('twitter').optional().isString().withMessage('Twitter must be a string'),
  body('linkedin').optional().isString().withMessage('LinkedIn must be a string'),
  body('website').optional().isString().withMessage('Website must be a string')
], async (req, res) => {
  try {
    console.log('Social links request body:', req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Social links validation errors:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { instagram, facebook, twitter, linkedin, website } = req.body;
    
    // Store old social links for history
    const oldSocialLinks = req.user.socialLinks;
    const newSocialLinks = {
      instagram: instagram || '',
      facebook: facebook || '',
      twitter: twitter || '',
      linkedin: linkedin || '',
      website: website || ''
    };
    
    // Update social links
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        socialLinks: newSocialLinks
      },
      { new: true }
    ).select('-password');
    
    // Log activity in history
    await logSocialLinksUpdate(
      req.user._id,
      newSocialLinks,
      oldSocialLinks,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Social links updated successfully',
      data: {
        socialLinks: updatedUser.socialLinks,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Social links update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update social links',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/upload/status
 * Get upload status for current user
 * Returns information about uploaded files and setup progress
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const uploadStatus = {
      design: {
        uploaded: !!user.uploadedFiles.design.url,
        url: user.uploadedFiles.design.url,
        filename: user.uploadedFiles.design.filename,
        size: user.uploadedFiles.design.size,
        uploadedAt: user.uploadedFiles.design.uploadedAt
      },
      video: {
        uploaded: !!user.uploadedFiles.video.url,
        url: user.uploadedFiles.video.url,
        filename: user.uploadedFiles.video.filename,
        size: user.uploadedFiles.video.size,
        uploadedAt: user.uploadedFiles.video.uploadedAt,
        compressed: user.uploadedFiles.video.compressed
      },
      qrPosition: user.qrPosition,
      socialLinks: user.socialLinks,
      setupComplete: !!(user.uploadedFiles.design.url && user.uploadedFiles.video.url)
    };
    
    res.status(200).json({
      status: 'success',
      data: uploadStatus
    });
    
  } catch (error) {
    console.error('Upload status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get upload status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/upload/download-final-design
 * Download the final design with QR code overlaid
 * Generates the final image and returns it as a download
 */
router.get('/download-final-design', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has uploaded design and set QR position
    if (!user.uploadedFiles.design.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    if (!user.qrPosition || (user.qrPosition.x === undefined && user.qrPosition.y === undefined)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please set QR code position first'
      });
    }
    
    // Get current project information
    const currentProject = user.projects?.find(p => p.id === user.currentProject);
    
    // Generate project-specific QR data for AR experience
    let qrData;
    if (currentProject) {
      // Use project-specific URL for better AR tracking
      qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/project/${currentProject.id}`;
    } else {
      // Fallback to user-based URL for backward compatibility
      qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/${user._id}`;
    }
    
    // Generate final design with QR code
    const finalDesignPath = await generateFinalDesign(
      user.uploadedFiles.design.url,
      qrData,
      user.qrPosition,
      user._id.toString()
    );
    const projectData = currentProject ? {
      id: currentProject.id,
      name: currentProject.name,
      description: currentProject.description
    } : null;

    // Log final design generation
    await logFinalDesignGeneration(
      user._id,
      qrData,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      projectData
    );
    
    // Set response headers for download
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="phygital-design-${user.username}.png"`);
    
    // Stream the file to response
    const fileStream = fs.createReadStream(finalDesignPath);
    fileStream.pipe(res);
    
    // Log download and clean up temporary file after streaming
    fileStream.on('end', () => {
      // Log download activity
      logFinalDesignDownload(
        user._id,
        `phygital-design-${user.username}.png`,
        {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        },
        projectData
      );
      
      cleanupTempFile(finalDesignPath);
    });
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      cleanupTempFile(finalDesignPath);
      res.status(500).json({
        status: 'error',
        message: 'Failed to download final design'
      });
    });
    
  } catch (error) {
    console.error('Download final design error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate final design',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/upload/preview-final-design
 * Get a preview of the final design with QR code (as base64)
 * Useful for showing preview in frontend without downloading
 */
router.get('/preview-final-design', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has uploaded design and set QR position
    if (!user.uploadedFiles.design.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    if (!user.qrPosition || (user.qrPosition.x === undefined && user.qrPosition.y === undefined)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please set QR code position first'
      });
    }
    
    // Generate QR data (user's scan URL for AR experience)
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/${user._id}`;
    
    // Generate final design with QR code
    const finalDesignPath = await generateFinalDesign(
      user.uploadedFiles.design.url,
      qrData,
      user.qrPosition,
      user._id.toString()
    );
    
    // Get current project information
    const currentProject = user.projects?.find(p => p.id === user.currentProject);
    const projectData = currentProject ? {
      id: currentProject.id,
      name: currentProject.name,
      description: currentProject.description
    } : null;

    // Log final design generation (preview)
    await logFinalDesignGeneration(
      user._id,
      qrData,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        isPreview: true
      },
      projectData
    );
    
    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(finalDesignPath);
    const base64Image = imageBuffer.toString('base64');
    const dataURL = `data:image/png;base64,${base64Image}`;
    
    // Clean up temporary file
    cleanupTempFile(finalDesignPath);
    
    res.status(200).json({
      status: 'success',
      data: {
        preview: dataURL,
        qrData: qrData
      }
    });
    
  } catch (error) {
    console.error('Preview final design error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate preview',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/upload/project/:projectId
 * Delete a project and all its associated files
 * Removes project from database and files from S3
 */
router.delete('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    // Find user and project
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const projectIndex = user.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    const project = user.projects[projectIndex];
    
    // Delete files from S3 if they exist
    const filesToDelete = [];
    
    // Helper function to extract S3 key from URL
    const extractS3Key = (url) => {
      try {
        if (!url) return null;
        
        // For S3 URLs: https://bucket.s3.region.amazonaws.com/users/userId/type/filename
        // We need to extract: users/userId/type/filename
        const urlParts = url.split('/');
        
        // Find the index of 'users' in the URL
        const usersIndex = urlParts.findIndex(part => part === 'users');
        if (usersIndex !== -1) {
          // Extract everything from 'users' onwards
          return urlParts.slice(usersIndex).join('/');
        }
        
        // Fallback: if it's a local URL, extract the path after the domain
        const domainIndex = urlParts.findIndex(part => part.includes('localhost') || part.includes('127.0.0.1'));
        if (domainIndex !== -1 && domainIndex + 1 < urlParts.length) {
          return urlParts.slice(domainIndex + 1).join('/');
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting S3 key from URL:', url, error);
        return null;
      }
    };
    
    // Check for design file
    if (user.uploadedFiles.design?.url) {
      const designKey = extractS3Key(user.uploadedFiles.design.url);
      if (designKey) {
        filesToDelete.push(designKey);
        console.log('Design file to delete:', designKey);
      }
    }
    
    // Check for video file
    if (user.uploadedFiles.video?.url) {
      const videoKey = extractS3Key(user.uploadedFiles.video.url);
      if (videoKey) {
        filesToDelete.push(videoKey);
        console.log('Video file to delete:', videoKey);
      }
    }
    
    // Delete files from S3
    console.log(`Attempting to delete ${filesToDelete.length} files from S3:`, filesToDelete);
    for (const key of filesToDelete) {
      try {
        console.log(`Deleting file from S3: ${key}`);
        const deleteResult = await deleteFromS3(key);
        console.log(`Successfully deleted file from S3: ${key}`, deleteResult);
      } catch (error) {
        console.error(`Failed to delete file from S3: ${key}`, error);
        // Continue with deletion even if S3 deletion fails
      }
    }
    
    // Remove project from user's projects array
    user.projects.splice(projectIndex, 1);
    
    // If this was the current project, clear it
    if (user.currentProject === projectId) {
      user.currentProject = null;
    }
    
    // Clear uploaded files if this was the only project
    if (user.projects.length === 0) {
      user.uploadedFiles = {
        design: { url: null },
        video: { url: null }
      };
      user.qrPosition = null;
      user.socialLinks = {};
    }
    
    await user.save();
    
    // Log project deletion activity
    await logProjectDeletion(userId, {
      projectId: project.id,
      projectName: project.name,
      deletedFiles: filesToDelete
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
      data: {
        deletedProject: {
          id: project.id,
          name: project.name
        },
        deletedFiles: filesToDelete.length
      }
    });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
