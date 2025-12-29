/**
 * Templates Routes
 * Handles template-related API endpoints
 */

const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const User = require('../models/User')
const { body, validationResult } = require('express-validator')

// Get all available templates (static data - could be moved to config file)
router.get('/', (req, res) => {
  try {
    // In a real implementation, this would read from a config file or database
    // For now, return template IDs that match frontend config
    const templates = [
      {
        id: 'default',
        name: 'Default Theme',
        category: 'non-festival'
      },
      {
        id: 'christmas',
        name: 'Christmas Wonderland',
        category: 'festival'
      },
      {
        id: 'diwali',
        name: 'Diwali Festival',
        category: 'festival'
      },
      {
        id: 'holi',
        name: 'Holi Colors',
        category: 'festival'
      }
    ]

    res.json({
      success: true,
      data: templates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates'
    })
  }
})

// Get template by ID
router.get('/:templateId', (req, res) => {
  try {
    const { templateId } = req.params
    
    // Validate template ID
    const validTemplates = ['default', 'christmas', 'diwali', 'holi']
    if (!validTemplates.includes(templateId)) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      })
    }

    // Return template info (full details would come from config file)
    res.json({
      success: true,
      data: {
        id: templateId,
        name: templateId.charAt(0).toUpperCase() + templateId.slice(1) + ' Template'
      }
    })
  } catch (error) {
    console.error('Error fetching template:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template'
    })
  }
})

// Apply template to campaign(s)
router.post('/apply', authenticateToken, [
  body('templateId').trim().notEmpty().withMessage('Template ID is required'),
  body('projectIds').isArray().notEmpty().withMessage('At least one project ID is required'),
  body('templateConfig').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { templateId, projectIds, templateConfig } = req.body
    const userId = req.user.id

    // Validate template ID
    const validTemplates = ['default', 'christmas', 'diwali', 'holi']
    if (!validTemplates.includes(templateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid template ID'
      })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Update projects with template
    let updatedCount = 0
    const updatePromises = projectIds.map(async (projectId) => {
      const projectIndex = user.projects.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        // Ensure phygitalizedData exists
        if (!user.projects[projectIndex].phygitalizedData) {
          user.projects[projectIndex].phygitalizedData = {}
        }

    // Update template ID and config
    user.projects[projectIndex].phygitalizedData.templateId = templateId
    
    // Log incoming templateConfig for debugging
    console.log('📝 Applying template config:', {
      templateId,
      projectId,
      incomingTemplateConfig: templateConfig
    })
    
    user.projects[projectIndex].phygitalizedData.templateConfig = {
      animationSpeed: templateConfig?.animationSpeed || 1,
      particleDensity: templateConfig?.particleDensity || 1,
      colorVariations: templateConfig?.colorVariations || null,
      customColors: templateConfig?.customColors || null
    }
    
    // Log saved templateConfig
    console.log('✅ Saved template config:', {
      projectId,
      savedConfig: user.projects[projectIndex].phygitalizedData.templateConfig
    })
        updatedCount++
      }
    })

    await Promise.all(updatePromises)

    if (updatedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid projects found to update'
      })
    }

    // Save user
    await user.save()

    res.json({
      success: true,
      message: `Template applied to ${updatedCount} campaign(s)`,
      data: {
        updatedCount,
        templateId
      }
    })
  } catch (error) {
    console.error('Error applying template:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to apply template',
      error: error.message
    })
  }
})

module.exports = router

