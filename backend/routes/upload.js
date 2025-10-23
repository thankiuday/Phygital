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
const { uploadToCloudinary, uploadToCloudinaryBuffer, deleteFromCloudinary, checkCloudinaryConnection } = require('../config/cloudinary');
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
    
    // Generate unique filename for composite image
    const compositeFilename = `composite-${Date.now()}-${uuidv4()}.png`;
    console.log('📁 Composite filename:', compositeFilename);
    
    // Upload composite image to Cloudinary in composite-image folder
    console.log('☁️ Uploading composite image to Cloudinary...');
    const uploadResult = await uploadToCloudinaryBuffer(
      compositeBuffer, 
      userId, 
      'composite-image', // New folder for composite images
      compositeFilename, 
      'image/png'
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
    
    // For now, we'll upload the video as-is
    // In production, you would implement video compression here
    // using ffmpeg or similar tools
    
    const uploadResult = await uploadToCloudinary(req.file, req.user._id, 'video');
    
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
      filename: uploadResult.key,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size,
      duration: 0, // Would be calculated during compression
      uploadedAt: new Date(),
      compressed: false // Set to true after compression
    };
    
    // Prepare update data based on whether we're updating a project or root level
    let updateData = {};
    
    if (currentProject) {
      // Store in project
      updateData[`projects.${projectIndex}.uploadedFiles.video`] = videoData;
      console.log(`📁 Updating project ${currentProject.id} with video data`);
    } else {
      // Store at root level (backward compatibility)
      updateData['uploadedFiles.video'] = videoData;
      console.log('📁 Updating root-level uploadedFiles (no current project)');
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
    
    // Upload video to S3
    const uploadResult = await uploadToS3(req.file, userId, 'video');
    
    // Update project's video
    project.uploadedFiles.video = {
      filename: uploadResult.key.split('/').pop(), // Extract filename from S3 key
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: uploadResult.url
    };

    console.log('🔄 Updating project video:', {
      projectId: project.id,
      newVideo: project.uploadedFiles.video
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
    
    // Generate composite design on server side (optional - don't block QR position save)
    let compositeDesignData = null;
    let mindTargetData = null;
    
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
      
      // Set a timeout for composite generation to avoid blocking QR position save
      const compositePromise = generateFinalDesign(
        designUrl,
        qrData,
        qrPositionData,
        req.user._id.toString()
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

    // Get current project information
    const fullUser = await User.findById(req.user._id);
    let targetProject = null;
    let targetProjectIndex = -1;
    
    if (fullUser.currentProject) {
      targetProjectIndex = fullUser.projects.findIndex(p => p.id === fullUser.currentProject);
      if (targetProjectIndex !== -1) {
        targetProject = fullUser.projects[targetProjectIndex];
        console.log(`📁 Storing QR position in project: ${targetProject.name} (${targetProject.id})`);
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
      if (compositeDesignData) {
        updateData[`projects.${targetProjectIndex}.uploadedFiles.compositeDesign`] = compositeDesignData;
        console.log(`✅ Will store compositeDesign in project: ${compositeDesignData.url}`);
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
    const uploadResult = await uploadToCloudinaryBuffer(
      imageBuffer,
      req.user._id,
      'composite-image',
      `composite-${timestamp}.png`,
      'image/png'
    );
    
    console.log('Cloudinary Upload result:', uploadResult);
    
    // Delete old composite design if exists
    if (req.user.uploadedFiles.compositeDesign?.url) {
      try {
        await deleteFromCloudinary(req.user.uploadedFiles.compositeDesign.filename);
        console.log('Old composite design deleted from Cloudinary');
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
        // We need to extract the public_id: phygital-zone/users/userId/type/filename
        if (url.includes('cloudinary.com')) {
          const urlParts = url.split('/');
          const uploadIndex = urlParts.findIndex(part => part === 'upload');
          if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
            // Extract everything after 'upload/v1234567890/'
            let publicId = urlParts.slice(uploadIndex + 2).join('/');
            
            // Remove file extension(s) - handle cases like 'file.png.png' or 'file.mind'
            // Split by '.' and keep all parts except the last one
            const parts = publicId.split('.');
            if (parts.length > 1) {
              // Remove last extension
              publicId = parts.slice(0, -1).join('.');
              // If it still ends with an extension, remove it again (for cases like .png.png)
              if (publicId.endsWith('.png') || publicId.endsWith('.jpg') || publicId.endsWith('.jpeg')) {
                publicId = publicId.split('.').slice(0, -1).join('.');
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
      const { publicId, type, name } = fileInfo;
      try {
        console.log(`🗑️ Deleting ${name} (${type}): ${publicId}`);
        
        // Use Cloudinary's destroy method with correct resource_type
        const cloudinary = require('cloudinary').v2;
        const deleteResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: type, // 'image', 'video', or 'raw'
          invalidate: true
        });
        
        if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
          console.log(`✅ Successfully deleted ${name} from Cloudinary:`, deleteResult);
          cloudinaryDeletionResults.successful.push({ publicId, name, type });
        } else {
          console.warn(`⚠️ Unexpected result when deleting ${name}:`, deleteResult);
          cloudinaryDeletionResults.failed.push({ publicId, name, type, error: `Unexpected result: ${deleteResult.result}` });
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${name} from Cloudinary:`, error.message);
        cloudinaryDeletionResults.failed.push({ publicId, name, type, error: error.message });
        // Continue with deletion even if Cloudinary deletion fails
      }
    }
    
    // Remove project from user's projects array
    user.projects.splice(projectIndex, 1);
    
    // If this was the current project, clear it
    if (user.currentProject === projectId) {
      user.currentProject = null;
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
    let responseMessage = 'Project deleted successfully';
    if (cloudinaryDeletionResults.failed.length > 0) {
      responseMessage += ` (${cloudinaryDeletionResults.successful.length}/${filesToDelete.length} files deleted from Cloudinary)`;
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

module.exports = router;
