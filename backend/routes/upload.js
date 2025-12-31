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
const uuid = uuidv4; // Alias for clarity
// Image dimensions will be handled on the frontend
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { authenticateToken } = require('../middleware/auth');
const { uploadToCloudinary, uploadToCloudinaryBuffer, uploadVideoToCloudinary, deleteFromCloudinary, checkCloudinaryConnection } = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
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
const ARExperience = require('../models/ARExperience');

const router = express.Router();

// Configure multer for memory storage (for processing before S3 upload)
const memoryStorage = multer.memoryStorage();

// Helper function to extract Cloudinary public_id from URL
const extractCloudinaryPublicId = (url) => {
  try {
    if (!url) return null;
    
    // For Cloudinary URLs: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/phygital-zone/users/userId/type/filename
    // Or: https://res.cloudinary.com/cloud_name/raw/upload/v1234567890/phygital-zone/users/userId/type/filename.ext
    // We need to extract the public_id: phygital-zone/users/userId/type/filename (without extension)
    if (url.includes('cloudinary.com')) {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
        // Extract everything after 'upload/v1234567890/'
        let publicId = urlParts.slice(uploadIndex + 2).join('/');
        
        // Remove query parameters if any (e.g., ?v=123)
        if (publicId.includes('?')) {
          publicId = publicId.split('?')[0];
        }
        
        // Remove file extension(s) - handle cases like 'file.png.png' or 'file.mind' or 'file.pdf'
        const parts = publicId.split('.');
        if (parts.length > 1) {
          publicId = parts.slice(0, -1).join('.');
          // If it still ends with a common image extension, remove it again
          const commonImageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
          const lastPart = parts[parts.length - 1].toLowerCase();
          if (commonImageExts.includes(`.${lastPart}`)) {
            const remainingParts = publicId.split('.');
            if (remainingParts.length > 1) {
              publicId = remainingParts.slice(0, -1).join('.');
            }
          }
        }
        
        return publicId;
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting Cloudinary public_id:', error);
    return null;
  }
};

/**
 * Generate composite image (design + QR code) and upload to Cloudinary
 * @param {String} designUrl - URL of the uploaded design image
 * @param {String} userId - User ID for file naming
 * @param {Object} qrPosition - QR code position data
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
const generateCompositeImage = async (designUrl, userId, qrPosition) => {
  let tempCompositePath = null;
  
  try {
    console.log('🎨 Starting composite image generation...');
    console.log('📋 Parameters:', { designUrl, userId, qrPosition });
    
    // Generate personalized URL for QR code
    // Format: /ar/user/{userId}/project/{projectId}
    const user = await User.findById(userId);
    const currentProjectId = user?.currentProject || 'default';
    const personalizedUrl = `${process.env.FRONTEND_URL}/#/ar/user/${userId}/project/${currentProjectId}`;
    console.log('🔗 Personalized URL:', personalizedUrl);
    
    // Generate composite image using existing service
    console.log('🖼️ Generating composite image with QR code...');
    tempCompositePath = await generateFinalDesign(designUrl, personalizedUrl, qrPosition, userId);
    console.log('✅ Composite image generated:', tempCompositePath);
    
    // Read the composite image file
    const compositeBuffer = await fsPromises.readFile(tempCompositePath);
    console.log('📖 Composite image buffer size:', compositeBuffer.length, 'bytes');
    
    // Detect the image format from the temp file extension to preserve original format
    const tempExtension = path.extname(tempCompositePath).toLowerCase();
    const imageFormat = tempExtension === '.jpeg' || tempExtension === '.jpg' ? 'jpg' : 
                        tempExtension === '.png' ? 'png' : 'jpg';
    const mimeType = imageFormat === 'jpg' ? 'image/jpeg' : 'image/png';
    
    // Generate unique filename for composite image with correct extension
    const compositeFilename = `composite-${Date.now()}-${uuidv4()}.${imageFormat}`;
    console.log('📁 Composite filename:', compositeFilename, `(format: ${imageFormat})`);
    
    // Upload composite image to Cloudinary in composite-image folder
    console.log('☁️ Uploading composite image to Cloudinary with maximum quality...');
    const uploadResult = await uploadToCloudinaryBuffer(
      compositeBuffer, 
      userId, 
      'composite-image', // New folder for composite images
      compositeFilename, 
      mimeType,
      { quality: 100 } // Maximum quality, no compression
    );
    
    console.log('✅ Composite image uploaded to Cloudinary:', uploadResult.url);
    
    return {
      filename: uploadResult.public_id,
      url: uploadResult.url,
      size: compositeBuffer.length,
      uploadedAt: new Date(),
      generated: true,
      folder: 'composite-image'
    };
    
  } catch (error) {
    console.error('❌ Composite image generation failed:', error);
    throw new Error(`Failed to generate composite image: ${error.message}`);
  } finally {
    // Clean up temporary composite file
    if (tempCompositePath && fs.existsSync(tempCompositePath)) {
      try {
        fs.unlinkSync(tempCompositePath);
        console.log('🧹 Cleaned up temporary composite file');
      } catch (cleanupError) {
        console.error('⚠️ Failed to clean up temporary composite file:', cleanupError);
      }
    }
  }
};

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
          const fs = require('fs');
          const path = require('path');
          
          // Create a basic .mind file structure without external dependencies
          const mindData = {
            imageUrl: '${tmpImagePath}',
            targetData: 'basic_target_data',
            created: new Date().toISOString(),
            version: '1.0',
            type: 'image_target'
          };
          
          try {
            fs.writeFileSync('${outMindPath}', JSON.stringify(mindData, null, 2));
            console.log('✅ Created basic .mind file without external dependencies');
          } catch (error) {
            console.error('❌ Failed to create .mind file:', error.message);
            process.exit(1);
          }
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
    
    // Upload .mind buffer to Cloudinary
    const mindFilename = `target_${Date.now()}_${uuidv4()}.mind`;
    console.log('☁️ Uploading .mind to Cloudinary with filename:', mindFilename);
    
    const uploadResult = await uploadToCloudinaryBuffer(mindBuffer, userId, 'targets', mindFilename, 'application/octet-stream');
    console.log('✅ .mind file uploaded to Cloudinary:', uploadResult.url);
    
    return {
      filename: uploadResult.public_id,
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
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Project name must be 2-60 characters'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Description must be less than 200 characters'),
  body('campaignType').optional().isString(),
  body('phygitalizedData').optional().isObject()
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

    const { name, description, campaignType, phygitalizedData } = req.body;
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

    // Get user to generate unique project urlCode
    const userForCode = await User.findById(userId);
    if (!userForCode) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique urlCode for the project
    const { generateUniqueProjectCode } = require('../utils/urlCodeGenerator');
    let projectUrlCode;
    try {
      projectUrlCode = await generateUniqueProjectCode(userForCode);
    } catch (error) {
      console.error('Error generating project urlCode:', error);
      // Continue without urlCode - migration script can handle it later
    }

    // Create new project
    const newProject = {
      id: Date.now().toString(), // Simple ID generation
      urlCode: projectUrlCode,
      name: name.trim(),
      description: description || `Phygital project: ${name.trim()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    // Add Phygitalized-specific fields if provided
    if (campaignType) {
      newProject.campaignType = campaignType;
    }

    // Add Phygitalized data if provided
    if (phygitalizedData) {
      newProject.phygitalizedData = phygitalizedData;
      
      // Store file URLs in uploadedFiles if provided
      if (phygitalizedData.fileUrls) {
        newProject.uploadedFiles = {};
        if (phygitalizedData.fileUrls.video) {
          newProject.uploadedFiles.video = phygitalizedData.fileUrls.video;
        }
        if (phygitalizedData.fileUrls.pdf) {
          newProject.uploadedFiles.pdf = phygitalizedData.fileUrls.pdf;
        }
        if (phygitalizedData.fileUrls.document) {
          newProject.uploadedFiles.document = phygitalizedData.fileUrls.document;
        }
      }
    }

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

/**
 * PUT /api/upload/project/:projectId
 * Update project data (name, description, phygitalizedData, etc.)
 */
router.put('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    console.log('📝 Updating project:', {
      projectId,
      userId,
      hasPhygitalizedData: !!updateData.phygitalizedData,
      updateKeys: Object.keys(updateData)
    });

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

    // Build update object
    const updateFields = {};

    // Update name if provided
    if (updateData.name) {
      updateFields[`projects.${projectIndex}.name`] = updateData.name;
    }

    // Update description if provided
    if (updateData.description !== undefined) {
      updateFields[`projects.${projectIndex}.description`] = updateData.description;
    }

    // Update campaign type if provided
    if (updateData.campaignType) {
      updateFields[`projects.${projectIndex}.campaignType`] = updateData.campaignType;
    }

    // Update phygitalized data if provided
    if (updateData.phygitalizedData) {
      // Merge with existing phygitalizedData
      const existingPhygitalizedData = user.projects[projectIndex].phygitalizedData || {};
      updateFields[`projects.${projectIndex}.phygitalizedData`] = {
        ...existingPhygitalizedData,
        ...updateData.phygitalizedData
      };
    }

    // Update the project
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      });
    }

    const updatedProject = updatedUser.projects.find(p => p.id === projectId);

    console.log('✅ Project updated successfully:', {
      projectId,
      projectName: updatedProject?.name
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project: updatedProject
      }
    });

  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// Update project social links
router.put('/projects/:projectId/social-links', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.params;
    const socialLinks = req.body?.socialLinks || {};

    console.log('🔄 BACKEND: Social links update request received');
    console.log('📨 Request details:', {
      userId,
      projectId,
      socialLinks,
      fullUrl: req.originalUrl,
      method: req.method,
      headers: req.headers.authorization ? 'Auth present' : 'No auth'
    });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.socialLinks = { ...(project.socialLinks || {}), ...socialLinks };
    project.updatedAt = new Date();

    await user.save();

    console.log('📤 Sending response:', {
      success: true,
      message: 'Project social links updated',
      projectData: {
        id: project.id,
        name: project.name,
        socialLinks: project.socialLinks
      }
    });

    return res.json({
      success: true,
      message: 'Project social links updated',
      data: { project }
    });
  } catch (error) {
    console.error('Error updating project social links:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
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

// Multer configuration for document uploads (multiple files, 10MB per file)
const uploadDocuments = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per file
  },
  fileFilter: function (req, file, cb) {
    // Allow PDF, Word docs, images, text files, spreadsheets, and presentations
    const allowedMimes = [
      // PDFs
      'application/pdf',
      // Word Documents
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Images
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
      // Text Files
      'text/plain',
      'application/rtf',
      // Spreadsheets
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      // Presentations
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|txt|rtf|png|jpg|jpeg|gif|webp|bmp|svg|xls|xlsx|csv|ppt|pptx)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, images (PNG, JPG, GIF, WEBP, BMP, SVG), text files (TXT, RTF), spreadsheets (XLS, XLSX, CSV), and presentations (PPT, PPTX) are allowed.'), false);
    }
  }
});

const uploadVideos = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit per video (default for general uploads)
    files: 5 // Allow up to 5 videos
  },
  fileFilter: function (req, file, cb) {
    // Allow video files
    if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, WEBM, MKV, FLV, WMV) are allowed.'), false);
    }
  }
});

// Multer configuration for QR Links Video campaigns (50MB limit per video)
const uploadVideosQRLinks = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit per video for QR Links campaigns
    files: 5 // Allow up to 5 videos
  },
  fileFilter: function (req, file, cb) {
    // Allow video files
    if (file.mimetype.startsWith('video/') || file.originalname.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files (MP4, MOV, AVI, WEBM, MKV, FLV, WMV) are allowed.'), false);
    }
  }
});

/**
 * POST /api/upload/generate-composite
 * Generate composite image for existing user
 * Creates composite image from existing design and QR code
 */
router.post('/generate-composite', authenticateToken, async (req, res) => {
  try {
    console.log('=== COMPOSITE GENERATION DEBUG ===');
    console.log('User ID:', req.user._id);
    console.log('User uploaded files:', req.user.uploadedFiles);
    
    // Check if user has a design
    if (!req.user.uploadedFiles?.design?.url) {
      return res.status(400).json({
        success: false,
        message: 'User must upload a design first'
      });
    }
    
    // Get QR position from request body or user data
    let qrPosition = req.body.qrPosition || req.user.qrPosition;
    
    // Handle Mongoose document and null values
    if (!qrPosition || qrPosition === null || qrPosition === undefined || (typeof qrPosition === 'object' && Object.keys(qrPosition).length === 0)) {
      qrPosition = {
        x: 50,
        y: 50,
        width: 200,
        height: 200
      };
      console.log('📋 Using default QR position:', qrPosition);
    } else {
      // Convert Mongoose document to plain object if needed
      if (qrPosition.toObject) {
        qrPosition = qrPosition.toObject();
      }
      console.log('📋 Using provided QR position:', qrPosition);
    }
    
    console.log('QR position:', qrPosition);
    
    // Generate composite image
    let compositeResult = null;
    try {
      console.log('🎨 Generating composite image...');
      compositeResult = await generateCompositeImage(
        req.user.uploadedFiles.design.url, 
        req.user._id, 
        qrPosition
      );
      console.log('✅ Composite image generated:', compositeResult.url);
    } catch (compositeError) {
      console.error('❌ Composite generation failed:', compositeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate composite image',
        error: compositeError.message
      });
    }
    
    // Generate .mind file from composite image
    let mindTargetResult = null;
    try {
      console.log('🧠 Generating .mind file from composite image...');
      
      // Download composite image buffer for .mind generation
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = new URL(compositeResult.url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const compositeBuffer = await new Promise((resolve, reject) => {
        const request = client.get(compositeResult.url, (response) => {
          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to download composite image: ${response.statusCode}`));
          }
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
        request.on('error', reject);
        request.setTimeout(60000, () => {
          request.destroy();
          reject(new Error('Composite image download timeout'));
        });
      });
      
      console.log('📥 Downloaded composite image buffer:', compositeBuffer.length, 'bytes');
      
      // Generate .mind file from composite image buffer
      mindTargetResult = await generateMindTarget(compositeBuffer, req.user._id);
      console.log('✅ .mind file generated successfully from composite image:', mindTargetResult.url);
    } catch (mindError) {
      console.error('❌ .mind generation failed:', mindError);
      console.log('⚠️ Continuing without .mind file - AR will use composite image as fallback');
    }
    
    // Update user record with composite design and .mind file
    const updateData = {
      'uploadedFiles.compositeDesign': compositeResult
    };
    
    if (mindTargetResult) {
      updateData['uploadedFiles.mindTarget'] = mindTargetResult;
    }
    
    try {
      await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      );
      console.log('✅ User record updated with composite design and .mind file');
    } catch (updateError) {
      console.error('❌ Failed to update user record:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user record'
      });
    }
    
    res.json({
      success: true,
      message: 'Composite image and .mind file generated successfully',
      data: {
        compositeDesign: compositeResult,
        mindTarget: mindTargetResult,
        designUrl: req.user.uploadedFiles.design.url,
        qrPosition: qrPosition,
        arReady: !!mindTargetResult
      }
    });
    
  } catch (error) {
    console.error('Composite generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/upload/design
 * Upload design image file
 * Stores image in S3 and updates user record
 */
router.post('/design', authenticateToken, upload.single('design'), async (req, res) => {
  try {
    console.log('=== DESIGN UPLOAD DEBUG ===');
    console.log('User ID:', req.user._id);
    console.log('File received:', !!req.file);
    console.log('File details:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      fieldname: req.file.fieldname
    } : 'No file');
    
    // Check if file was uploaded
    if (!req.file) {
      console.log('ERROR: No file uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'No design file uploaded'
      });
    }
    
    // Check Cloudinary connection
    console.log('Checking Cloudinary connection...');
    const cloudinaryConnected = await checkCloudinaryConnection();
    if (!cloudinaryConnected) {
      console.log('ERROR: Cloudinary connection failed');
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    console.log('✅ Cloudinary connection successful');
    
    // Image dimensions will be provided by frontend
    const imageDimensions = {
      width: 800, // Default fallback - frontend will provide actual dimensions
      height: 600, // Default fallback - frontend will provide actual dimensions
      aspectRatio: 800 / 600
    };
    
    // Upload to Cloudinary
    console.log('Starting Cloudinary upload...');
    console.log('Upload parameters:', {
      userId: req.user._id,
      fieldName: 'design',
      fileSize: req.file.size,
      mimetype: req.file.mimetype
    });
    
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(req.file, req.user._id, 'design');
      console.log('✅ Cloudinary upload successful:', uploadResult.url);
    } catch (uploadError) {
      console.error('❌ Cloudinary upload failed:', uploadError);
      console.error('Upload error details:', {
        message: uploadError.message,
        stack: uploadError.stack,
        userId: req.user._id,
        fileSize: req.file.size
      });
      throw new Error(`Cloudinary upload failed: ${uploadError.message}`);
    }
    
    // Get the current user with full data
    const user = await User.findById(req.user._id);
    
    // Determine where to store the design (in project or at root level)
    let currentProject = null;
    let projectIndex = -1;
    
    if (user.currentProject) {
      projectIndex = user.projects.findIndex(p => p.id === user.currentProject);
      if (projectIndex !== -1) {
        currentProject = user.projects[projectIndex];
        console.log(`📁 Storing design in project: ${currentProject.name} (${currentProject.id})`);
      }
    }
    
    // Store old design data for history
    const oldDesign = currentProject 
      ? currentProject.uploadedFiles?.design 
      : req.user.uploadedFiles?.design;
    const isUpdate = !!oldDesign?.url;
    
    // Delete old design file if exists
    if (oldDesign?.url) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = oldDesign.url.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0]; // Remove file extension
        await deleteFromCloudinary(publicId);
        console.log('✅ Old design file deleted from Cloudinary');
      } catch (error) {
        console.error('Failed to delete old design file:', error);
        // Continue with update even if old file deletion fails
      }
    }
    
    // Generate composite image (design + QR code) for AR tracking
    let compositeResult = null;
    try {
      console.log('🎨 Generating composite image (design + QR code)...');
      
      // Get QR position from user data or use default
      let qrPosition = req.user.qrPosition;
      
      // Handle Mongoose document and null values
      if (!qrPosition || qrPosition === null || qrPosition === undefined || (typeof qrPosition === 'object' && Object.keys(qrPosition).length === 0)) {
        qrPosition = {
          x: 50,
          y: 50,
          width: 200,
          height: 200
        };
        console.log('📋 Using default QR position:', qrPosition);
      } else {
        // Convert Mongoose document to plain object if needed
        if (qrPosition.toObject) {
          qrPosition = qrPosition.toObject();
        }
        console.log('📋 Using user QR position:', qrPosition);
      }
      
      console.log('📋 QR position data:', qrPosition);
      
      compositeResult = await generateCompositeImage(uploadResult.url, req.user._id, qrPosition);
      console.log('✅ Composite image generated successfully:', compositeResult.url);
    } catch (compositeError) {
      console.error('❌ Composite image generation failed:', compositeError);
      console.error('Composite generation error details:', {
        message: compositeError.message,
        stack: compositeError.stack,
        designUrl: uploadResult.url
      });
      // Continue without composite image - AR will use original design
      console.log('⚠️ Continuing without composite image - AR will use original design as fallback');
    }
    
    // Generate .mind file for AR target detection
    let mindTargetResult = null;
    
    // Only generate .mind file if we have a composite image
    if (compositeResult) {
      try {
        console.log('🧠 Generating .mind file from composite image for AR target...');
        console.log('Mind target generation parameters:', {
          compositeUrl: compositeResult.url,
          userId: req.user._id
        });
        
        // Download composite image buffer for .mind generation
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const parsedUrl = new URL(compositeResult.url);
        const client = parsedUrl.protocol === 'https:' ? https : http;
        
        const compositeBuffer = await new Promise((resolve, reject) => {
          const request = client.get(compositeResult.url, (response) => {
            if (response.statusCode !== 200) {
              return reject(new Error(`Failed to download composite image: ${response.statusCode}`));
            }
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          });
          request.on('error', reject);
          request.setTimeout(60000, () => {
            request.destroy();
            reject(new Error('Composite image download timeout'));
          });
        });
        
        console.log('📥 Downloaded composite image buffer:', compositeBuffer.length, 'bytes');
        
        // Generate .mind file from composite image buffer
        mindTargetResult = await generateMindTarget(compositeBuffer, req.user._id);
        console.log('✅ .mind file generated successfully from composite image:', mindTargetResult.url);
      } catch (mindError) {
        console.error('❌ .mind generation failed:', mindError);
        console.error('Mind generation error details:', {
          message: mindError.message,
          stack: mindError.stack,
          compositeUrl: compositeResult.url
        });
        // Continue without .mind file - AR will fallback to using the composite image
        console.log('⚠️ Continuing without .mind file - AR will use composite image as fallback');
      }
    } else {
      console.log('⚠️ No composite image available - skipping .mind file generation');
      console.log('💡 .mind file should be generated from composite image (design + QR code)');
    }
    
    // Prepare design data
    const designData = {
      filename: uploadResult.key,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size,
      uploadedAt: new Date(),
      dimensions: imageDimensions
    };
    
    // Prepare update data based on whether we're updating a project or root level
    let updateData = {};
    
    if (currentProject) {
      // Store in project
      updateData[`projects.${projectIndex}.uploadedFiles.design`] = designData;
      
      // Add composite image data if generated successfully
      if (compositeResult) {
        updateData[`projects.${projectIndex}.uploadedFiles.compositeDesign`] = compositeResult;
        console.log('✅ Including composite design in project:', compositeResult.url);
      }
      
      // Add .mind target data if generation was successful
      if (mindTargetResult) {
        updateData[`projects.${projectIndex}.uploadedFiles.mindTarget`] = mindTargetResult;
        console.log('✅ Including .mind target in project');
      }
      
      console.log(`📁 Updating project ${currentProject.id} with design data`);
    } else {
      // Store at root level (backward compatibility)
      updateData['uploadedFiles.design'] = designData;
      
      // Add composite image data if generated successfully
      if (compositeResult) {
        updateData['uploadedFiles.compositeDesign'] = compositeResult;
        console.log('✅ Including composite design in root level:', compositeResult.url);
      }
      
      // ❌ DO NOT save .mind file at root level - project level only
      if (mindTargetResult) {
        console.log('⚠️ .mind file generated but no current project - cannot save at root level');
        console.log('💡 User needs to create/select a project to save .mind files');
      }
      
      console.log('📁 Updating root-level uploadedFiles (no current project)');
    }
    
    // Update user record with design and optional .mind target
    console.log('Updating user record with design data...');
    console.log('Update data:', {
      projectId: currentProject?.id || 'root-level',
      hasDesign: true,
      hasCompositeDesign: !!compositeResult,
      hasMindTarget: !!mindTargetResult,
      userId: req.user._id
    });
    
    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true }
      ).select('-password');
      
      if (!updatedUser) {
        throw new Error('User not found after update');
      }
      console.log('✅ User record updated successfully');
    } catch (dbError) {
      console.error('❌ Database update failed:', dbError);
      console.error('Database error details:', {
        message: dbError.message,
        stack: dbError.stack,
        userId: req.user._id
      });
      throw new Error(`Database update failed: ${dbError.message}`);
    }
    
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
    
    // Get the updated design data from the correct location
    let responseDesign, responseMindTarget;
    if (currentProject) {
      const updatedProject = updatedUser.projects.find(p => p.id === currentProject.id);
      responseDesign = updatedProject?.uploadedFiles?.design;
      responseMindTarget = updatedProject?.uploadedFiles?.mindTarget || null;
    } else {
      responseDesign = updatedUser.uploadedFiles.design;
      // ❌ DO NOT return .mind file from root level - project level only
      responseMindTarget = null;
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Design uploaded successfully',
      data: {
        design: responseDesign,
        mindTarget: responseMindTarget,
        composite: compositeResult,
        projectId: currentProject?.id || null,
        user: updatedUser.getPublicProfile(),
        arReady: !!mindTargetResult // Indicates if AR target is ready
      }
    });
    
  } catch (error) {
    console.error('=== DESIGN UPLOAD ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('User ID:', req.user?._id);
    console.error('File info:', req.file ? {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');
    
    // Determine specific error type
    let errorMessage = 'Failed to upload design';
    let statusCode = 500;
    
    if (error.message.includes('S3 upload failed')) {
      errorMessage = 'File storage service error';
    } else if (error.message.includes('Database update failed')) {
      errorMessage = 'Database error occurred';
    } else if (error.message.includes('Invalid file')) {
      errorMessage = 'Invalid file format';
      statusCode = 400;
    } else if (error.message.includes('File too large')) {
      errorMessage = 'File size exceeds limit';
      statusCode = 413;
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
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
    
    // Check Cloudinary connection
    const cloudinaryConnected = await checkCloudinaryConnection();
    if (!cloudinaryConnected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    
    // Get upload options from request (optional compression/optimization)
    const uploadOptions = {
      compress: false, // Don't compress during upload (slows down upload). Cloudinary handles on-demand compression.
      quality: req.body.quality || 'auto', // auto, 80, 60, etc.
      generatePreview: false // Disable preview generation to speed up upload
    };
    
    console.log('📹 Video upload options:', uploadOptions);
    
    // Use optimized stream-based upload (faster than base64)
    const uploadResult = await uploadVideoToCloudinary(req.file, req.user._id, uploadOptions);
    
    // Get the current user with full data
    const user = await User.findById(req.user._id);
    
    // Determine where to store the video (in project or at root level)
    let currentProject = null;
    let projectIndex = -1;
    
    if (user.currentProject) {
      projectIndex = user.projects.findIndex(p => p.id === user.currentProject);
      if (projectIndex !== -1) {
        currentProject = user.projects[projectIndex];
        console.log(`📁 Storing video in project: ${currentProject.name} (${currentProject.id})`);
      }
    }
    
    // Delete old video file if exists
    const oldVideo = currentProject 
      ? currentProject.uploadedFiles?.video 
      : req.user.uploadedFiles?.video;
      
    if (oldVideo?.url) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = oldVideo.url.split('/');
        const publicId = urlParts[urlParts.length - 1].split('.')[0]; // Remove file extension
        await deleteFromCloudinary(publicId);
        console.log('✅ Old video file deleted from Cloudinary');
      } catch (error) {
        console.error('Failed to delete old video file:', error);
        // Continue with update even if old file deletion fails
      }
    }
    
    // Prepare video data
    const videoData = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size,
      duration: uploadResult.duration || 0,
      uploadedAt: new Date(),
      compressed: false // Set to true after compression
    };
    
    // Prepare update data based on whether we're updating a project or root level
    let updateData = {};
    
    if (currentProject) {
      // Store in project - maintain backward compatibility with single video
      updateData[`projects.${projectIndex}.uploadedFiles.video`] = videoData;
      // Optionally append to videos array if it exists, or create it with this video
      const currentVideos = currentProject.uploadedFiles?.videos || [];
      const videoDataWithId = {
        ...videoData,
        videoId: uuid() // Generate unique ID for analytics
      };
      updateData[`projects.${projectIndex}.uploadedFiles.videos`] = [...currentVideos, videoDataWithId];
      console.log(`📁 Updating project ${currentProject.id} with video data (both video and videos array)`);
    } else {
      // Store at root level (backward compatibility)
      updateData['uploadedFiles.video'] = videoData;
      // Optionally append to videos array
      const currentVideos = req.user.uploadedFiles?.videos || [];
      const videoDataWithId = {
        ...videoData,
        videoId: uuid() // Generate unique ID for analytics
      };
      updateData['uploadedFiles.videos'] = [...currentVideos, videoDataWithId];
      console.log('📁 Updating root-level uploadedFiles (both video and videos array)');
    }
    
    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    // Get the updated video data from the correct location
    let responseVideo;
    if (currentProject) {
      const updatedProject = updatedUser.projects.find(p => p.id === currentProject.id);
      responseVideo = updatedProject?.uploadedFiles?.video;
    } else {
      responseVideo = updatedUser.uploadedFiles.video;
    }
    
    const projectData = currentProject ? {
      id: currentProject.id,
      name: currentProject.name,
      description: currentProject.description
    } : null;

    // Log video upload activity
    await logVideoUpload(req.user._id, {
      filename: uploadResult.public_id,
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
        video: responseVideo,
        projectId: currentProject?.id || null,
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
 * POST /api/upload/videos
 * Upload multiple video files (max 5)
 * Stores videos in project's uploadedFiles.videos array
 * Generates unique videoId for each video for analytics tracking
 */
router.post('/videos', authenticateToken, (req, res, next) => {
  uploadVideos.array('videos', 5)(req, res, (err) => {
    if (err) {
      // Handle multer errors (e.g., file too large)
      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const fileSizeMB = Math.round(uploadVideos.limits?.fileSize / (1024 * 1024)) || 100;
          return res.status(413).json({
            status: 'error',
            message: `Video file size exceeds the maximum limit of ${fileSizeMB}MB per file. Please compress your video or use a smaller file.`,
            code: 'FILE_TOO_LARGE',
            maxSizeMB: fileSizeMB
          });
        } else if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            status: 'error',
            message: 'Too many files. Maximum 5 videos allowed.',
            code: 'TOO_MANY_FILES'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            status: 'error',
            message: 'Unexpected file field. Please use the "videos" field name.',
            code: 'INVALID_FIELD_NAME'
          });
        } else {
          return res.status(400).json({
            status: 'error',
            message: `Upload error: ${err.message}`,
            code: 'UPLOAD_ERROR'
          });
        }
      }
      // Handle file filter errors
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
          status: 'error',
          message: err.message,
          code: 'INVALID_FILE_TYPE'
        });
      }
      // Handle other errors
      return next(err);
    }
    next();
  });
}, async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectId } = req.body;

    console.log('📹 Multiple video upload request received:', {
      userId,
      projectId,
      fileCount: req.files?.length || 0
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No video files provided'
      });
    }

    // Check Cloudinary connection
    const cloudinaryConnected = await checkCloudinaryConnection();
    if (!cloudinaryConnected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }

    // Find user and project if projectId is provided
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    let project = null;
    let projectIndex = -1;
    if (projectId) {
      projectIndex = user.projects.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        project = user.projects[projectIndex];
        console.log(`📁 Storing videos in project: ${project.name} (${project.id})`);
      }
    } else if (user.currentProject) {
      projectIndex = user.projects.findIndex(p => p.id === user.currentProject);
      if (projectIndex !== -1) {
        project = user.projects[projectIndex];
        console.log(`📁 Storing videos in current project: ${project.name} (${project.id})`);
      }
    }

    const uploadedVideos = [];

    // Upload each video to Cloudinary
    for (const file of req.files) {
      try {
        const uploadOptions = {
          compress: false,
          quality: req.body.quality || 'auto',
          generatePreview: false
        };

        const uploadResult = await uploadVideoToCloudinary(file, userId, uploadOptions);

        // Generate unique videoId for analytics tracking
        const videoId = uuid();

        const videoData = {
          filename: uploadResult.public_id,
          originalName: file.originalname,
          url: uploadResult.url,
          size: uploadResult.size || file.size,
          duration: uploadResult.duration || 0,
          uploadedAt: new Date(),
          compressed: false,
          videoId: videoId
        };

        uploadedVideos.push(videoData);

        console.log('✅ Video uploaded:', {
          originalName: file.originalname,
          url: uploadResult.url,
          size: file.size,
          videoId: videoId
        });
      } catch (uploadError) {
        console.error(`❌ Error uploading video ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }

    if (uploadedVideos.length === 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload any videos'
      });
    }

    // Prepare update data
    let updateData = {};
    
    if (project) {
      // Initialize videos array if it doesn't exist
      const currentVideos = project.uploadedFiles?.videos || [];
      const updatedVideos = [...currentVideos, ...uploadedVideos];
      
      updateData[`projects.${projectIndex}.uploadedFiles.videos`] = updatedVideos;
      updateData[`projects.${projectIndex}.updatedAt`] = new Date();
      
      console.log('✅ Videos saved to project:', {
        projectId: project.id,
        newVideoCount: uploadedVideos.length,
        totalVideos: updatedVideos.length
      });
    } else {
      // Store at root level (backward compatibility)
      const currentVideos = user.uploadedFiles?.videos || [];
      const updatedVideos = [...currentVideos, ...uploadedVideos];
      
      updateData['uploadedFiles.videos'] = updatedVideos;
      console.log('✅ Videos saved to root level:', {
        newVideoCount: uploadedVideos.length,
        totalVideos: updatedVideos.length
      });
    }

    // Update user record
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    // Log video upload activity
    await logVideoUpload(userId, {
      filename: uploadedVideos.map(v => v.filename).join(', '),
      originalName: uploadedVideos.map(v => v.originalName).join(', '),
      count: uploadedVideos.length,
      urls: uploadedVideos.map(v => v.url)
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }, project ? {
      id: project.id,
      name: project.name,
      description: project.description
    } : null);

    res.status(200).json({
      status: 'success',
      message: `${uploadedVideos.length} video(s) uploaded successfully`,
      data: {
        videos: uploadedVideos,
        projectId: project?.id || null,
        user: updatedUser.getPublicProfile()
      }
    });

  } catch (error) {
    console.error('Multiple video upload error:', error);
    
    // Handle specific error types
    if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        const fileSizeMB = Math.round((uploadVideos.limits?.fileSize || 100 * 1024 * 1024) / (1024 * 1024));
        return res.status(413).json({
          status: 'error',
          message: `Video file size exceeds the maximum limit of ${fileSizeMB}MB per file. Please compress your video or use a smaller file.`,
          code: 'FILE_TOO_LARGE',
          maxSizeMB: fileSizeMB
        });
      }
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload videos',
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

    console.log('🎥 BACKEND: Video update request received');
    console.log('📨 Video request details:', {
      userId,
      projectId,
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      fullUrl: req.originalUrl,
      method: req.method,
      headers: req.headers.authorization ? 'Auth present' : 'No auth'
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }
    
    // Find user and project
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('🔍 Looking for project for video update:', {
      projectId,
      userProjects: user.projects?.map(p => ({ id: p.id, name: p.name })) || []
    });

    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      console.error('❌ Project not found for video update:', projectId);
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    console.log('✅ Found project for video update:', { id: project.id, name: project.name });
    
    // Delete old video from Cloudinary if it exists
    if (project.uploadedFiles?.video?.url) {
      try {
        console.log('🗑️ Deleting old video from Cloudinary:', project.uploadedFiles.video.url);
        
        // Extract public_id from the old video URL
        const oldVideoUrl = project.uploadedFiles.video.url;
        let oldPublicId = null;
        
        // Try to extract public_id from Cloudinary URL
        if (oldVideoUrl.includes('cloudinary.com')) {
          const urlParts = oldVideoUrl.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex !== -1 && uploadIndex + 1 < urlParts.length) {
            const versionAndId = urlParts[uploadIndex + 1];
            const parts = versionAndId.split('/');
            if (parts.length >= 2) {
              oldPublicId = parts.slice(1).join('/').split('.')[0]; // Remove version and file extension
            }
          }
        }
        
        if (oldPublicId) {
          console.log('🗑️ Deleting old video with public_id:', oldPublicId);
          await deleteFromCloudinary(oldPublicId);
          console.log('✅ Old video deleted successfully');
        } else {
          console.log('⚠️ Could not extract public_id from old video URL, skipping deletion');
        }
      } catch (deleteError) {
        console.error('⚠️ Failed to delete old video from Cloudinary:', deleteError.message);
        // Continue with upload even if deletion fails
      }
    }
    
    // Get upload options from request (optional compression/optimization)
    const uploadOptions = {
      compress: req.body.compress === 'true' || req.body.compress === true,
      quality: req.body.quality || 'auto',
      generatePreview: true
    };
    
    console.log('📹 Video upload options:', uploadOptions);
    
    // Use optimized stream-based upload
    const uploadResult = await uploadVideoToCloudinary(req.file, userId, uploadOptions);
    
    // Update project's video (maintain backward compatibility)
    const videoData = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size || req.file.size,
      duration: uploadResult.duration || 0,
      uploadedAt: new Date(),
      compressed: false
    };
    
    project.uploadedFiles.video = videoData;
    
    // Also append to videos array for multiple video support
    const currentVideos = project.uploadedFiles?.videos || [];
    const videoDataWithId = {
      ...videoData,
      videoId: uuid() // Generate unique ID for analytics
    };
    project.uploadedFiles.videos = [...currentVideos, videoDataWithId];

    console.log('🔄 Updating project video:', {
      projectId: project.id,
      newVideo: project.uploadedFiles.video,
      totalVideos: project.uploadedFiles.videos.length
    });
    
    // Update project's updatedAt timestamp
    project.updatedAt = new Date();
    
    await user.save();

    console.log('✅ Project video saved successfully:', {
      projectId: project.id,
      videoUrl: project.uploadedFiles.video.url
    });

    // Log video update activity
    await logVideoUpload(userId, {
      filename: uploadResult.public_id,
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
 * POST /api/upload/documents
 * Upload multiple documents (PDF, DOC, DOCX, images, text files)
 * Stores documents in project's uploadedFiles.documents array
 */
router.post('/documents', authenticateToken, uploadDocuments.array('documents', 5), async (req, res) => {
  try {
    const userId = req.user._id;
    const { projectId } = req.body;

    console.log('📄 Document upload request received:', {
      userId,
      projectId,
      fileCount: req.files?.length || 0
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No documents provided'
      });
    }

    // Find user and project if projectId is provided
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    let project = null;
    if (projectId) {
      project = user.projects.find(p => p.id === projectId);
      if (!project) {
        return res.status(404).json({
          status: 'error',
          message: 'Project not found'
        });
      }
    }

    const uploadedDocuments = [];

    // Upload each document to Cloudinary
    for (const file of req.files) {
      try {
        // Determine resource type based on file type
        const isImage = file.mimetype.startsWith('image/');
        const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
        
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `document-${uniqueSuffix}.${fileExtension}`;

        // Determine resource type: 'image' for images, 'raw' for PDFs and other documents
        let resourceType = 'raw'; // Default to raw for documents
        if (isImage) {
          resourceType = 'image';
        }

        // Upload to Cloudinary using uploadToCloudinaryBuffer
        // For images, pass quality options; for raw files, pass empty options
        const uploadOptions = isImage ? { quality: 'auto' } : {};
        
        // Create a custom upload function that forces the correct resource type
        // We need to override the resource_type determination in uploadToCloudinaryBuffer
        const uploadResult = await uploadToCloudinaryBuffer(
          file.buffer,
          userId,
          'documents',
          fileName,
          file.mimetype,
          uploadOptions
        );

        // Override resource_type if it was incorrectly determined
        // uploadToCloudinaryBuffer might set it to 'image' based on the 'documents' type
        // Force it to 'raw' for non-image files
        let finalResourceType = uploadResult.resource_type;
        if (!isImage && finalResourceType === 'image') {
          // Re-upload with correct resource type if it was wrong
          console.log(`⚠️ Resource type was incorrectly set to 'image' for ${file.originalname}, correcting to 'raw'`);
          finalResourceType = 'raw';
        } else if (isImage) {
          finalResourceType = 'image';
        } else {
          finalResourceType = 'raw';
        }

        const documentData = {
          filename: uploadResult.public_id,
          originalName: file.originalname,
          url: uploadResult.url,
          size: uploadResult.size || file.size,
          mimetype: file.mimetype,
          format: uploadResult.format || fileExtension,
          resource_type: finalResourceType,
          uploadedAt: new Date()
        };

        uploadedDocuments.push(documentData);

        console.log('✅ Document uploaded:', {
          originalName: file.originalname,
          url: uploadResult.url,
          size: file.size,
          resourceType: finalResourceType
        });
      } catch (uploadError) {
        console.error(`❌ Error uploading document ${file.originalname}:`, uploadError);
        // Continue with other files
      }
    }

    if (uploadedDocuments.length === 0) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload any documents'
      });
    }

    // If projectId is provided, update project's documents array
    if (project) {
      // Initialize documents array if it doesn't exist
      if (!project.uploadedFiles.documents) {
        project.uploadedFiles.documents = [];
      }
      
      // Add new documents to the array
      project.uploadedFiles.documents.push(...uploadedDocuments);
      project.updatedAt = new Date();
      
      await user.save();
      
      console.log('✅ Documents saved to project:', {
        projectId: project.id,
        documentCount: uploadedDocuments.length,
        totalDocuments: project.uploadedFiles.documents.length
      });
    }

    res.status(200).json({
      status: 'success',
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      data: {
        documents: uploadedDocuments
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload documents',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/upload/qr-position
 * Set QR code position on the design
 * Stores coordinates where QR code should be placed
 */
// Minimum dimensions for scannable QR code sticker
// QR code itself needs ~80-100px minimum, plus border (8px) + padding (32px) = ~120px sticker width minimum
// Height includes "SCAN ME" text (~40px), so minimum height ~160px
const MIN_STICKER_WIDTH = 120;
const MIN_STICKER_HEIGHT = 160;

router.post('/qr-position', authenticateToken, [
  body('x').isFloat({ min: 0 }).withMessage('X coordinate must be a positive number'),
  body('y').isFloat({ min: 0 }).withMessage('Y coordinate must be a positive number'),
  body('width').isFloat({ min: MIN_STICKER_WIDTH }).withMessage(`Width must be at least ${MIN_STICKER_WIDTH}px for reliable scanning`),
  body('height').isFloat({ min: MIN_STICKER_HEIGHT }).withMessage(`Height must be at least ${MIN_STICKER_HEIGHT}px for reliable scanning`),
  body('qrFrameConfig').optional().isObject().withMessage('QR frame config must be an object'),
  body('qrFrameConfig.frameType').optional().isInt({ min: 1, max: 10 }).withMessage('Frame type must be between 1 and 10'),
  body('qrFrameConfig.textContent').optional().isString().isLength({ max: 50 }).withMessage('Text content must be a string with max 50 characters'),
  body('qrFrameConfig.textStyle').optional().isObject().withMessage('Text style must be an object'),
  body('qrFrameConfig.transparentBackground').optional().isBoolean().withMessage('Transparent background must be a boolean')
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
    
    const { x, y, width, height, qrFrameConfig } = req.body;
    
    // Ensure values are numbers and enforce minimums
    const qrPositionData = {
      x: parseFloat(x),
      y: parseFloat(y),
      width: Math.max(MIN_STICKER_WIDTH, parseFloat(width)),
      height: Math.max(MIN_STICKER_HEIGHT, parseFloat(height))
    };
    
    // Check if user has uploaded a design (check project first, then root level)
    const user = await User.findById(req.user._id);
    let hasDesign = false;
    
    if (user.currentProject && user.projects) {
      const currentProject = user.projects.find(p => p.id === user.currentProject);
      hasDesign = !!currentProject?.uploadedFiles?.design?.url;
    }
    
    // Fallback to root-level check
    if (!hasDesign) {
      hasDesign = !!user.uploadedFiles?.design?.url;
    }
    
    if (!hasDesign) {
      console.log('❌ No design found - checked project and root level');
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    console.log('✅ Design found - proceeding with QR position save');
    
    // Store old QR position for history
    const oldQrPosition = req.user.qrPosition;
    
    // Check if custom frame config is provided (indicates frontend will generate composite)
    const hasCustomFrame = qrFrameConfig && typeof qrFrameConfig === 'object' && 
                          (qrFrameConfig.frameType !== 1 || 
                           qrFrameConfig.textContent !== 'SCAN ME' ||
                           qrFrameConfig.textStyle?.gradient ||
                           (qrFrameConfig.textStyle?.color && qrFrameConfig.textStyle.color !== '#FFFFFF'));
    
    if (hasCustomFrame) {
      console.log('⏭️ Skipping backend composite generation - custom frame detected, frontend will generate composite');
    }
    
    // Generate composite design on server side (only if no custom frame)
    // Note: If frontend already uploaded a composite, we'll detect it later and preserve it
    let compositeDesignData = null;
    let mindTargetData = null;
    
    if (!hasCustomFrame) {
      try {
        console.log('Generating server-side composite design...');
        
        // Generate QR data (user's scan URL for AR experience)
        // Format: /ar/user/{userId}/project/{projectId}
        const currentProjectId = user.currentProject || 'default';
        const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/ar/user/${req.user._id}/project/${currentProjectId}`;
        
        // Get design URL from project or root level
        let designUrl;
        if (user.currentProject && user.projects) {
          const currentProject = user.projects.find(p => p.id === user.currentProject);
          designUrl = currentProject?.uploadedFiles?.design?.url;
        }
        
        // Fallback to root-level design
        if (!designUrl) {
          designUrl = user.uploadedFiles?.design?.url;
        }
        
        console.log('🎨 Using design URL for composite:', designUrl);
        
        // Use default frame config for backend generation (only supports basic frames)
        const frameConfig = {
          frameType: 1,
          textContent: 'SCAN ME',
          textStyle: { bold: true, italic: false, color: '#FFFFFF', gradient: null }
        };
        
        console.log('🎨 Using default frame config for backend generation:', frameConfig);
        
        // Set a timeout for composite generation to avoid blocking QR position save
        const compositePromise = generateFinalDesign(
          designUrl,
          qrData,
          qrPositionData,
          req.user._id.toString(),
          frameConfig // Pass default frame config
        );
      
        // Race between composite generation and timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Composite generation timeout')), 30000)
        );
        
        const finalDesignPath = await Promise.race([compositePromise, timeoutPromise]);
        
        // Upload the composite image to Cloudinary
        const compositeImageBuffer = fs.readFileSync(finalDesignPath);
        const compositeFilename = `composite-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
        
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinaryBuffer(
          compositeImageBuffer,
          req.user._id,
          'composite-image',
          compositeFilename,
          'image/png'
        );
        
        compositeDesignData = {
          filename: uploadResult.public_id,
          originalName: `composite-design-${Date.now()}.png`,
          url: uploadResult.url,
          size: compositeImageBuffer.length,
          uploadedAt: new Date(),
          generated: true
        };
        
        console.log('✅ Server-side composite design generated successfully:', uploadResult.url);
      
      // Generate .mind file from the composite image
      try {
        console.log('🎯 Generating .mind file from composite image...');
        console.log('📋 Composite image buffer size:', compositeImageBuffer.length);
        
        // Use the composite image buffer to generate .mind file
        const mindFilename = `target-${Date.now()}.mind`;
        const mindOutputPath = path.join(__dirname, '../temp', mindFilename);
        
        // Write composite image to temp location for mind file generation
        const tempImagePath = path.join(__dirname, '../temp', `temp-composite-${Date.now()}.png`);
        console.log('📁 Writing composite to temp path:', tempImagePath);
        fs.writeFileSync(tempImagePath, compositeImageBuffer);
        console.log('✅ Composite image written to temp file');
        
        // Generate .mind file using mindar-image-cli
        const { execSync } = require('child_process');
        const mindCommand = `npx -y mind-ar-js-cli@latest compile -i "${tempImagePath}" -o "${mindOutputPath}"`;
        
        console.log('🔧 Running MindAR CLI command:', mindCommand);
        console.log('📁 Expected output path:', mindOutputPath);
        
        try {
          const output = execSync(mindCommand, { stdio: 'pipe', encoding: 'utf-8' });
          console.log('✅ MindAR CLI command completed');
          console.log('📄 CLI output:', output);
        } catch (execError) {
          console.error('❌ MindAR CLI command failed:', execError.message);
          console.error('📄 CLI stderr:', execError.stderr?.toString());
          console.error('📄 CLI stdout:', execError.stdout?.toString());
          throw execError;
        }
        
        // Read the generated .mind file
        console.log('🔍 Checking if .mind file exists:', mindOutputPath);
        if (fs.existsSync(mindOutputPath)) {
          const mindBuffer = fs.readFileSync(mindOutputPath);
          console.log(`✅ .mind file generated successfully: ${mindBuffer.length} bytes`);
          
          // Upload .mind file to Cloudinary in targets folder
          console.log('☁️ Uploading .mind file to Cloudinary...');
          const mindUploadResult = await uploadToCloudinaryBuffer(
            mindBuffer,
            req.user._id,
            'targets',
            mindFilename,
            'application/octet-stream'
          );
          
          mindTargetData = {
            filename: mindUploadResult.public_id,
            url: mindUploadResult.url,
            size: mindBuffer.length,
            uploadedAt: new Date(),
            generated: true
          };
          
          console.log('✅ .mind file uploaded to Cloudinary:', mindUploadResult.url);
          console.log('📊 mindTargetData:', JSON.stringify(mindTargetData, null, 2));
          console.log('📊 mindTargetData is null?', mindTargetData === null);
          console.log('📊 mindTargetData.url exists?', !!mindTargetData?.url);
          
          // Clean up temp files
          cleanupTempFile(tempImagePath);
          cleanupTempFile(mindOutputPath);
          console.log('🧹 Temp files cleaned up');
        } else {
          console.error('❌ .mind file was not generated at path:', mindOutputPath);
          console.error('📁 Directory contents:', fs.readdirSync(path.join(__dirname, '../temp')));
        }
        
      } catch (mindError) {
        console.error('❌ Failed to generate .mind file:', mindError);
        console.error('❌ Error stack:', mindError.stack);
        console.error('❌ Error details:', {
          message: mindError.message,
          code: mindError.code,
          cmd: mindError.cmd
        });
        console.log('⚠️ Continuing without .mind file - it can be generated later');
      }
      
        // Clean up temporary composite file
        cleanupTempFile(finalDesignPath);
        
      } catch (compositeError) {
        console.error('Failed to generate server-side composite:', compositeError);
        console.log('⚠️ Continuing without composite design - QR position will still be saved');
        // Continue without composite design if generation fails
      }
    }

    // Get current project information (refresh to get latest composite if frontend uploaded it)
    const fullUser = await User.findById(req.user._id);
    let targetProject = null;
    let targetProjectIndex = -1;
    
    if (fullUser.currentProject) {
      targetProjectIndex = fullUser.projects.findIndex(p => p.id === fullUser.currentProject);
      if (targetProjectIndex !== -1) {
        targetProject = fullUser.projects[targetProjectIndex];
        console.log(`📁 Storing QR position in project: ${targetProject.name} (${targetProject.id})`);
        
        // Check for existing composite right before update (frontend may have uploaded it)
        existingComposite = targetProject?.uploadedFiles?.compositeDesign;
        if (existingComposite?.url) {
          console.log(`✅ Found existing composite from frontend: ${existingComposite.url.substring(0, 50)}...`);
        }
      }
    }
    
    // Update QR position, composite design, and mind target
    let updateData = {};
    
    console.log('=== PREPARING DATABASE UPDATE ===');
    console.log('📊 compositeDesignData:', compositeDesignData ? `${compositeDesignData.url}` : 'null');
    console.log('📊 mindTargetData:', mindTargetData ? `${mindTargetData.url}` : 'null');
    console.log('📊 targetProject:', targetProject ? `${targetProject.name} (${targetProject.id})` : 'null');
    console.log('📊 targetProjectIndex:', targetProjectIndex);
    
    if (targetProject) {
      // Store in project
      updateData[`projects.${targetProjectIndex}.qrPosition`] = qrPositionData;
      
      // Store frame config if provided
      if (qrFrameConfig) {
        updateData[`projects.${targetProjectIndex}.qrFrameConfig`] = {
          frameType: qrFrameConfig.frameType || 1,
          textContent: qrFrameConfig.textContent || 'SCAN ME',
          textStyle: {
            bold: qrFrameConfig.textStyle?.bold !== false,
            italic: qrFrameConfig.textStyle?.italic || false,
            color: qrFrameConfig.textStyle?.color || '#FFFFFF',
            gradient: qrFrameConfig.textStyle?.gradient || null
          },
          transparentBackground: qrFrameConfig.transparentBackground || false
        };
        console.log(`✅ Will store qrFrameConfig in project: frameType=${qrFrameConfig.frameType}`);
      }
      
      // Only update composite if backend generated a new one
      // If frontend already uploaded one, preserve it (don't overwrite)
      if (compositeDesignData && !existingComposite?.url) {
        updateData[`projects.${targetProjectIndex}.uploadedFiles.compositeDesign`] = compositeDesignData;
        console.log(`✅ Will store compositeDesign in project: ${compositeDesignData.url}`);
      } else if (existingComposite?.url) {
        console.log(`✅ Preserving existing frontend-uploaded composite: ${existingComposite.url.substring(0, 50)}...`);
        // Don't update compositeDesign - keep the existing one
      } else {
        console.log('⚠️ compositeDesignData is null - not storing');
      }
      if (mindTargetData) {
        updateData[`projects.${targetProjectIndex}.uploadedFiles.mindTarget`] = mindTargetData;
        console.log(`✅ Will store mindTarget in project: ${mindTargetData.url}`);
      } else {
        console.log('⚠️ mindTargetData is null - not storing');
      }
      console.log(`📁 Updating project ${targetProject.id} with QR position and generated files`);
    } else {
      // Store at root level (backward compatibility)
      updateData = { qrPosition: qrPositionData };
      if (compositeDesignData) {
        updateData['uploadedFiles.compositeDesign'] = compositeDesignData;
      }
      // ❌ DO NOT save .mind file at root level - project level only
      if (mindTargetData) {
        console.log('⚠️ .mind file generated but no current project - cannot save');
        console.log('💡 User needs to create/select a project to save .mind files');
      }
      console.log('📁 Updating root-level QR position (no current project)');
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
    
    // Get the updated project data if available
    let responseQrPosition = qrPositionData;
    let responseCompositeDesign = compositeDesignData;
    let responseMindTarget = mindTargetData;
    
    // If we stored in project, get the data from the updated project
    if (targetProject && updatedUser.projects) {
      const updatedProject = updatedUser.projects.find(p => p.id === fullUser.currentProject);
      if (updatedProject) {
        responseQrPosition = updatedProject.qrPosition || qrPositionData;
        responseCompositeDesign = updatedProject.uploadedFiles?.compositeDesign || compositeDesignData;
        responseMindTarget = updatedProject.uploadedFiles?.mindTarget || mindTargetData;
        console.log('📤 Returning project-level data in response');
        console.log('📤 compositeDesign URL:', responseCompositeDesign?.url);
        console.log('📤 mindTarget URL:', responseMindTarget?.url);
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: 'QR position updated successfully',
      data: {
        qrPosition: responseQrPosition,
        compositeDesign: responseCompositeDesign,
        mindTarget: responseMindTarget,
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
  body('qrPosition.width').isFloat({ min: MIN_STICKER_WIDTH }).withMessage(`Width must be at least ${MIN_STICKER_WIDTH}px for reliable scanning`),
  body('qrPosition.height').isFloat({ min: MIN_STICKER_HEIGHT }).withMessage(`Height must be at least ${MIN_STICKER_HEIGHT}px for reliable scanning`)
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
    
    // Get full user with projects
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check for design at project level or root level
    let hasDesign = false;
    let designUrl = null;
    
    if (user.currentProject && user.projects) {
      const currentProject = user.projects.find(p => p.id === user.currentProject);
      if (currentProject?.uploadedFiles?.design?.url) {
        hasDesign = true;
        designUrl = currentProject.uploadedFiles.design.url;
      }
    }
    
    // Fallback to root-level design
    if (!hasDesign && user.uploadedFiles?.design?.url) {
      hasDesign = true;
      designUrl = user.uploadedFiles.design.url;
    }
    
    if (!hasDesign) {
      console.log('ERROR: No design uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    console.log('Original design URL:', designUrl);
    
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
    
    // Check Cloudinary connection
    const cloudinaryConnected = await checkCloudinaryConnection();
    if (!cloudinaryConnected) {
      return res.status(500).json({
        status: 'error',
        message: 'File storage service unavailable'
      });
    }
    
    // Generate unique filename for composite design
    const timestamp = Date.now();
    
    // Upload composite image to Cloudinary
    const uploadResult = await uploadToCloudinaryBuffer(
      imageBuffer,
      req.user._id,
      'composite-image',
      `composite-${timestamp}.png`,
      'image/png'
    );
    
    console.log('Cloudinary Upload result:', uploadResult);
    
    // Enforce minimums on QR position before saving
    const validatedQrPosition = {
      x: parseFloat(qrPosition.x),
      y: parseFloat(qrPosition.y),
      width: Math.max(MIN_STICKER_WIDTH, parseFloat(qrPosition.width)),
      height: Math.max(MIN_STICKER_HEIGHT, parseFloat(qrPosition.height))
    };
    
    // Prepare composite design data
    const compositeDesignData = {
      filename: uploadResult.public_id,
      originalName: `composite-design-${timestamp}.png`,
      url: uploadResult.url,
      size: imageBuffer.length,
      uploadedAt: new Date()
    };
    
    // Update at project level if currentProject exists, otherwise root level
    let updatedUser;
    let projectIndex = -1;
    
    if (user.currentProject && user.projects) {
      projectIndex = user.projects.findIndex(p => p.id === user.currentProject);
      if (projectIndex !== -1) {
        const project = user.projects[projectIndex];
        
        // Delete old composite design from project if exists
        if (project.uploadedFiles?.compositeDesign?.url) {
          try {
            const oldPublicId = project.uploadedFiles.compositeDesign.filename || 
                              extractCloudinaryPublicId(project.uploadedFiles.compositeDesign.url);
            if (oldPublicId) {
              await cloudinary.uploader.destroy(oldPublicId, { invalidate: true });
              console.log('Old project composite design deleted from Cloudinary');
            }
          } catch (error) {
            console.error('Failed to delete old project composite design:', error);
            // Continue with update even if old file deletion fails
          }
        }
        
        // Update project-level composite design
        const updateData = {
          [`projects.${projectIndex}.uploadedFiles.compositeDesign`]: compositeDesignData,
          [`projects.${projectIndex}.qrPosition`]: validatedQrPosition
        };
        
        updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { $set: updateData },
          { new: true }
        ).select('-password');
        
        console.log('✅ Composite design saved to project level');
      }
    }
    
    // Fallback to root level if no project
    if (!updatedUser) {
      // Delete old composite design if exists
      if (user.uploadedFiles?.compositeDesign?.url) {
        try {
          const oldPublicId = user.uploadedFiles.compositeDesign.filename || 
                            extractCloudinaryPublicId(user.uploadedFiles.compositeDesign.url);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId, { invalidate: true });
            console.log('Old composite design deleted from Cloudinary');
          }
        } catch (error) {
          console.error('Failed to delete old composite design:', error);
          // Continue with update even if old file deletion fails
        }
      }
      
      // Store old QR position for history
      const oldQrPosition = user.qrPosition;
      
      // Update root-level composite design
      updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        {
          qrPosition: validatedQrPosition,
          'uploadedFiles.compositeDesign': compositeDesignData
        },
        { new: true }
      ).select('-password');
      
      console.log('✅ Composite design saved to root level');
    }
    
    // Get the composite design URL from the response
    let compositeDesignUrl = null;
    if (projectIndex !== -1 && updatedUser.projects[projectIndex]?.uploadedFiles?.compositeDesign) {
      compositeDesignUrl = updatedUser.projects[projectIndex].uploadedFiles.compositeDesign.url;
    } else if (updatedUser.uploadedFiles?.compositeDesign) {
      compositeDesignUrl = updatedUser.uploadedFiles.compositeDesign.url;
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Composite design saved successfully',
      data: {
        qrPosition: projectIndex !== -1 
          ? updatedUser.projects[projectIndex]?.qrPosition 
          : updatedUser.qrPosition,
        compositeDesign: {
          url: compositeDesignUrl,
          ...compositeDesignData
        },
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

    console.log('💾 Saving .mind target file...');
    console.log('📊 Buffer size:', buffer.length, 'bytes');

    // Upload to Cloudinary
    const timestamp = Date.now();
    const uploadResult = await uploadToCloudinaryBuffer(
      buffer, 
      req.user._id, 
      'targets', 
      `target-${timestamp}.mind`, 
      'application/octet-stream'
    );
    
    console.log('☁️ .mind file uploaded to Cloudinary:', uploadResult.url);

    // Prepare .mind target data
    const mindTargetData = {
      filename: uploadResult.public_id,
      url: uploadResult.url,
      size: buffer.length,
      uploadedAt: new Date(),
      generated: true
    };

    // Get current project information
    const user = await User.findById(req.user._id);
    let targetProject = null;
    let targetProjectIndex = -1;
    
    if (user.currentProject) {
      targetProjectIndex = user.projects.findIndex(p => p.id === user.currentProject);
      if (targetProjectIndex !== -1) {
        targetProject = user.projects[targetProjectIndex];
        console.log(`📁 Storing .mind file in project: ${targetProject.name} (${targetProject.id})`);
      }
    }

    // Update .mind target (project level or root level)
    let updateData = {};
    
    if (targetProject) {
      // Store in project - ONLY place where .mind files should be saved
      updateData[`projects.${targetProjectIndex}.uploadedFiles.mindTarget`] = mindTargetData;
      console.log(`✅ Updating project ${targetProject.id} with .mind file`);
    } else {
      // ❌ REJECT: .mind files must be saved at project level only
      console.error('❌ Cannot save .mind file - no current project');
      return res.status(400).json({ 
        status: 'error', 
        message: 'Cannot save .mind file without a current project. Please create or select a project first.' 
      });
    }

    console.log('=== EXECUTING DATABASE UPDATE ===');
    console.log('📊 Update data:', JSON.stringify(updateData, null, 2));
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');
    
    console.log('=== DATABASE UPDATE COMPLETED ===');
    console.log('✅ User updated successfully');

    // Get the updated mind target from the correct location
    let responseMindTarget = mindTargetData;
    if (targetProject && updatedUser.projects) {
      const updatedProject = updatedUser.projects.find(p => p.id === user.currentProject);
      if (updatedProject) {
        responseMindTarget = updatedProject.uploadedFiles?.mindTarget || mindTargetData;
        console.log('📤 Returning project-level .mind target');
        console.log('📤 .mind target URL:', responseMindTarget?.url);
        
        // Verify the data was actually saved
        console.log('=== VERIFICATION ===');
        console.log('📊 Project ID:', updatedProject.id);
        console.log('📊 Project name:', updatedProject.name);
        console.log('📊 mindTarget saved?', !!updatedProject.uploadedFiles?.mindTarget);
        console.log('📊 mindTarget URL:', updatedProject.uploadedFiles?.mindTarget?.url || 'MISSING');
        console.log('📊 mindTarget size:', updatedProject.uploadedFiles?.mindTarget?.size || 'MISSING');
        console.log('📊 Full mindTarget object:', JSON.stringify(updatedProject.uploadedFiles?.mindTarget, null, 2));
      } else {
        console.warn('⚠️ Could not find updated project after save!');
      }
    } else {
      console.log('📤 Returning root-level .mind target');
      console.log('📊 Root mindTarget URL:', updatedUser.uploadedFiles?.mindTarget?.url || 'MISSING');
    }

    return res.status(200).json({
      status: 'success',
      message: '.mind target saved',
      data: {
        mindTarget: responseMindTarget,
        projectId: targetProject?.id || null,
        user: updatedUser.getPublicProfile()
      }
    });
  } catch (err) {
    console.error('save-mind-target error:', err);
    return res.status(500).json({ status: 'error', message: 'Failed to save mind target' });
  }
});

/**
 * POST /api/upload/fix-mind-target-url
 * Manually update project with existing .mind file URL from Cloudinary
 * Use this when .mind file exists in Cloudinary but database wasn't updated
 * Body: { projectId (optional), mindFileUrl (required) }
 */
router.post('/fix-mind-target-url', authenticateToken, async (req, res) => {
  try {
    const { projectId, mindFileUrl } = req.body;
    
    if (!mindFileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Mind file URL is required'
      });
    }
    
    console.log('🔧 Fixing .mind target URL for project:', projectId || 'current/root level');
    console.log('🔗 .mind file URL:', mindFileUrl);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prepare .mind target data
    const mindTargetData = {
      filename: mindFileUrl.split('/').pop(),
      url: mindFileUrl,
      size: 0,
      uploadedAt: new Date(),
      generated: true
    };
    
    let updateData = {};
    let targetLocation = '';
    
    // Check if we have a current project and it matches the projectId (if provided)
    if (user.currentProject) {
      const projectIndex = user.projects.findIndex(p => {
        if (projectId) {
          return p.id === projectId;
        }
        return p.id === user.currentProject;
      });
      
      if (projectIndex !== -1) {
        // Update project
        updateData[`projects.${projectIndex}.uploadedFiles.mindTarget`] = mindTargetData;
        targetLocation = `project at index ${projectIndex} (${user.projects[projectIndex].name})`;
        console.log(`✅ Updating ${targetLocation}`);
      } else {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
    } else {
      // ❌ REJECT: .mind files must be saved at project level only
      return res.status(400).json({
        success: false,
        message: 'Cannot save .mind file without a current project. Please create or select a project first.'
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    );
    
    console.log('✅ .mind target URL updated successfully');
    
    // Get the updated mind target
    let updatedMindTarget;
    if (user.currentProject) {
      const updatedProject = updatedUser.projects.find(p => 
        projectId ? p.id === projectId : p.id === user.currentProject
      );
      updatedMindTarget = updatedProject?.uploadedFiles?.mindTarget;
    } else {
      updatedMindTarget = updatedUser.uploadedFiles?.mindTarget;
    }
    
    res.json({
      success: true,
      message: `.mind target URL fixed successfully at ${targetLocation}`,
      data: {
        mindTarget: updatedMindTarget,
        location: targetLocation
      }
    });
    
  } catch (error) {
    console.error('❌ Fix mind target URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix mind target URL',
      error: error.message
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
 * GET /api/upload/debug-final-design
 * Debug endpoint to check final design generation status
 */
router.get('/debug-final-design', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const debugInfo = {
      userId: user._id,
      hasDesign: !!user.uploadedFiles.design.url,
      designUrl: user.uploadedFiles.design.url,
      hasQrPosition: !!user.qrPosition,
      qrPosition: user.qrPosition,
      currentProject: user.currentProject,
      projects: user.projects?.length || 0,
      environment: process.env.NODE_ENV,
      frontendUrl: process.env.FRONTEND_URL
    };
    
    console.log('🔍 Debug info for user:', debugInfo);
    
    res.status(200).json({
      status: 'success',
      data: debugInfo
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Debug failed',
      error: error.message
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
    console.log('🎯 Starting final design download for user:', req.user._id);
    const user = await User.findById(req.user._id);
    
    // Get data from current project or root level
    let designUrl, qrPosition;
    
    if (user.currentProject && user.projects) {
      const currentProject = user.projects.find(p => p.id === user.currentProject);
      if (currentProject) {
        designUrl = currentProject.uploadedFiles?.design?.url;
        qrPosition = currentProject.qrPosition;
        console.log(`📁 Using data from project: ${currentProject.name} (${currentProject.id})`);
      }
    }
    
    // Fallback to root level
    if (!designUrl) {
      designUrl = user.uploadedFiles?.design?.url;
      qrPosition = user.qrPosition;
      console.log('📁 Using root-level data (backward compatibility)');
    }
    
    // Check if user has uploaded design and set QR position
    if (!designUrl) {
      console.error('❌ No design uploaded for user:', user._id);
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    if (!qrPosition || (qrPosition.x === undefined && qrPosition.y === undefined)) {
      console.error('❌ No QR position set for user:', user._id);
      return res.status(400).json({
        status: 'error',
        message: 'Please set QR code position first'
      });
    }
    
    console.log('🎨 Generating final design with:', { designUrl, qrPosition });
    
    console.log('✅ Validation passed for user:', user._id);
    
    // Get current project information
    const currentProject = user.projects?.find(p => p.id === user.currentProject);
    const currentProjectId = user.currentProject || 'default';
    
    // Generate project-specific QR data for AR experience (using hash routing)
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/ar/user/${user._id}/project/${currentProjectId}`;
    
    // Generate final design with QR code
    console.log('🎨 Calling generateFinalDesign with:', {
      designUrl,
      qrData: qrData.substring(0, 50) + '...',
      qrPosition,
      userId: user._id.toString()
    });
    
    const finalDesignPath = await generateFinalDesign(
      designUrl,
      qrData,
      qrPosition,
      user._id.toString()
    );
    
    console.log('✅ generateFinalDesign completed, path:', finalDesignPath);
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
    const user = await User.findById(req.user._id);
    
    // Get data from current project or root level
    let designUrl, qrPosition;
    
    if (user.currentProject && user.projects) {
      const currentProject = user.projects.find(p => p.id === user.currentProject);
      if (currentProject) {
        designUrl = currentProject.uploadedFiles?.design?.url;
        qrPosition = currentProject.qrPosition;
      }
    }
    
    // Fallback to root level
    if (!designUrl) {
      designUrl = user.uploadedFiles?.design?.url;
      qrPosition = user.qrPosition;
    }
    
    // Check if user has uploaded design and set QR position
    if (!designUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    if (!qrPosition || (qrPosition.x === undefined && qrPosition.y === undefined)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please set QR code position first'
      });
    }
    
    console.log('🎨 Generating preview with:', { designUrl, qrPosition });
    
    // Generate QR data (user's scan URL for AR experience)
    // Format: /ar/user/{userId}/project/{projectId}
    const currentProjectId = user.currentProject || 'default';
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/#/ar/user/${user._id}/project/${currentProjectId}`;
    
    // Generate final design with QR code
    const finalDesignPath = await generateFinalDesign(
      designUrl,
      qrData,
      qrPosition,
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
 * POST /api/upload/migrate-mind-to-project
 * Migrate root-level .mind file to current project
 * Temporary endpoint to fix existing data
 */
router.post('/migrate-mind-to-project', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.currentProject) {
      return res.status(400).json({
        status: 'error',
        message: 'No current project set'
      });
    }
    
    const projectIndex = user.projects.findIndex(p => p.id === user.currentProject);
    if (projectIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Current project not found'
      });
    }
    
    // Check if root-level mindTarget exists
    if (!user.uploadedFiles?.mindTarget?.url) {
      return res.status(400).json({
        status: 'error',
        message: 'No .mind file found at root level to migrate'
      });
    }
    
    console.log('📦 Migrating .mind file from root to project:', user.currentProject);
    console.log('📁 .mind URL:', user.uploadedFiles.mindTarget.url);
    
    // Copy mindTarget to project
    const updateData = {
      [`projects.${projectIndex}.uploadedFiles.mindTarget`]: user.uploadedFiles.mindTarget
    };
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');
    
    console.log('✅ .mind file migrated to project successfully');
    
    res.status(200).json({
      status: 'success',
      message: '.mind file migrated to project successfully',
      data: {
        projectId: user.currentProject,
        mindTarget: user.uploadedFiles.mindTarget,
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to migrate .mind file',
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
    
    // Delete files from Cloudinary if they exist
    const filesToDelete = [];
    
    // Helper function to extract Cloudinary public_id from URL
    const extractCloudinaryPublicId = (url) => {
      try {
        if (!url) return null;
        
        // For Cloudinary URLs: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/phygital-zone/users/userId/type/filename
        // Or: https://res.cloudinary.com/cloud_name/raw/upload/v1234567890/phygital-zone/users/userId/type/filename.ext
        // We need to extract the public_id: phygital-zone/users/userId/type/filename (without extension)
        if (url.includes('cloudinary.com')) {
          const urlParts = url.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
            // Extract everything after 'upload/v1234567890/'
            let publicId = urlParts.slice(uploadIndex + 2).join('/');
            
            // Remove query parameters if any (e.g., ?v=123)
            if (publicId.includes('?')) {
              publicId = publicId.split('?')[0];
            }
            
            // Remove file extension(s) - handle cases like 'file.png.png' or 'file.mind' or 'file.pdf'
            // Split by '.' and keep all parts except the last one
            const parts = publicId.split('.');
            if (parts.length > 1) {
              // Remove last extension
              publicId = parts.slice(0, -1).join('.');
              // If it still ends with a common image extension, remove it again (for cases like .png.png)
              const commonImageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
              const commonDocExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xls', '.xlsx', '.csv', '.ppt', '.pptx'];
              const lastExt = '.' + parts[parts.length - 1].toLowerCase();
              
              if (commonImageExts.includes(lastExt) || commonDocExts.includes(lastExt)) {
                // Check if there's another extension before this one
                const remainingParts = publicId.split('.');
                if (remainingParts.length > 1) {
                  const secondLastExt = '.' + remainingParts[remainingParts.length - 1].toLowerCase();
                  if (commonImageExts.includes(secondLastExt) || commonDocExts.includes(secondLastExt)) {
                    publicId = remainingParts.slice(0, -1).join('.');
                  }
                }
              }
            }
            
            return publicId;
          }
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting Cloudinary public_id from URL:', url, error);
        return null;
      }
    };
    
    // Check for project-specific files (priority)
    console.log(`🗑️ Collecting files to delete from project: ${project.name} (${project.id})`);
    
    // Check for design file in project
    if (project.uploadedFiles?.design?.url) {
      const designPublicId = extractCloudinaryPublicId(project.uploadedFiles.design.url);
      if (designPublicId) {
        filesToDelete.push({ publicId: designPublicId, type: 'image', name: 'design' });
        console.log('📄 Design file to delete:', designPublicId);
      }
    }
    
    // Check for video file in project
    if (project.uploadedFiles?.video?.url) {
      const videoPublicId = extractCloudinaryPublicId(project.uploadedFiles.video.url);
      if (videoPublicId) {
        filesToDelete.push({ publicId: videoPublicId, type: 'video', name: 'video' });
        console.log('🎥 Video file to delete:', videoPublicId);
      }
    }
    
    // Check for composite design file in project
    if (project.uploadedFiles?.compositeDesign?.url) {
      const compositePublicId = extractCloudinaryPublicId(project.uploadedFiles.compositeDesign.url);
      if (compositePublicId) {
        filesToDelete.push({ publicId: compositePublicId, type: 'image', name: 'composite' });
        console.log('🖼️ Composite design file to delete:', compositePublicId);
      }
    }
    
    // Check for mind target file in project (.mind files are type 'raw')
    if (project.uploadedFiles?.mindTarget?.url) {
      const mindPublicId = extractCloudinaryPublicId(project.uploadedFiles.mindTarget.url);
      if (mindPublicId) {
        filesToDelete.push({ publicId: mindPublicId, type: 'raw', name: 'mind-target' });
        console.log('🎯 Mind target file to delete:', mindPublicId);
      }
    }
    
    // Check for Phygitalized campaign files (document, pdf, video)
    // These are stored in uploadedFiles.document, uploadedFiles.pdf, or uploadedFiles.video
    if (project.uploadedFiles?.document?.url) {
      const documentPublicId = extractCloudinaryPublicId(project.uploadedFiles.document.url);
      if (documentPublicId) {
        // Determine resource type based on file extension or URL
        const url = project.uploadedFiles.document.url.toLowerCase();
        const resourceType = url.includes('.pdf') ? 'raw' : (url.includes('video/') ? 'video' : 'raw');
        filesToDelete.push({ publicId: documentPublicId, type: resourceType, name: 'document' });
        console.log('📄 Phygitalized document file to delete:', documentPublicId);
      }
    }
    
    if (project.uploadedFiles?.pdf?.url) {
      const pdfPublicId = extractCloudinaryPublicId(project.uploadedFiles.pdf.url);
      if (pdfPublicId) {
        filesToDelete.push({ publicId: pdfPublicId, type: 'raw', name: 'pdf' });
        console.log('📄 Phygitalized PDF file to delete:', pdfPublicId);
      }
    }
    
    // Check for Phygitalized video files (stored in uploadedFiles.video for Phygitalized campaigns)
    // Only add if it's from Phygitalized folder structure (not regular upload)
    if (project.uploadedFiles?.video?.url) {
      const videoUrl = project.uploadedFiles.video.url;
      // Check if it's from Phygitalized folder structure
      if (videoUrl.includes('Phygitalized/')) {
        const videoPublicId = extractCloudinaryPublicId(videoUrl);
        if (videoPublicId) {
          filesToDelete.push({ publicId: videoPublicId, type: 'video', name: 'phygitalized-video' });
          console.log('🎥 Phygitalized video file to delete:', videoPublicId);
        }
      }
    }
    
    // Check for documents array (upload page documents)
    if (project.uploadedFiles?.documents && Array.isArray(project.uploadedFiles.documents)) {
      console.log(`📄 Found ${project.uploadedFiles.documents.length} document(s) in project`);
      project.uploadedFiles.documents.forEach((doc, index) => {
        const docUrl = typeof doc === 'string' ? doc : doc.url;
        const docData = typeof doc === 'object' ? doc : null;
        
        console.log(`📄 Processing document ${index + 1}:`, {
          url: docUrl,
          hasUrl: !!docUrl,
          resourceType: docData?.resource_type,
          filename: docData?.filename,
          originalName: docData?.originalName
        });
        
        if (docUrl) {
          const docPublicId = extractCloudinaryPublicId(docUrl);
          console.log(`📄 Extracted public_id for document ${index + 1}:`, docPublicId);
          
          if (docPublicId) {
            // Determine resource type based on document data or URL
            let resourceType = 'raw'; // Default to raw for documents
            if (docData?.resource_type) {
              resourceType = docData.resource_type;
            } else {
              const urlLower = docUrl.toLowerCase();
              if (urlLower.includes('image/') || urlLower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
                resourceType = 'image';
              } else if (urlLower.includes('.pdf') || urlLower.includes('application/pdf')) {
                resourceType = 'raw';
              } else {
                resourceType = 'raw';
              }
            }
            
            filesToDelete.push({ 
              publicId: docPublicId, 
              type: resourceType, 
              name: `document-${index + 1}`,
              originalName: docData?.originalName || `document-${index + 1}`
            });
            console.log(`✅ Added document ${index + 1} to deletion queue:`, {
              publicId: docPublicId,
              type: resourceType,
              name: docData?.originalName || `document-${index + 1}`
            });
          } else {
            console.warn(`⚠️ Could not extract public_id from document ${index + 1} URL:`, docUrl);
          }
        } else {
          console.warn(`⚠️ Document ${index + 1} has no URL`);
        }
      });
    } else {
      console.log('ℹ️ No documents array found in project.uploadedFiles');
    }
    
    // Check for files in phygitalizedData (fileUrl, pdfUrl, videoUrl)
    if (project.phygitalizedData) {
      // Check fileUrl (for qr-links-video campaigns)
      if (project.phygitalizedData.fileUrl) {
        const filePublicId = extractCloudinaryPublicId(project.phygitalizedData.fileUrl);
        if (filePublicId) {
          const fileType = project.phygitalizedData.fileType || 'raw';
          const resourceType = fileType === 'video' ? 'video' : (fileType === 'document' ? 'raw' : 'raw');
          filesToDelete.push({ publicId: filePublicId, type: resourceType, name: 'phygitalized-file' });
          console.log('📄 Phygitalized fileUrl to delete:', filePublicId);
        }
      }
      
      // Check pdfUrl (for qr-links-pdf-video campaigns)
      if (project.phygitalizedData.pdfUrl) {
        const pdfPublicId = extractCloudinaryPublicId(project.phygitalizedData.pdfUrl);
        if (pdfPublicId) {
          filesToDelete.push({ publicId: pdfPublicId, type: 'raw', name: 'phygitalized-pdf' });
          console.log('📄 Phygitalized pdfUrl to delete:', pdfPublicId);
        }
      }
      
      // Check videoUrl (for qr-links-pdf-video and qr-links-ar-video campaigns)
      if (project.phygitalizedData.videoUrl) {
        const videoPublicId = extractCloudinaryPublicId(project.phygitalizedData.videoUrl);
        if (videoPublicId) {
          filesToDelete.push({ publicId: videoPublicId, type: 'video', name: 'phygitalized-video-url' });
          console.log('🎥 Phygitalized videoUrl to delete:', videoPublicId);
        }
      }
      
      // Check documentUrls array (for qr-links-ar-video campaigns with multiple documents)
      if (project.phygitalizedData.documentUrls && Array.isArray(project.phygitalizedData.documentUrls)) {
        project.phygitalizedData.documentUrls.forEach((docUrl, index) => {
          if (docUrl) {
            const docPublicId = extractCloudinaryPublicId(docUrl);
            if (docPublicId) {
              // Determine resource type based on URL
              const url = docUrl.toLowerCase();
              const resourceType = url.includes('.pdf') ? 'raw' : (url.includes('video/') ? 'video' : (url.match(/\.(jpg|jpeg|png|gif|webp)$/) ? 'image' : 'raw'));
              filesToDelete.push({ publicId: docPublicId, type: resourceType, name: `phygitalized-document-${index}` });
              console.log(`📄 Phygitalized document ${index + 1} to delete:`, docPublicId);
            }
          }
        });
      }
      
      // Check designUrl and compositeDesignUrl (for qr-links-ar-video campaigns)
      if (project.phygitalizedData.designUrl) {
        const designPublicId = extractCloudinaryPublicId(project.phygitalizedData.designUrl);
        if (designPublicId) {
          filesToDelete.push({ publicId: designPublicId, type: 'image', name: 'phygitalized-design' });
          console.log('🖼️ Phygitalized designUrl to delete:', designPublicId);
        }
      }
      
      if (project.phygitalizedData.compositeDesignUrl) {
        const compositePublicId = extractCloudinaryPublicId(project.phygitalizedData.compositeDesignUrl);
        if (compositePublicId) {
          filesToDelete.push({ publicId: compositePublicId, type: 'image', name: 'phygitalized-composite-design' });
          console.log('🖼️ Phygitalized compositeDesignUrl to delete:', compositePublicId);
        }
      }
    }
    
    // Fallback: Check root-level files if project files not found (backward compatibility)
    if (filesToDelete.length === 0) {
      console.log('⚠️ No files found in project, checking root-level files...');
      
      if (user.uploadedFiles?.design?.url) {
        const designPublicId = extractCloudinaryPublicId(user.uploadedFiles.design.url);
        if (designPublicId) {
          filesToDelete.push({ publicId: designPublicId, type: 'image', name: 'design' });
          console.log('📄 Design file to delete (root):', designPublicId);
        }
      }
      
      if (user.uploadedFiles?.video?.url) {
        const videoPublicId = extractCloudinaryPublicId(user.uploadedFiles.video.url);
        if (videoPublicId) {
          filesToDelete.push({ publicId: videoPublicId, type: 'video', name: 'video' });
          console.log('🎥 Video file to delete (root):', videoPublicId);
        }
      }
      
      if (user.uploadedFiles?.compositeDesign?.url) {
        const compositePublicId = extractCloudinaryPublicId(user.uploadedFiles.compositeDesign.url);
        if (compositePublicId) {
          filesToDelete.push({ publicId: compositePublicId, type: 'image', name: 'composite' });
          console.log('🖼️ Composite design file to delete (root):', compositePublicId);
        }
      }
      
      if (user.uploadedFiles?.mindTarget?.url) {
        const mindPublicId = extractCloudinaryPublicId(user.uploadedFiles.mindTarget.url);
        if (mindPublicId) {
          filesToDelete.push({ publicId: mindPublicId, type: 'raw', name: 'mind-target' });
          console.log('🎯 Mind target file to delete (root):', mindPublicId);
        }
      }
    }
    
    // Delete files from Cloudinary
    console.log(`🗑️ Attempting to delete ${filesToDelete.length} files from Cloudinary`);
    const cloudinaryDeletionResults = {
      successful: [],
      failed: []
    };
    
    for (const fileInfo of filesToDelete) {
      const { publicId, type, name, originalName } = fileInfo;
      try {
        console.log(`🗑️ Deleting ${name} (${type}): ${publicId}${originalName ? ` (${originalName})` : ''}`);
        
        // Use Cloudinary's destroy method with correct resource_type
        const cloudinary = require('cloudinary').v2;
        
        // Try deletion with the public_id as-is first
        let deleteResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: type, // 'image', 'video', or 'raw'
          invalidate: true
        });
        
        console.log(`📊 Delete result for ${name}:`, deleteResult);
        
        // If not found, try searching the folder to find the actual file
        if (deleteResult.result === 'not found') {
          console.log(`⚠️ Not found with public_id: ${publicId}, searching folder...`);
          
          try {
            // Extract folder path from public_id
            const folderPath = publicId.split('/').slice(0, -1).join('/');
            const baseName = publicId.split('/').pop();
            
            console.log(`🔍 Searching folder: ${folderPath} for file: ${baseName}`);
            
            // Search for files in that folder
            const searchResult = await cloudinary.api.resources({
              type: 'upload',
              prefix: folderPath,
              resource_type: type,
              max_results: 100 // Increased to find more files
            });
            
            console.log(`📦 Found ${searchResult.resources?.length || 0} file(s) in folder`);
            
            // Find file that matches the base name (with or without extension)
            const matchingFile = searchResult.resources?.find(r => {
              const rBaseName = r.public_id.split('/').pop();
              return r.public_id === publicId || 
                     r.public_id.startsWith(publicId) ||
                     rBaseName === baseName ||
                     rBaseName.startsWith(baseName) ||
                     rBaseName.includes(baseName.split('.')[0]); // Match without extension
            });
            
            if (matchingFile) {
              console.log(`✅ Found file with actual public_id: ${matchingFile.public_id}`);
              // Try deleting with the actual public_id
              deleteResult = await cloudinary.uploader.destroy(matchingFile.public_id, {
                resource_type: type,
                invalidate: true
              });
              console.log(`📊 Delete result with actual public_id:`, deleteResult);
            } else {
              console.warn(`⚠️ Could not find matching file in folder for: ${baseName}`);
              // List all files found for debugging
              if (searchResult.resources && searchResult.resources.length > 0) {
                console.log(`📋 Files found in folder:`, searchResult.resources.map(r => r.public_id));
              }
            }
          } catch (searchError) {
            console.error(`❌ Could not search folder:`, searchError.message);
            console.error(`❌ Search error details:`, searchError);
          }
        }
        
        if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
          const status = deleteResult.result === 'ok' ? 'deleted' : 'not found (may already be deleted)';
          console.log(`✅ ${status} ${name} from Cloudinary`);
          cloudinaryDeletionResults.successful.push({ publicId, name, type, originalName });
        } else {
          console.warn(`⚠️ Unexpected result when deleting ${name}:`, deleteResult);
          cloudinaryDeletionResults.failed.push({ 
            publicId, 
            name, 
            type, 
            originalName,
            error: `Unexpected result: ${deleteResult.result}`,
            details: deleteResult
          });
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${name} from Cloudinary:`, error.message);
        console.error(`❌ Error details:`, {
          message: error.message,
          stack: error.stack,
          publicId,
          type,
          name,
          originalName
        });
        cloudinaryDeletionResults.failed.push({ 
          publicId, 
          name, 
          type, 
          originalName,
          error: error.message,
          errorDetails: error.stack
        });
        // Continue with deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete entire Phygitalized folder for this project if it's a Phygitalized campaign
    if (project.campaignType && project.campaignType.startsWith('qr-')) {
      console.log(`🗑️ Deleting Phygitalized folder for campaign: ${project.campaignType}`);
      try {
        // Construct the folder path: Phygitalized/{variation}/{userId}/{projectId}
        // Use the same variation mapping as in uploadToPhygitalizedCloudinary
        const variationMap = {
          'qr-link': 'QR-Link',
          'qr-links': 'QR-Links',
          'qr-links-video': 'QR-Links-Video',
          'qr-links-pdf-video': 'QR-Links-PDF/Link-Video',
          'qr-links-ar-video': 'QR-Links-AR Video'
        };
        const variation = variationMap[project.campaignType] || project.campaignType;
        // Sanitize variation name (replace / with - for folder path, same as in uploadToPhygitalizedCloudinary)
        const sanitizedVariation = variation.replace(/\//g, '-');
        // Use user._id.toString() to match the folder structure used in uploads
        const userIdString = user._id.toString();
        const folderPrefix = `Phygitalized/${sanitizedVariation}/${userIdString}/${projectId}`;
        
        console.log(`🗑️ Deleting all files in Phygitalized folder: ${folderPrefix}`);
        
        const cloudinary = require('cloudinary').v2;
        
        // Delete all resources (images, videos, raw files) in the folder
        const resourceTypes = ['image', 'video', 'raw'];
        let totalDeleted = 0;
        
        for (const resourceType of resourceTypes) {
          try {
            // Search for all resources with this prefix
            const searchResult = await cloudinary.api.resources({
              type: 'upload',
              prefix: folderPrefix,
              resource_type: resourceType,
              max_results: 500 // Maximum allowed
            });
            
            if (searchResult.resources && searchResult.resources.length > 0) {
              console.log(`📦 Found ${searchResult.resources.length} ${resourceType} file(s) in folder`);
              
              // Extract public_ids
              const publicIds = searchResult.resources.map(r => r.public_id);
              
              // Delete in batches (Cloudinary allows up to 100 at a time)
              const batchSize = 100;
              for (let i = 0; i < publicIds.length; i += batchSize) {
                const batch = publicIds.slice(i, i + batchSize);
                try {
                  const deleteResult = await cloudinary.api.delete_resources(batch, {
                    resource_type: resourceType,
                    invalidate: true
                  });
                  
                  const deletedCount = deleteResult.deleted ? Object.keys(deleteResult.deleted).length : 0;
                  totalDeleted += deletedCount;
                  console.log(`✅ Deleted ${deletedCount} ${resourceType} file(s) from folder`);
                  
                  if (deleteResult.not_found && deleteResult.not_found.length > 0) {
                    console.log(`⚠️ ${deleteResult.not_found.length} file(s) not found (may have been deleted already)`);
                  }
                } catch (batchError) {
                  console.error(`❌ Error deleting batch of ${resourceType} files:`, batchError.message);
                }
              }
            }
          } catch (searchError) {
            console.log(`⚠️ Could not search for ${resourceType} files in folder: ${searchError.message}`);
          }
        }
        
        if (totalDeleted > 0) {
          console.log(`✅ Successfully deleted ${totalDeleted} file(s) from Phygitalized folder`);
        } else {
          console.log(`ℹ️ No files found in Phygitalized folder (may have been deleted already or folder doesn't exist)`);
        }
      } catch (folderDeleteError) {
        console.error(`❌ Error deleting Phygitalized folder:`, folderDeleteError.message);
        // Continue with project deletion even if folder deletion fails
      }
    }
    
    // Delete all analytics data for this project
    console.log(`📊 Deleting analytics data for project: ${project.id}`);
    let analyticsDeletedCount = 0;
    try {
      const analyticsDeleteResult = await Analytics.deleteMany({
        userId: userId,
        projectId: project.id
      });
      analyticsDeletedCount = analyticsDeleteResult.deletedCount;
      console.log(`✅ Deleted ${analyticsDeletedCount} analytics records for project ${project.id}`);
    } catch (analyticsError) {
      console.error('⚠️ Error deleting analytics data:', analyticsError);
      // Continue with project deletion even if analytics deletion fails
    }
    
    // Delete AR Experience records associated with this project's mindTarget file
    console.log(`🎯 Deleting AR Experience records for project: ${project.id}`);
    let arExperienceDeletedCount = 0;
    try {
      // Match AR experiences by the mindFileUrl (mindTarget URL) from the project
      const mindTargetUrl = project.uploadedFiles?.mindTarget?.url;
      if (mindTargetUrl) {
        const arExperienceDeleteResult = await ARExperience.deleteMany({
          mindFileUrl: mindTargetUrl
        });
        arExperienceDeletedCount = arExperienceDeleteResult.deletedCount;
        console.log(`✅ Deleted ${arExperienceDeletedCount} AR Experience records for project ${project.id}`);
      } else {
        console.log(`ℹ️ No mindTarget URL found for project ${project.id}, skipping AR Experience deletion`);
      }
    } catch (arError) {
      console.error('⚠️ Error deleting AR Experience records:', arError);
      // Continue with project deletion even if AR Experience deletion fails
    }
    
    // Log what will be deleted from the project object
    console.log(`🗑️ Deleting project data:`, {
      projectId: project.id,
      projectName: project.name,
      campaignType: project.campaignType,
      hasDesign: !!project.uploadedFiles?.design?.url,
      hasVideo: !!project.uploadedFiles?.video?.url,
      hasCompositeDesign: !!project.uploadedFiles?.compositeDesign?.url,
      hasMindTarget: !!project.uploadedFiles?.mindTarget?.url,
      documentsCount: project.uploadedFiles?.documents?.length || 0,
      hasSocialLinks: !!(project.socialLinks && Object.values(project.socialLinks).some(link => link)),
      socialLinks: project.socialLinks,
      hasPhygitalizedData: !!project.phygitalizedData,
      phygitalizedDataKeys: project.phygitalizedData ? Object.keys(project.phygitalizedData) : []
    });
    
    // Remove project from user's projects array
    // This automatically removes all project data including:
    // - uploadedFiles (design, video, compositeDesign, mindTarget, documents)
    // - socialLinks
    // - phygitalizedData
    // - qrPosition
    // - All other project properties
    user.projects.splice(projectIndex, 1);
    
    // If this was the current project, clear it
    if (user.currentProject === projectId) {
      user.currentProject = null;
      console.log(`✅ Cleared currentProject reference (was: ${projectId})`);
    }
    
    // Clear uploaded files and QR position if this was the only project
    // Keep social links as they are global and reusable across projects
    if (user.projects.length === 0) {
      user.uploadedFiles = {
        design: { url: null },
        video: { url: null },
        mindTarget: { generated: false }
      };
      user.qrPosition = null;
      // Don't clear social links - they persist across projects
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
    
    // Prepare response message based on deletion results
    let responseMessage = 'Campaign deleted successfully. All associated data has been removed:';
    const deletedItems = [];
    
    // Count what was deleted
    if (filesToDelete.length > 0) {
      deletedItems.push(`${filesToDelete.length} file(s) from Cloudinary`);
    }
    if (analyticsDeletedCount > 0) {
      deletedItems.push(`${analyticsDeletedCount} analytics record(s)`);
    }
    if (arExperienceDeletedCount > 0) {
      deletedItems.push(`${arExperienceDeletedCount} AR experience record(s)`);
    }
    
    // Always mention these are deleted (they're part of the project object)
    deletedItems.push('original image, composite image, video, documents, and social links');
    deletedItems.push('project data from MongoDB');
    
    responseMessage += ' ' + deletedItems.join(', ') + '.';
    
    if (cloudinaryDeletionResults.failed.length > 0) {
      responseMessage += ` (${cloudinaryDeletionResults.successful.length}/${filesToDelete.length} files successfully deleted from Cloudinary)`;
    }

    res.json({
      success: true,
      message: responseMessage,
      data: {
        deletedProject: {
          id: project.id,
          name: project.name
        },
        deletedFiles: filesToDelete.length,
        deletedAnalytics: analyticsDeletedCount,
        deletedARExperiences: arExperienceDeletedCount,
        cloudinaryDeletion: {
          successful: cloudinaryDeletionResults.successful.length,
          failed: cloudinaryDeletionResults.failed.length,
          details: cloudinaryDeletionResults
        }
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

/**
 * POST /api/upload/create-ar-experience
 * Create AR experience from uploaded design and video
 * Generates .mind file and saves AR experience data
 */
router.post('/create-ar-experience', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if user has uploaded design and video
    if (!user.uploadedFiles.design.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a design first'
      });
    }
    
    if (!user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload a video first'
      });
    }
    
    if (!user.qrPosition) {
      return res.status(400).json({
        status: 'error',
        message: 'Please set QR code position first'
      });
    }
    
    console.log('Creating AR experience for user:', user._id);
    
    // Generate .mind file from design image
    let mindTargetUrl = user.uploadedFiles.mindTarget?.url;
    
    if (!mindTargetUrl) {
      console.log('Generating .mind file from design image...');
      try {
        const mindTargetBuffer = await generateMindTarget(user.uploadedFiles.design.url, user._id.toString());
        if (mindTargetBuffer) {
          // Upload .mind file to S3
          const mindTargetKey = `users/${user._id}/targets/mind-${Date.now()}.mind`;
          const uploadResult = await uploadToCloudinaryBuffer(
            mindTargetBuffer,
            user._id,
            'targets',
            `mind-${Date.now()}.mind`,
            'application/octet-stream'
          );
          
          mindTargetUrl = uploadResult.url;
          
          // Update user with mind target
          await User.findByIdAndUpdate(user._id, {
            'uploadedFiles.mindTarget': {
              filename: uploadResult.key,
              originalName: `mind-target-${Date.now()}.mind`,
              url: uploadResult.url,
              size: mindTargetBuffer.length,
              uploadedAt: new Date(),
              generated: true
            }
          });
          
          console.log('.mind file generated and uploaded:', mindTargetUrl);
        }
      } catch (mindError) {
        console.error('Failed to generate .mind file:', mindError);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to generate AR target file'
        });
      }
    }
    
    if (!mindTargetUrl) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate AR target file'
      });
    }
    
    // Create AR experience
    const arExperienceData = {
      mindFileUrl: mindTargetUrl,
      videoUrl: user.uploadedFiles.video.url,
      socialLinks: user.socialLinks || {}
    };
    
    const arExperience = new ARExperience(arExperienceData);
    const savedArExperience = await arExperience.save();
    
    console.log('AR experience created with ID:', savedArExperience._id);
    
    // Generate QR code URL pointing to the AR experience
    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/scan/${savedArExperience._id}`;
    
    res.status(201).json({
      status: 'success',
      message: 'AR experience created successfully',
      data: {
        arExperienceId: savedArExperience._id,
        qrData: qrData,
        mindFileUrl: mindTargetUrl,
        videoUrl: user.uploadedFiles.video.url,
        socialLinks: user.socialLinks || {}
      }
    });
    
  } catch (error) {
    console.error('Create AR experience error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create AR experience',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /api/upload/project/:projectId/toggle-status
 * Toggle project enabled/disabled status
 * Allows users to enable or disable AR scanning for a project
 */
router.patch('/project/:projectId/toggle-status', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { isEnabled } = req.body;
    
    // Validate isEnabled parameter
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'isEnabled must be a boolean value'
      });
    }
    
    // Find user and project
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const projectIndex = user.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Update project status
    user.projects[projectIndex].isEnabled = isEnabled;
    await user.save();
    
    console.log(`✅ Project ${projectId} ${isEnabled ? 'enabled' : 'disabled'} for user ${userId}`);
    
    res.status(200).json({
      status: 'success',
      message: `Project ${isEnabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        projectId,
        isEnabled,
        project: user.projects[projectIndex]
      }
    });
    
  } catch (error) {
    console.error('Toggle project status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle project status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PATCH /api/upload/project/:projectId/toggle-target-image
 * Toggle project target image requirement
 * Allows users to enable or disable target image requirement for AR experience
 */
router.patch('/project/:projectId/toggle-target-image', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { requiresTargetImage } = req.body;
    
    // Validate requiresTargetImage parameter
    if (typeof requiresTargetImage !== 'boolean') {
      return res.status(400).json({
        status: 'error',
        message: 'requiresTargetImage must be a boolean value'
      });
    }
    
    // Find user and project
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    const projectIndex = user.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }
    
    // Update project target image requirement
    user.projects[projectIndex].requiresTargetImage = requiresTargetImage;
    user.projects[projectIndex].updatedAt = new Date();
    await user.save();
    
    console.log(`✅ Project ${projectId} target image ${requiresTargetImage ? 'required' : 'not required'} for user ${userId}`);
    
    res.status(200).json({
      status: 'success',
      message: `Target image ${requiresTargetImage ? 'required' : 'not required'} successfully`,
      data: {
        projectId,
        requiresTargetImage,
        project: user.projects[projectIndex]
      }
    });
    
  } catch (error) {
    console.error('Toggle target image requirement error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle target image requirement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/upload/file
 * Delete a file from Cloudinary by public_id
 * Query params: publicId (required), resourceType (optional, 'image' | 'video' | 'raw' | 'auto')
 */
router.delete('/file', authenticateToken, async (req, res) => {
  try {
    const { publicId, resourceType = 'auto' } = req.query

    if (!publicId) {
      return res.status(400).json({
        status: 'error',
        message: 'publicId is required'
      })
    }

    console.log(`🗑️ Deleting file from Cloudinary: ${publicId} (type: ${resourceType})`)

    // Determine resource type if auto
    let finalResourceType = resourceType
    if (resourceType === 'auto') {
      // Try to determine from public_id (check extension or use raw as default)
      if (publicId.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
        finalResourceType = 'video'
      } else if (publicId.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i)) {
        finalResourceType = 'image'
      } else {
        finalResourceType = 'raw' // Default for PDFs and other documents
      }
    }

    // Delete from Cloudinary
    const cloudinary = require('cloudinary').v2
    const deleteResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: finalResourceType,
      invalidate: true
    })

    if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
      const status = deleteResult.result === 'ok' ? 'deleted' : 'not found (may already be deleted)'
      console.log(`✅ ${status} file from Cloudinary: ${publicId}`)
      
      return res.status(200).json({
        status: 'success',
        message: `File ${status}`,
        data: { publicId, resourceType: finalResourceType, result: deleteResult.result }
      })
    } else {
      console.warn(`⚠️ Unexpected result when deleting file:`, deleteResult)
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete file',
        data: { publicId, resourceType: finalResourceType, result: deleteResult.result }
      })
    }
  } catch (error) {
    console.error('❌ Error deleting file from Cloudinary:', error)
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

/**
 * GET /api/upload/project/:projectId/upgrade-to-ar-data
 * Get existing campaign data formatted for AR Video upgrade
 * Returns data that can be pre-filled in LevelBasedUpload component
 */
router.get('/project/:projectId/upgrade-to-ar-data', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params

    console.log('📋 Getting upgrade data for AR Video:', { projectId })

    // Find user and project
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const project = user.projects.find(p => p.id === projectId)
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      })
    }

    // Extract existing data for pre-filling
    const upgradeData = {
      design: project.uploadedFiles?.design || null,
      qrPosition: project.qrPosition || project.phygitalizedData?.qrPosition || null,
      video: project.uploadedFiles?.video || null,
      videos: project.uploadedFiles?.videos || [],
      documents: project.uploadedFiles?.documents || [],
      socialLinks: project.phygitalizedData?.socialLinks || project.socialLinks || {},
      links: project.phygitalizedData?.links || [],
      campaignType: project.campaignType,
      projectId: project.id,
      projectName: project.name
    }

    // If videos array is empty but single video exists, convert it
    if (upgradeData.videos.length === 0 && upgradeData.video) {
      upgradeData.videos = [upgradeData.video]
    }

    // If documents array is empty but PDF exists, convert it
    if (upgradeData.documents.length === 0 && project.phygitalizedData?.pdfUrl) {
      upgradeData.documents = [{
        url: project.phygitalizedData.pdfUrl,
        filename: project.phygitalizedData.pdfUrl.split('/').pop(),
        originalName: project.phygitalizedData.pdfUrl.split('/').pop(),
        size: 0,
        uploadedAt: new Date()
      }]
    }

    console.log('✅ Upgrade data prepared:', {
      projectId,
      hasDesign: !!upgradeData.design,
      hasQRPosition: !!upgradeData.qrPosition,
      videosCount: upgradeData.videos.length,
      documentsCount: upgradeData.documents.length,
      hasSocialLinks: Object.keys(upgradeData.socialLinks).length > 0,
      linksCount: upgradeData.links.length
    })

    res.json({
      success: true,
      data: upgradeData
    })

  } catch (error) {
    console.error('❌ Error getting upgrade data:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get upgrade data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router;
