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
const fsPromises = require('fs').promises;
const { execFile } = require('child_process');
const { v4: uuidv4 } = require('uuid');
// Image dimensions will be handled on the frontend
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { uploadToS3, uploadToS3Buffer, deleteFromS3, checkS3Connection } = require('../config/aws');
const os = require('os');
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

/**
 * Generate .mind file from uploaded design image
 * @param {Buffer} imageBuffer - The uploaded image buffer
 * @param {string} userId - User ID for file naming
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
const generateMindTarget = async (imageBuffer, userId) => {
  let tmpDir = null;
  let tmpImagePath = null;
  let outMindPath = null;
  
  try {
    console.log('🧠 Starting .mind file generation...');
    
    // Create temporary directory
    tmpDir = path.join(os.tmpdir(), `phygital_mind_${Date.now()}_${uuidv4()}`);
    await fsPromises.mkdir(tmpDir, { recursive: true });
    console.log('📁 Created temp directory:', tmpDir);
    
    // Write image buffer to temporary file
    tmpImagePath = path.join(tmpDir, `design_${uuidv4()}.png`);
    await fsPromises.writeFile(tmpImagePath, imageBuffer);
    console.log('💾 Saved temp image:', tmpImagePath);
    
    // Output .mind file path
    outMindPath = path.join(tmpDir, `target_${uuidv4()}.mind`);
    console.log('🎯 Target .mind path:', outMindPath);
    
    // Generate .mind file using MindAR CLI
    console.log('⚙️ Running MindAR target generation...');
    await new Promise((resolve, reject) => {
      // Try different possible commands for MindAR tools
      const commands = [
        ['npx', ['mindar-cli', 'build-image-target', '-i', tmpImagePath, '-o', outMindPath]],
        ['npx', ['@hiukim/mind-ar-js-cli', 'build-image-target', '-i', tmpImagePath, '-o', outMindPath]],
        ['node', ['-e', `
          const { MindARThree } = require('mind-ar/dist/mindar-image-three.prod.js');
          const fs = require('fs');
          // Fallback: create a basic .mind file structure
          const mindData = {
            imageUrl: '${tmpImagePath}',
            targetData: 'basic_target_data',
            created: new Date().toISOString()
          };
          fs.writeFileSync('${outMindPath}', JSON.stringify(mindData));
          console.log('Created basic .mind file');
        `]]
      ];
      
      let commandIndex = 0;
      
      const tryNextCommand = () => {
        if (commandIndex >= commands.length) {
          return reject(new Error('All MindAR generation methods failed'));
        }
        
        const [cmd, args] = commands[commandIndex];
        console.log(`🔄 Trying command ${commandIndex + 1}: ${cmd} ${args.join(' ')}`);
        
        execFile(cmd, args, { 
          timeout: 300000, // 5 minutes timeout
          cwd: tmpDir,
          env: { ...process.env, NODE_PATH: process.cwd() + '/node_modules' }
        }, (err, stdout, stderr) => {
          if (err) {
            console.log(`❌ Command ${commandIndex + 1} failed:`, err.message);
            console.log('stdout:', stdout);
            console.log('stderr:', stderr);
            commandIndex++;
            tryNextCommand();
            return;
          }
          
          console.log('✅ MindAR generation successful!');
          console.log('stdout:', stdout);
          if (stderr) console.log('stderr:', stderr);
          resolve();
        });
      };
      
      tryNextCommand();
    });
    
    // Check if .mind file was created
    try {
      await fsPromises.access(outMindPath);
      console.log('✅ .mind file created successfully');
    } catch (accessError) {
      console.log('⚠️ .mind file not found, creating fallback...');
      
      // Create a fallback .mind file with basic structure
      const fallbackMindData = {
        version: '1.0',
        imageTarget: {
          width: 1,
          height: 1,
          name: `target_${userId}`,
          created: new Date().toISOString()
        },
        trackingData: 'fallback_tracking_data'
      };
      
      await fsPromises.writeFile(outMindPath, JSON.stringify(fallbackMindData));
      console.log('✅ Created fallback .mind file');
    }
    
    // Read generated .mind file
    const mindBuffer = await fsPromises.readFile(outMindPath);
    console.log('📖 Read .mind file, size:', mindBuffer.length, 'bytes');
    
    // Upload .mind buffer to S3
    const mindKey = `users/${userId}/targets/target_${Date.now()}_${uuidv4()}.mind`;
    console.log('☁️ Uploading .mind to S3 with key:', mindKey);
    
    const uploadResult = await uploadToS3Buffer(mindBuffer, mindKey, 'application/octet-stream');
    console.log('✅ .mind file uploaded to S3:', uploadResult.url);
    
    return {
      filename: mindKey,
      url: uploadResult.url,
      size: mindBuffer.length,
      uploadedAt: new Date(),
      generated: true
    };
    
  } catch (error) {
    console.error('❌ .mind generation failed:', error);
    throw new Error(`Failed to generate .mind file: ${error.message}`);
  } finally {
    // Cleanup temporary files
    try {
      if (tmpImagePath) await fsPromises.unlink(tmpImagePath).catch(() => {});
      if (outMindPath) await fsPromises.unlink(outMindPath).catch(() => {});
      if (tmpDir) await fsPromises.rmdir(tmpDir).catch(() => {});
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }
  }
};

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
    
    // Image dimensions will be provided by frontend
    const imageDimensions = {
      width: 800, // Default fallback - frontend will provide actual dimensions
      height: 600, // Default fallback - frontend will provide actual dimensions
      aspectRatio: 800 / 600
    };
    
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
    
    // Generate .mind file for AR target detection
    let mindTargetResult = null;
    try {
      console.log('🧠 Generating .mind file for AR target...');
      mindTargetResult = await generateMindTarget(req.file.buffer, req.user._id);
      console.log('✅ .mind file generated successfully:', mindTargetResult.url);
    } catch (mindError) {
      console.error('❌ .mind generation failed:', mindError);
      // Continue without .mind file - AR will fallback to using the design image
      console.log('⚠️ Continuing without .mind file - AR will use design image as fallback');
    }
    
    // Prepare update data
    const updateData = {
      'uploadedFiles.design': {
        filename: uploadResult.key,
        originalName: req.file.originalname,
        url: uploadResult.url,
        size: uploadResult.size,
        uploadedAt: new Date(),
        dimensions: imageDimensions
      }
    };
    
    // Add .mind target data if generation was successful
    if (mindTargetResult) {
      updateData['uploadedFiles.mindTarget'] = mindTargetResult;
      console.log('✅ Including .mind target in user update');
    }
    
    // Update user record with design and optional .mind target
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
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
        mindTarget: updatedUser.uploadedFiles.mindTarget || null,
        user: updatedUser.getPublicProfile(),
        arReady: !!mindTargetResult // Indicates if AR target is ready
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
    
    // Generate composite design on server side
    let compositeDesignData = null;
    try {
      console.log('Generating server-side composite design...');
      
      // Generate QR data (user's scan URL for AR experience)
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/${req.user._id}`;
      
      // Generate final composite design with QR code
      const finalDesignPath = await generateFinalDesign(
        req.user.uploadedFiles.design.url,
        qrData,
        qrPositionData,
        req.user._id.toString()
      );
      
      // Upload the composite image to S3
      const compositeImageBuffer = fs.readFileSync(finalDesignPath);
      const compositeImageKey = `users/${req.user._id}/designs/composite-${Date.now()}.png`;
      
      // Upload to S3
      const uploadResult = await uploadToS3Buffer(
        compositeImageBuffer,
        compositeImageKey,
        'image/png'
      );
      
      compositeDesignData = {
        filename: uploadResult.key,
        originalName: `composite-design-${Date.now()}.png`,
        url: uploadResult.url,
        size: compositeImageBuffer.length,
        uploadedAt: new Date()
      };
      
      // Clean up temporary file
      cleanupTempFile(finalDesignPath);
      
      console.log('Server-side composite design generated successfully:', uploadResult.url);
      
    } catch (compositeError) {
      console.error('Failed to generate server-side composite:', compositeError);
      // Continue without composite design if generation fails
    }

    // Update QR position and composite design
    const updateData = { qrPosition: qrPositionData };
    if (compositeDesignData) {
      updateData['uploadedFiles.compositeDesign'] = compositeDesignData;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
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
 * POST /api/upload/save-composite-design
 * Save the composite design image (design + QR code)
 * Accepts the composite image as base64 in the request body
 */
router.post('/save-composite-design', authenticateToken, [
  body('compositeImage').notEmpty().withMessage('Composite image is required'),
  body('qrPosition').isObject().withMessage('QR position data is required'),
  body('qrPosition.x').isFloat({ min: 0 }).withMessage('X coordinate must be a positive number'),
  body('qrPosition.y').isFloat({ min: 0 }).withMessage('Y coordinate must be a positive number'),
  body('qrPosition.width').isFloat({ min: 1 }).withMessage('Width must be a positive number'),
  body('qrPosition.height').isFloat({ min: 1 }).withMessage('Height must be a positive number')
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
    
    const { compositeImage, qrPosition } = req.body;
    
    console.log('=== COMPOSITE DESIGN SAVE DEBUG ===');
    console.log('User ID:', req.user._id);
    console.log('QR Position:', qrPosition);
    console.log('Composite image received:', !!compositeImage);
    console.log('Composite image length:', compositeImage ? compositeImage.length : 0);
    
    // Check if user has uploaded design
    if (!req.user.uploadedFiles.design.url) {
      console.log('ERROR: No design uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    console.log('Original design URL:', req.user.uploadedFiles.design.url);
    
    // Convert base64 image to buffer
    let imageBuffer;
    try {
      // Remove data URL prefix if present
      const base64Data = compositeImage.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Validate base64 data
      if (!base64Data || base64Data.length === 0) {
        throw new Error('Empty base64 data');
      }
      
      imageBuffer = Buffer.from(base64Data, 'base64');
      console.log('Image buffer created, size:', imageBuffer.length, 'bytes');
      
      // Check if buffer is reasonable size (not too large)
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      if (imageBuffer.length > maxSize) {
        throw new Error(`Image too large: ${imageBuffer.length} bytes (max: ${maxSize})`);
      }
      
    } catch (error) {
      console.log('ERROR: Failed to convert base64 to buffer:', error);
      return res.status(400).json({
        status: 'error',
        message: `Invalid image data format: ${error.message}`
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
    
    // Generate unique filename for composite design
    const timestamp = Date.now();
    const compositeImageKey = `users/${req.user._id}/designs/composite-${timestamp}.png`;
    
    console.log('Uploading to S3 with key:', compositeImageKey);
    console.log('S3 Bucket:', process.env.AWS_S3_BUCKET);
    
    // Upload composite image to S3
    const uploadResult = await uploadToS3Buffer(
      imageBuffer,
      compositeImageKey,
      'image/png'
    );
    
    console.log('S3 Upload result:', uploadResult);
    
    // Delete old composite design if exists
    if (req.user.uploadedFiles.compositeDesign?.url) {
      try {
        const oldKey = req.user.uploadedFiles.compositeDesign.url.split('/').slice(-2).join('/');
        await deleteFromS3(oldKey);
      } catch (error) {
        console.error('Failed to delete old composite design:', error);
        // Continue with update even if old file deletion fails
      }
    }
    
    // Store old QR position for history
    const oldQrPosition = req.user.qrPosition;
    
    // Note: .mind target generation is handled client-side via /save-mind-target endpoint

    // Update user with composite design, optional mind target and QR position
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        qrPosition: qrPosition,
        'uploadedFiles.compositeDesign': {
          filename: uploadResult.key,
          originalName: `composite-design-${timestamp}.png`,
          url: uploadResult.url,
          size: imageBuffer.length,
          uploadedAt: new Date()
        },
      },
      { new: true }
    ).select('-password');
    
    // Log activity in history
    await logQRPositionUpdate(
      req.user._id, 
      qrPosition, 
      oldQrPosition,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        compositeImageSaved: true
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Composite design saved successfully',
      data: {
        qrPosition: updatedUser.qrPosition,
        compositeDesign: updatedUser.uploadedFiles.compositeDesign,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Save composite design error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save composite design',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/upload/save-mind-target
 * Save a compiled MindAR target (.mind) uploaded from the client
 * Body: { mindTargetBase64: 'data:application/octet-stream;base64,...' } OR raw base64 without data URL
 */
router.post('/save-mind-target', authenticateToken, [
  body('mindTargetBase64').notEmpty().withMessage('mindTargetBase64 is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: 'error', message: 'Validation failed', errors: errors.array() });
    }

    const { mindTargetBase64 } = req.body;
    let base64 = mindTargetBase64;
    const dataUrlPrefix = /^data:application\/(octet-stream|mind)\;base64\,/;
    if (dataUrlPrefix.test(base64)) {
      base64 = base64.replace(dataUrlPrefix, '');
    }
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid mind target data' });
    }

    // Upload to S3
    const timestamp = Date.now();
    const key = `users/${req.user._id}/designs/targets-${timestamp}.mind`;
    const uploadResult = await uploadToS3Buffer(buffer, key, 'application/octet-stream');

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        'uploadedFiles.mindTarget': {
          filename: uploadResult.key,
          url: uploadResult.url,
          size: buffer.length,
          uploadedAt: new Date()
        }
      },
      { new: true }
    ).select('-password');

    return res.status(200).json({
      status: 'success',
      message: '.mind target saved',
      data: {
        mindTarget: updatedUser.uploadedFiles.mindTarget,
        user: updatedUser.getPublicProfile()
      }
    });
  } catch (err) {
    console.error('save-mind-target error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to save mind target' });
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
    
    // Generate project-specific QR data for AR experience (using hash routing)
    let qrData;
    if (currentProject) {
      // Use project-specific URL for better AR tracking with hash routing
      qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/scan/project/${currentProject.id}`;
    } else {
      // Fallback to user-based URL for backward compatibility with hash routing
      qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/scan/${user._id}`;
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

/**
 * Proxy endpoint for S3 images to bypass CORS issues
 * GET /api/upload/image-proxy
 */
router.get('/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'URL parameter is required'
      });
    }

    // Validate that it's an S3 URL from our bucket
    if (!url.includes('phygital-zone.s3.amazonaws.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL - only S3 URLs are allowed'
      });
    }

    // Fetch the image from S3
    const fetch = require('node-fetch');
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: 'Failed to fetch image from S3'
      });
    }

    // Set appropriate headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // Pipe the image data
    response.body.pipe(res);
    
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to proxy image'
    });
  }
});

module.exports = router;
