/**
 * Phygitalized Routes
 * Handles public access to phygitalized campaign pages (landing pages)
 * and file uploads for phygitalized campaigns
 */

const express = require('express')
const router = express.Router()
const multer = require('multer')
const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth')
const { uploadToCloudinaryBuffer, checkCloudinaryConnection } = require('../config/cloudinary')

// Configure multer for memory storage
const memoryStorage = multer.memoryStorage()
const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max file size
  }
})

// Upload file for phygitalized campaign
// POST /api/phygitalized/upload/:variation
router.post('/upload/:variation', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    console.log('📤 Phygitalized file upload request:', {
      variation: req.params.variation,
      hasFile: !!req.file,
      projectId: req.body.projectId,
      fileType: req.body.fileType
    })

    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    // Validate projectId
    const { projectId, fileType } = req.body
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      })
    }

    // Validate fileType
    if (!fileType) {
      return res.status(400).json({
        success: false,
        message: 'File type is required'
      })
    }

    // Check Cloudinary connection
    const cloudinaryConnected = await checkCloudinaryConnection()
    if (!cloudinaryConnected) {
      return res.status(500).json({
        success: false,
        message: 'File storage service unavailable'
      })
    }

    // Verify project exists and belongs to user
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

    console.log('📁 Uploading file to Cloudinary:', {
      userId: req.user._id,
      projectId: projectId,
      fileType: fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    })

    // Determine Cloudinary resource type and folder based on fileType
    let cloudinaryFolderType = fileType

    // Map fileType to Cloudinary folder and resource type
    if (fileType === 'video') {
      cloudinaryFolderType = 'video'
    } else if (fileType === 'pdf' || fileType === 'document') {
      cloudinaryFolderType = 'documents'
    } else if (fileType === 'image') {
      cloudinaryFolderType = 'designs'
    }
    
    // The uploadToCloudinaryBuffer function will determine resource_type based on:
    // - folder type (video -> video, documents -> raw for PDFs, designs -> image)
    // - content type (application/pdf -> raw, image/* -> image, video/* -> video)

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinaryBuffer(
      req.file.buffer,
      req.user._id,
      cloudinaryFolderType,
      req.file.originalname,
      req.file.mimetype,
      {
        quality: fileType === 'image' ? 'auto' : undefined
      }
    )

    console.log('✅ File uploaded successfully:', {
      url: uploadResult.url,
      public_id: uploadResult.public_id,
      size: uploadResult.size
    })

    // Return success response
    res.json({
      success: true,
      data: {
        file: {
          url: uploadResult.url,
          filename: uploadResult.public_id,
          originalName: req.file.originalname,
          size: uploadResult.size,
          format: uploadResult.format,
          resource_type: fileType === 'video' ? 'video' : (fileType === 'pdf' || fileType === 'document' ? 'raw' : 'image'),
          width: uploadResult.width,
          height: uploadResult.height
        }
      }
    })

  } catch (error) {
    console.error('❌ Phygitalized file upload error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to upload file to Cloudinary. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Update campaign data
// PUT /api/phygitalized/campaign/:projectId
router.put('/campaign/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const updateData = req.body

    console.log('📝 Updating phygitalized campaign:', {
      projectId,
      hasPhygitalizedData: !!updateData.phygitalizedData,
      hasFileUrls: !!updateData.fileUrls,
      hasQrCodeUrl: !!updateData.qrCodeUrl,
      hasLandingPageUrl: !!updateData.landingPageUrl
    })

    // Find user and project
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const projectIndex = user.projects.findIndex(p => p.id === projectId)
    if (projectIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      })
    }

    // Build update object
    const updateFields = {}

    // Update campaign type if provided
    if (updateData.campaignType) {
      updateFields[`projects.${projectIndex}.campaignType`] = updateData.campaignType
    }

    // Update QR code URL if provided
    if (updateData.qrCodeUrl !== undefined) {
      updateFields[`projects.${projectIndex}.qrCodeUrl`] = updateData.qrCodeUrl
    }

    // Update landing page URL if provided
    if (updateData.landingPageUrl !== undefined) {
      updateFields[`projects.${projectIndex}.landingPageUrl`] = updateData.landingPageUrl
    }

    // Update AR experience URL if provided
    if (updateData.arExperienceUrl !== undefined) {
      updateFields[`projects.${projectIndex}.arExperienceUrl`] = updateData.arExperienceUrl
    }

    // Update phygitalized data if provided
    if (updateData.phygitalizedData) {
      // Merge with existing phygitalizedData
      const existingPhygitalizedData = user.projects[projectIndex].phygitalizedData || {}
      updateFields[`projects.${projectIndex}.phygitalizedData`] = {
        ...existingPhygitalizedData,
        ...updateData.phygitalizedData
      }
    }

    // Update file URLs if provided
    if (updateData.fileUrls) {
      // Initialize uploadedFiles if it doesn't exist
      if (!user.projects[projectIndex].uploadedFiles) {
        updateFields[`projects.${projectIndex}.uploadedFiles`] = {}
      }

      // Update each file URL
      Object.keys(updateData.fileUrls).forEach(key => {
        const fileData = updateData.fileUrls[key]
        updateFields[`projects.${projectIndex}.uploadedFiles.${key}`] = fileData
      })
    }

    // Update videoUrl, pdfUrl, designImage if provided in phygitalizedData
    if (updateData.phygitalizedData?.videoUrl) {
      updateFields[`projects.${projectIndex}.videoUrl`] = updateData.phygitalizedData.videoUrl
    }
    if (updateData.phygitalizedData?.pdfUrl) {
      updateFields[`projects.${projectIndex}.pdfUrl`] = updateData.phygitalizedData.pdfUrl
    }
    if (updateData.phygitalizedData?.designUrl) {
      updateFields[`projects.${projectIndex}.designImage`] = updateData.phygitalizedData.designUrl
    }

    // Update social links if provided
    if (updateData.phygitalizedData?.socialLinks) {
      updateFields[`projects.${projectIndex}.socialLinks`] = updateData.phygitalizedData.socialLinks
    }

    // Update documents if provided
    if (updateData.phygitalizedData?.documentUrls) {
      updateFields[`projects.${projectIndex}.documents`] = updateData.phygitalizedData.documentUrls.map(url => ({ url }))
    }

    // Update the project
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      { new: true }
    ).select('-password')

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      })
    }

    const updatedProject = updatedUser.projects.find(p => p.id === projectId)

    console.log('✅ Campaign updated successfully:', {
      projectId,
      projectName: updatedProject?.name
    })

    res.json({
      success: true,
      data: {
        project: updatedProject
      }
    })

  } catch (error) {
    console.error('❌ Error updating campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get public campaign data by project ID (no auth required - for public landing pages)
router.get('/campaign/public/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params
    const pageId = projectId // Alias for consistency
    
    console.log('📄 Fetching public campaign:', { pageId })
    
    // Find user with this project
    const user = await User.findOne({ 'projects.id': pageId })
    
    if (!user) {
      console.log('❌ Campaign not found:', pageId)
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }
    
    // Find the specific project
    const project = user.projects.find(p => p.id === pageId)
    
    if (!project) {
      console.log('❌ Project not found in user:', pageId)
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }
    
    // Check if campaign is paused (isEnabled === false)
    if (project.isEnabled === false) {
      console.log(`🚫 Campaign ${pageId} is paused by owner`)
      return res.status(403).json({
        success: false,
        message: 'This campaign has been paused by its owner',
        projectName: project.name,
        isDisabled: true
      })
    }
    
    console.log('📊 Campaign status:', { pageId, status: project.status || 'no-status', isEnabled: project.isEnabled })
    
    console.log('✅ Campaign found:', {
      pageId,
      projectName: project.name,
      type: project.type,
      hasPhygitalizedData: !!project.phygitalizedData,
      templateId: project.phygitalizedData?.templateId,
      templateConfig: project.phygitalizedData?.templateConfig
    })
    
    // Return public campaign data
    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        type: project.type || project.campaignType, // Use campaignType as fallback
        campaignType: project.campaignType, // Also include campaignType explicitly
        description: project.description,
        status: project.status,
        userId: user._id.toString(), // Include userId for analytics tracking
        // Phygitalized data (includes template settings)
        phygitalizedData: project.phygitalizedData || {},
        // Media files
        designImage: project.designImage,
        videoUrl: project.videoUrl,
        pdfUrl: project.pdfUrl,
        // Uploaded files (for LandingPage to access)
        uploadedFiles: project.uploadedFiles || {},
        // Social links
        socialLinks: project.socialLinks || {},
        // Documents
        documents: project.documents || [],
        // Timestamps
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    })
  } catch (error) {
    console.error('❌ Error fetching public campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message
    })
  }
})

// Get campaign for AR experience (minimal data for performance)
router.get('/ar/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params
    
    console.log('🎮 Fetching AR campaign data:', { pageId })
    
    // Find user with this project
    const user = await User.findOne({ 'projects.id': pageId })
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }
    
    const project = user.projects.find(p => p.id === pageId)
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      })
    }
    
    // Check if campaign is paused (isEnabled === false)
    if (project.isEnabled === false) {
      console.log(`🚫 AR Campaign ${pageId} is paused by owner`)
      return res.status(403).json({
        success: false,
        message: 'This campaign has been paused by its owner',
        projectName: project.name,
        isDisabled: true
      })
    }
    
    // Return minimal AR data
    res.json({
      success: true,
      data: {
        id: project.id,
        name: project.name,
        type: project.type,
        designImage: project.designImage,
        videoUrl: project.videoUrl,
        phygitalizedData: project.phygitalizedData || {}
      }
    })
  } catch (error) {
    console.error('❌ Error fetching AR campaign data:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AR data',
      error: error.message
    })
  }
})

module.exports = router
