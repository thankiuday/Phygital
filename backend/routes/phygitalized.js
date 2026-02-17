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
    fileSize: 500 * 1024 * 1024 // 500MB max file size (default for general uploads)
  }
})

// Multer configuration for QR Links Video campaigns (50MB limit for videos)
const uploadQRLinksVideo = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for QR Links Video campaigns
  }
})

// Upload file for phygitalized campaign
// POST /api/phygitalized/upload/:variation
// For 'qr-links-video' variation, uses 50MB limit for videos
router.post('/upload/:variation', authenticateToken, (req, res, next) => {
  // Use 50MB limit for QR Links Video campaigns
  const variation = req.params.variation;
  const isQRLinksVideo = variation === 'qr-links-video' && req.body.fileType === 'video';
  const multerConfig = isQRLinksVideo ? uploadQRLinksVideo : upload;
  
  multerConfig.single('file')(req, res, (err) => {
    if (err) {
      // Handle multer errors
      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxSizeMB = isQRLinksVideo ? 50 : 500;
          return res.status(413).json({
            success: false,
            message: `File size exceeds the maximum limit of ${maxSizeMB}MB. Please compress your file or use a smaller file.`,
            code: 'FILE_TOO_LARGE',
            maxSizeMB: maxSizeMB
          });
        }
      }
      return next(err);
    }
    next();
  });
}, async (req, res) => {
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

    // Track fields to unset separately (needed for file removal)
    const unsetFields = {}
    
    // Track which phygitalizedData fields need to be unset (to avoid conflicts)
    const phygitalizedDataFieldsToUnset = new Set()
    
    // Update file URLs if provided
    if (updateData.fileUrls) {
      // Initialize uploadedFiles if it doesn't exist
      if (!user.projects[projectIndex].uploadedFiles) {
        updateFields[`projects.${projectIndex}.uploadedFiles`] = {}
      }
      
      // Update each file URL
      Object.keys(updateData.fileUrls).forEach(key => {
        const fileData = updateData.fileUrls[key]
        
        // If fileData is null or empty array, remove the file from database using $unset
        const isEmpty = fileData === null || (Array.isArray(fileData) && fileData.length === 0)
        
        if (isEmpty) {
          unsetFields[`projects.${projectIndex}.uploadedFiles.${key}`] = ''
          
          // Also clear related fields for videos and documents
          if (key === 'video' || key === 'videos') {
            unsetFields[`projects.${projectIndex}.phygitalizedData.videoUrl`] = ''
            unsetFields[`projects.${projectIndex}.videoUrl`] = ''
            unsetFields[`projects.${projectIndex}.phygitalizedData.fileUrl`] = ''
            phygitalizedDataFieldsToUnset.add('videoUrl')
            phygitalizedDataFieldsToUnset.add('fileUrl')
          } else if (key === 'pdf') {
            unsetFields[`projects.${projectIndex}.phygitalizedData.pdfUrl`] = ''
            unsetFields[`projects.${projectIndex}.pdfUrl`] = ''
            phygitalizedDataFieldsToUnset.add('pdfUrl')
          } else if (key === 'document' || key === 'documents') {
            unsetFields[`projects.${projectIndex}.phygitalizedData.fileUrl`] = ''
            unsetFields[`projects.${projectIndex}.phygitalizedData.pdfUrl`] = ''
            unsetFields[`projects.${projectIndex}.phygitalizedData.documentUrls`] = ''
            phygitalizedDataFieldsToUnset.add('fileUrl')
            phygitalizedDataFieldsToUnset.add('pdfUrl')
            phygitalizedDataFieldsToUnset.add('documentUrls')
          }
        } else {
          // Set the file data
          updateFields[`projects.${projectIndex}.uploadedFiles.${key}`] = fileData
          
          // Track phygitalizedData fields to set (we'll add them to the merged object later)
          // If setting videos array, also update phygitalizedData.videoUrl with first video
          if (key === 'videos' && Array.isArray(fileData) && fileData.length > 0 && fileData[0]?.url) {
            // Store in a temporary object that we'll merge into phygitalizedData later
            if (!updateFields._phygitalizedDataUpdates) {
              updateFields._phygitalizedDataUpdates = {}
            }
            updateFields._phygitalizedDataUpdates.videoUrl = fileData[0].url
            phygitalizedDataFieldsToUnset.delete('videoUrl') // Remove from unset if we're setting it
          }
          // If setting documents array, also update phygitalizedData.documentUrls
          if (key === 'documents' && Array.isArray(fileData) && fileData.length > 0) {
            const documentUrls = fileData.map(doc => doc.url || doc).filter(Boolean)
            if (documentUrls.length > 0) {
              if (!updateFields._phygitalizedDataUpdates) {
                updateFields._phygitalizedDataUpdates = {}
              }
              updateFields._phygitalizedDataUpdates.documentUrls = documentUrls
              // Also set pdfUrl to first document if it's a PDF
              if (documentUrls[0]) {
                updateFields._phygitalizedDataUpdates.pdfUrl = documentUrls[0]
              }
              phygitalizedDataFieldsToUnset.delete('documentUrls')
              phygitalizedDataFieldsToUnset.delete('pdfUrl')
            }
          }
        }
      })
    }

    // Update phygitalized data if provided (but exclude fields that need to be unset)
    // Also merge in any phygitalizedData updates from file operations
    const hasPhygitalizedDataUpdate = updateData.phygitalizedData || updateFields._phygitalizedDataUpdates
    
    // IMPORTANT: If we're unsetting nested phygitalizedData fields, we CANNOT set the whole object
    // MongoDB doesn't allow both $set on parent and $unset on child in same operation
    const hasNestedUnsets = phygitalizedDataFieldsToUnset.size > 0
    
    if (hasPhygitalizedDataUpdate) {
      if (hasNestedUnsets) {
        // If we're unsetting nested fields, only set individual fields (not the whole object)
        // This avoids MongoDB conflicts
        
        // Set individual fields that aren't being unset
        if (updateData.phygitalizedData) {
          Object.keys(updateData.phygitalizedData).forEach(key => {
            if (!phygitalizedDataFieldsToUnset.has(key)) {
              updateFields[`projects.${projectIndex}.phygitalizedData.${key}`] = updateData.phygitalizedData[key]
            }
          })
        }
        
        // Merge in phygitalizedData updates from file operations
        if (updateFields._phygitalizedDataUpdates) {
          Object.keys(updateFields._phygitalizedDataUpdates).forEach(key => {
            if (!phygitalizedDataFieldsToUnset.has(key)) {
              updateFields[`projects.${projectIndex}.phygitalizedData.${key}`] = updateFields._phygitalizedDataUpdates[key]
            }
          })
          // Remove the temporary object
          delete updateFields._phygitalizedDataUpdates
        }
      } else {
        // No nested unsets, safe to set the whole object
        const existingPhygitalizedData = user.projects[projectIndex].phygitalizedData || {}
        const phygitalizedDataToSet = { ...existingPhygitalizedData }
        
        // Add/update fields from updateData.phygitalizedData
        if (updateData.phygitalizedData) {
          Object.keys(updateData.phygitalizedData).forEach(key => {
            phygitalizedDataToSet[key] = updateData.phygitalizedData[key]
          })
        }
        
        // Merge in phygitalizedData updates from file operations
        if (updateFields._phygitalizedDataUpdates) {
          Object.keys(updateFields._phygitalizedDataUpdates).forEach(key => {
            phygitalizedDataToSet[key] = updateFields._phygitalizedDataUpdates[key]
          })
          // Remove the temporary object
          delete updateFields._phygitalizedDataUpdates
        }
        
        // Only set phygitalizedData if we have fields to set
        if (Object.keys(phygitalizedDataToSet).length > 0) {
          updateFields[`projects.${projectIndex}.phygitalizedData`] = phygitalizedDataToSet
        }
      }
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

    // Build the update object - separate $set and $unset operations
    const updateObject = {}
    
    // Separate $set and $unset fields
    const setFields = {}
    
    // Use the unsetFields we built earlier (not from updateFields.$unset)
    // unsetFields is already defined in the scope above
    
    Object.keys(updateFields).forEach(key => {
      // Skip temporary fields and $unset
      if (key !== '$unset' && key !== '_phygitalizedDataUpdates') {
        setFields[key] = updateFields[key]
      }
    })
    
    if (Object.keys(setFields).length > 0) {
      updateObject.$set = setFields
    }
    if (Object.keys(unsetFields).length > 0) {
      updateObject.$unset = unsetFields
    }
    
    // Debug: Log update object to help diagnose conflicts
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Update object:', {
        setFieldsCount: Object.keys(setFields).length,
        unsetFieldsCount: Object.keys(unsetFields).length,
        hasPhygitalizedDataSet: !!setFields[`projects.${projectIndex}.phygitalizedData`],
        phygitalizedDataUnsets: Object.keys(unsetFields).filter(k => k.includes('phygitalizedData')),
        setFieldsKeys: Object.keys(setFields).filter(k => k.includes('phygitalizedData')),
        unsetFieldsKeys: Object.keys(unsetFields)
      })
    }

    // Update the project
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateObject,
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
        uploadedFiles: {
          ...(project.uploadedFiles || {}),
          // Include both single video (backward compatibility) and videos array
          video: project.uploadedFiles?.video || null,
          videos: project.uploadedFiles?.videos || [],
          // Include documents array
          documents: project.uploadedFiles?.documents || []
        },
        // Social links
        socialLinks: project.socialLinks || {},
        // Documents (legacy, use uploadedFiles.documents instead)
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

// Upgrade campaign type
// POST /api/phygitalized/upgrade-campaign
router.post('/upgrade-campaign', authenticateToken, async (req, res) => {
  try {
    const { projectId, newCampaignType, upgradeData = {} } = req.body

    console.log('🔄 Upgrading campaign:', {
      projectId,
      newCampaignType,
      currentType: upgradeData.currentType
    })

    // Validate inputs
    if (!projectId || !newCampaignType) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and new campaign type are required'
      })
    }

    // Valid campaign types
    const validTypes = ['qr-link', 'qr-links', 'qr-links-video', 'qr-links-pdf-video', 'qr-links-ar-video']
    if (!validTypes.includes(newCampaignType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign type'
      })
    }

    // Find user and project - use select() to only fetch needed fields for optimization
    const user = await User.findById(req.user._id).select('projects')
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

    const project = user.projects[projectIndex]
    const currentType = project.campaignType || upgradeData.currentType

    // If already at the target type, return success without doing anything
    if (currentType === newCampaignType) {
      return res.status(200).json({
        success: true,
        message: `Campaign is already at ${newCampaignType}`,
        data: {
          projectId,
          campaignType: currentType
        }
      })
    }

    // Validate upgrade path
    const upgradePaths = {
      'qr-link': ['qr-links', 'qr-links-video', 'qr-links-pdf-video', 'qr-links-ar-video'],
      'qr-links': ['qr-links-video', 'qr-links-pdf-video', 'qr-links-ar-video'],
      'qr-links-video': ['qr-links-pdf-video', 'qr-links-ar-video'],
      'qr-links-pdf-video': ['qr-links-ar-video']
    }

    if (!upgradePaths[currentType] || !upgradePaths[currentType].includes(newCampaignType)) {
      return res.status(400).json({
        success: false,
        message: `Cannot upgrade from ${currentType} to ${newCampaignType}`
      })
    }

    // Prepare update fields
    const updateFields = {}
    const existingData = upgradeData.existingData || {}
    const baseUrl = process.env.FRONTEND_URL || 'https://phygital.zone'

    // Update campaign type
    updateFields[`projects.${projectIndex}.campaignType`] = newCampaignType

    // Initialize phygitalizedData if it doesn't exist
    const currentPhygitalizedData = project.phygitalizedData || {}
    const updatedPhygitalizedData = { ...currentPhygitalizedData }

    // Handle data migration based on upgrade path
    if (currentType === 'qr-link' && newCampaignType === 'qr-links') {
      // Check multiple locations for original URL
      const linkUrl = project.phygitalizedData?.linkUrl || 
                      project.targetUrl || 
                      project.phygitalizedData?.redirectUrl
      
      console.log('🔄 Upgrade: Checking for original link URL:', {
        projectId,
        linkUrl,
        hasPhygitalizedLinkUrl: !!project.phygitalizedData?.linkUrl,
        hasTargetUrl: !!project.targetUrl,
        hasRedirectUrl: !!project.phygitalizedData?.redirectUrl,
        existingLinks: updatedPhygitalizedData.links?.length || 0
      })
      
      if (linkUrl) {
        // Normalize URL for comparison (remove trailing slashes, convert to lowercase)
        const normalizeUrl = (url) => {
          try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
            return urlObj.hostname + urlObj.pathname.replace(/\/$/, '')
          } catch {
            return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
          }
        }
        
        // Get existing links (if any)
        const existingLinks = updatedPhygitalizedData.links || []
        const normalizedLinkUrl = normalizeUrl(linkUrl)
        
        // Check if original link already exists in array
        const linkExists = existingLinks.some(link => {
          if (!link || !link.url) return false
          return normalizeUrl(link.url) === normalizedLinkUrl
        })
        
        console.log('🔄 Upgrade: Link check result:', {
          linkUrl,
          normalizedLinkUrl,
          linkExists,
          existingLinksCount: existingLinks.length
        })
        
        // Add original link if it doesn't exist, or ensure links array is initialized
        if (!linkExists) {
          const originalLink = {
            label: 'Link 1',
            url: linkUrl.startsWith('http://') || linkUrl.startsWith('https://') 
              ? linkUrl 
              : `https://${linkUrl}`
          }
          
          // Put original link first, then existing links
          updatedPhygitalizedData.links = [originalLink, ...existingLinks]
          
          console.log('✅ Upgrade: Added original link to links array:', {
            originalLink,
            totalLinks: updatedPhygitalizedData.links.length,
            allLinks: updatedPhygitalizedData.links.map(l => ({ label: l.label, url: l.url }))
          })
        } else {
          // Ensure links array exists even if link already exists
          if (!updatedPhygitalizedData.links) {
            updatedPhygitalizedData.links = existingLinks
          }
          console.log('ℹ️ Upgrade: Original link already exists in links array')
        }
      } else {
        console.log('⚠️ Upgrade: No original link URL found in project data')
      }

      // Generate landing page URL
      updateFields[`projects.${projectIndex}.landingPageUrl`] = `${baseUrl}/#/phygitalized/links/${projectId}`
    }

    // For upgrades to qr-links-video, preserve links and add video support
    if (newCampaignType === 'qr-links-video') {
      // Preserve links if they exist
      if (existingData.links && existingData.links.length > 0) {
        updatedPhygitalizedData.links = existingData.links
      } else if (currentType === 'qr-link') {
        // Convert single link to array
        const linkUrl = project.phygitalizedData?.linkUrl || project.targetUrl
        if (linkUrl) {
          updatedPhygitalizedData.links = [{
            label: 'Link 1',
            url: linkUrl
          }]
        }
      }

      // Generate landing page URL
      updateFields[`projects.${projectIndex}.landingPageUrl`] = `${baseUrl}/#/phygitalized/video/${projectId}`
    }

    // For upgrades to qr-links-pdf-video, preserve all existing data
    if (newCampaignType === 'qr-links-pdf-video') {
      // Preserve links
      if (existingData.links && existingData.links.length > 0) {
        updatedPhygitalizedData.links = existingData.links
      } else if (currentPhygitalizedData.links) {
        updatedPhygitalizedData.links = currentPhygitalizedData.links
      }

      // Preserve videos
      if (existingData.videos && existingData.videos.length > 0) {
        if (!project.uploadedFiles) {
          updateFields[`projects.${projectIndex}.uploadedFiles`] = {}
        }
        updateFields[`projects.${projectIndex}.uploadedFiles.videos`] = existingData.videos
      }

      // Generate landing page URL
      updateFields[`projects.${projectIndex}.landingPageUrl`] = `${baseUrl}/#/phygitalized/pdf-video/${projectId}`
    }

    // For upgrades to qr-links-ar-video, prepare data structure in phygitalizedData format
    if (newCampaignType === 'qr-links-ar-video') {
      // Extract video URLs from uploadedFiles format and store in phygitalizedData format
      // This prepares the structure - actual data will be saved when user completes upload flow
      
      // Extract video URL(s) from uploadedFiles.video or uploadedFiles.videos
      const projectVideo = project.uploadedFiles?.video;
      const projectVideos = project.uploadedFiles?.videos || [];
      
      // Combine single video and videos array
      const allVideos = [];
      if (projectVideo?.url) {
        allVideos.push(projectVideo.url);
      }
      projectVideos.forEach(v => {
        const videoUrl = typeof v === 'string' ? v : v.url;
        if (videoUrl && !allVideos.includes(videoUrl)) {
          allVideos.push(videoUrl);
        }
      });
      
      // Store first video as primary (will be updated when user selects in upload flow)
      if (allVideos.length > 0) {
        updatedPhygitalizedData.videoUrl = allVideos[0];
        // Store additional videos if any
        if (allVideos.length > 1) {
          updatedPhygitalizedData.additionalVideoUrls = allVideos.slice(1);
        }
      }
      
      // Extract design URL
      if (project.uploadedFiles?.design?.url) {
        updatedPhygitalizedData.designUrl = project.uploadedFiles.design.url;
      }
      
      // Extract composite design URL
      if (project.uploadedFiles?.compositeDesign?.url) {
        updatedPhygitalizedData.compositeDesignUrl = project.uploadedFiles.compositeDesign.url;
      }
      
      // Extract document URLs from uploadedFiles.documents array
      const projectDocuments = project.uploadedFiles?.documents || [];
      if (projectDocuments.length > 0) {
        updatedPhygitalizedData.documentUrls = projectDocuments.map(doc => 
          typeof doc === 'string' ? doc : doc.url
        ).filter(Boolean);
      }
      
      // Generate landing page URL for AR video
      const userId = user._id.toString();
      updateFields[`projects.${projectIndex}.landingPageUrl`] = `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
    }

    // Preserve social links in all upgrades
    if (existingData.socialLinks && Object.keys(existingData.socialLinks).length > 0) {
      updatedPhygitalizedData.socialLinks = existingData.socialLinks
    } else if (project.socialLinks && Object.keys(project.socialLinks).length > 0) {
      updatedPhygitalizedData.socialLinks = project.socialLinks
    }

    // Update phygitalizedData
    updateFields[`projects.${projectIndex}.phygitalizedData`] = updatedPhygitalizedData

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

    console.log('✅ Campaign upgraded successfully:', {
      projectId,
      fromType: currentType,
      toType: newCampaignType,
      projectName: updatedProject?.name
    })

    res.json({
      success: true,
      message: `Campaign upgraded from ${currentType} to ${newCampaignType}`,
      data: {
        project: updatedProject
      }
    })

  } catch (error) {
    console.error('❌ Error upgrading campaign:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade campaign',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Delete campaign file (video, document, pdf)
// DELETE /api/phygitalized/file/:projectId
router.delete('/file/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params
    const { kind } = req.query // 'video', 'document', 'pdf'

    console.log('🗑️ Deleting campaign file:', { projectId, kind })

    if (!kind) {
      return res.status(400).json({
        success: false,
        message: 'File kind is required (video, document, or pdf)'
      })
    }

    // Valid file kinds
    const validKinds = ['video', 'document', 'pdf']
    if (!validKinds.includes(kind)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file kind. Must be one of: ${validKinds.join(', ')}`
      })
    }

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

    const project = user.projects[projectIndex]

    // Determine which file to delete based on kind
    let fileToDelete = null
    let filePath = null

    if (kind === 'video') {
      fileToDelete = project.uploadedFiles?.video
      filePath = `projects.${projectIndex}.uploadedFiles.video`
    } else if (kind === 'document') {
      fileToDelete = project.uploadedFiles?.document
      filePath = `projects.${projectIndex}.uploadedFiles.document`
    } else if (kind === 'pdf') {
      fileToDelete = project.uploadedFiles?.pdf
      filePath = `projects.${projectIndex}.uploadedFiles.pdf`
    }

    if (!fileToDelete || !fileToDelete.url) {
      console.log(`ℹ️ No ${kind} file found to delete for project ${projectId}`)
      return res.status(200).json({
        success: true,
        message: `No ${kind} file found to delete`,
        data: { projectId, kind, deleted: false }
      })
    }

    // Extract Cloudinary public_id from URL
    const cloudinary = require('cloudinary').v2
    
    // Helper function to extract public_id from Cloudinary URL
    const extractCloudinaryPublicId = (file) => {
      if (!file || !file.url) return null
      
      // Try to get public_id from filename field first (if it's already stored)
      if (file.filename) {
        return file.filename
      }
      
      const url = file.url
      if (!url || !url.includes('cloudinary.com')) return null
      
      try {
        // Parse Cloudinary URL: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{public_id}.{format}
        const urlParts = url.split('/')
        const uploadIndex = urlParts.findIndex(part => part === 'upload')
        
        if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
          // Extract everything after 'upload/v1234567890/'
          let extractedPublicId = urlParts.slice(uploadIndex + 2).join('/')
          
          // Remove query parameters if any (e.g., ?v=123)
          if (extractedPublicId.includes('?')) {
            extractedPublicId = extractedPublicId.split('?')[0]
          }
          
          // Remove file extension(s) - handle cases like 'file.png.png' or 'file.mind' or 'file.pdf'
          const parts = extractedPublicId.split('.')
          if (parts.length > 1) {
            extractedPublicId = parts.slice(0, -1).join('.')
            // If it still ends with a common extension, remove it again
            const commonExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.mp4', '.mov', '.avi', '.webm', '.pdf']
            const lastPart = parts[parts.length - 1].toLowerCase()
            if (commonExts.includes(`.${lastPart}`)) {
              const remainingParts = extractedPublicId.split('.')
              if (remainingParts.length > 1) {
                extractedPublicId = remainingParts.slice(0, -1).join('.')
              }
            }
          }
          
          return extractedPublicId
        }
      } catch (error) {
        console.error('Error extracting public_id:', error)
      }
      
      return null
    }
    
    const publicId = extractCloudinaryPublicId(fileToDelete)

    // Determine resource type
    let resourceType = 'auto'
    if (kind === 'video') {
      resourceType = 'video'
    } else if (kind === 'pdf' || kind === 'document') {
      resourceType = 'raw'
    }

    // Delete from Cloudinary if we have a public_id
    if (publicId) {
      try {
        console.log(`🗑️ Deleting ${kind} from Cloudinary:`, { publicId, resourceType })
        const deleteResult = await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
          invalidate: true
        })

        if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
          console.log(`✅ ${kind} deleted from Cloudinary:`, publicId)
        } else {
          console.warn(`⚠️ Unexpected result when deleting ${kind}:`, deleteResult)
        }
      } catch (cloudinaryError) {
        console.error(`❌ Error deleting ${kind} from Cloudinary:`, cloudinaryError)
        // Continue with DB deletion even if Cloudinary deletion fails
      }
    } else {
      console.warn(`⚠️ Could not extract public_id from ${kind} URL:`, fileToDelete.url)
    }

    // Remove file from database using $unset
    const unsetFields = {}
    unsetFields[filePath] = ''

    // Also clear related fields in phygitalizedData and root level if they exist
    if (kind === 'video') {
      unsetFields[`projects.${projectIndex}.phygitalizedData.videoUrl`] = ''
      unsetFields[`projects.${projectIndex}.videoUrl`] = ''
      unsetFields[`projects.${projectIndex}.phygitalizedData.fileUrl`] = ''
    }
    if (kind === 'pdf') {
      unsetFields[`projects.${projectIndex}.phygitalizedData.pdfUrl`] = ''
      unsetFields[`projects.${projectIndex}.pdfUrl`] = ''
    }
    if (kind === 'document') {
      unsetFields[`projects.${projectIndex}.phygitalizedData.fileUrl`] = ''
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: unsetFields },
      { new: true }
    ).select('-password')

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found after update'
      })
    }

    console.log(`✅ ${kind} file deleted successfully from project ${projectId}`)

    res.json({
      success: true,
      message: `${kind} file deleted successfully`,
      data: {
        projectId,
        kind,
        deleted: true,
        cloudinaryDeleted: !!publicId
      }
    })

  } catch (error) {
    console.error('❌ Error deleting campaign file:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

module.exports = router
