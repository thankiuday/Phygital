/**
 * Admin Phygital QR Routes
 * Create and manage Phygital QR drafts for users, then grant to user
 * Requires admin authentication
 */

const express = require('express');
const crypto = require('crypto');
const { body, validationResult, query } = require('express-validator');
const multer = require('multer');
const User = require('../models/User');
const AdminPhygitalDraft = require('../models/AdminPhygitalDraft');
const { requireAdmin, logAdminAction } = require('../middleware/adminAuth');
const { logAdminActivity, getClientIP } = require('../middleware/adminSecurity');
const https = require('https');
const http = require('http');
const { uploadToCloudinaryDraft, deleteFromCloudinary, checkCloudinaryConnection, cloudinary } = require('../config/cloudinary');
const { generateUniqueProjectCode } = require('../utils/urlCodeGenerator');

const router = express.Router();
router.use(requireAdmin);

const memoryStorage = multer.memoryStorage();
const uploadSingle = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if ((file.fieldname === 'design' || file.fieldname === 'compositeDesign') && file.mimetype.startsWith('image/')) return cb(null, true);
    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) return cb(null, true);
    if (file.fieldname === 'mindTarget' && (file.mimetype === 'application/octet-stream' || file.mimetype.startsWith('application/') || file.originalname.endsWith('.mind'))) return cb(null, true);
    cb(new Error('Invalid file type or field'), false);
  }
});
const uploadDocuments = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.some(m => file.mimetype.startsWith(m.replace('*', '')) || file.mimetype === m)) return cb(null, true);
    cb(null, true);
  }
});
const uploadVideos = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024, files: 5 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files allowed'), false);
  }
});

// Helper: get draft and ensure admin owns it or is same admin
const getDraftForAdmin = async (draftId, adminId) => {
  const draft = await AdminPhygitalDraft.findById(draftId);
  if (!draft) return { error: 'Draft not found', status: 404 };
  if (draft.status !== 'draft') return { error: 'Draft is not in draft status', status: 400 };
  if (draft.createdByAdminId.toString() !== adminId.toString()) return { error: 'Not authorized to modify this draft', status: 403 };
  return { draft };
};

/**
 * POST /api/admin/phygital/drafts
 * Create a new admin Phygital draft for a target user
 */
router.post('/drafts', [
  body('targetUserId').isMongoId().withMessage('Valid targetUserId required'),
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('description').optional().trim().isLength({ max: 200 })
], logAdminAction('admin_create_phygital_draft'), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { targetUserId, name, description } = req.body;
    const adminId = req.user._id;

    const targetUser = await User.findById(targetUserId).select('username email');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    const draft = new AdminPhygitalDraft({
      targetUserId,
      name: name.trim(),
      description: description || '',
      campaignType: 'qr-links-ar-video',
      status: 'draft',
      createdByAdminId: adminId
    });
    await draft.save();

    return res.status(201).json({
      success: true,
      message: 'Draft created',
      data: { draft: draft.toObject(), targetUser: { id: targetUser._id, username: targetUser.username, email: targetUser.email } }
    });
  } catch (err) {
    console.error('Admin phygital draft create error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create draft' });
  }
});

/**
 * GET /api/admin/phygital/drafts
 * List drafts (for history and listing)
 */
router.get('/drafts', [
  query('status').optional().isIn(['draft', 'granted', 'cancelled']),
  query('targetUserId').optional().isMongoId()
], async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.targetUserId) filter.targetUserId = req.query.targetUserId;
    const drafts = await AdminPhygitalDraft.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate('targetUserId', 'username email')
      .populate('createdByAdminId', 'email')
      .lean();
    return res.json({ success: true, data: { drafts } });
  } catch (err) {
    console.error('Admin phygital drafts list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list drafts' });
  }
});

/**
 * GET /api/admin/phygital/drafts/:draftId
 */
router.get('/drafts/:draftId', async (req, res) => {
  try {
    const draft = await AdminPhygitalDraft.findById(req.params.draftId)
      .populate('targetUserId', 'username email _id')
      .lean();
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    return res.json({ success: true, data: { draft } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/phygital/drafts/:draftId
 * Update draft metadata and phygitalizedData (links, social, etc.)
 */
router.put('/drafts/:draftId', async (req, res) => {
  try {
    const { draftId } = req.params;
    const result = await getDraftForAdmin(draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;

    const allowed = ['name', 'description', 'phygitalizedData', 'socialLinks', 'qrPosition', 'adminNotes'];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    if (Object.keys(update).length === 0) {
      return res.json({ success: true, data: { draft: draft.toObject() } });
    }
    Object.assign(draft, update);
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin phygital draft update error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/design
 */
router.post('/drafts/:draftId/design', uploadSingle.single('design'), async (req, res) => {
  try {
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;
    if (!req.file) return res.status(400).json({ success: false, message: 'No design file' });

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    const uploadResult = await uploadToCloudinaryDraft(req.file, draft._id.toString(), 'design');
    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.design = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size || req.file.size,
      uploadedAt: new Date(),
      dimensions: uploadResult.width ? { width: uploadResult.width, height: uploadResult.height, aspectRatio: uploadResult.width / uploadResult.height } : undefined
    };
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin draft design upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/videos
 */
router.post('/drafts/:draftId/videos', uploadVideos.array('videos', 5), async (req, res) => {
  try {
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;
    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ success: false, message: 'No video files' });

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.videos = draft.uploadedFiles.videos || [];
    for (const file of files) {
      const uploadResult = await uploadToCloudinaryDraft(file, draft._id.toString(), 'videos');
      draft.uploadedFiles.videos.push({
        filename: uploadResult.public_id,
        originalName: file.originalname,
        url: uploadResult.url,
        size: uploadResult.size || file.size,
        uploadedAt: new Date(),
        videoId: `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      });
    }
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin draft videos upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/documents
 */
router.post('/drafts/:draftId/documents', uploadDocuments.array('documents', 5), async (req, res) => {
  try {
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;
    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ success: false, message: 'No document files' });

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.documents = draft.uploadedFiles.documents || [];
    for (const file of files) {
      const uploadResult = await uploadToCloudinaryDraft(file, draft._id.toString(), 'documents');
      draft.uploadedFiles.documents.push({
        filename: uploadResult.public_id,
        originalName: file.originalname,
        url: uploadResult.url,
        size: uploadResult.size || file.size,
        mimetype: file.mimetype,
        uploadedAt: new Date()
      });
    }
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin draft documents upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/qr-position
 */
router.post('/drafts/:draftId/qr-position', [
  body('x').isFloat({ min: 0 }),
  body('y').isFloat({ min: 0 }),
  body('width').isFloat({ min: 50 }),
  body('height').isFloat({ min: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;

    draft.qrPosition = {
      x: parseFloat(req.body.x),
      y: parseFloat(req.body.y),
      width: Math.max(50, parseFloat(req.body.width)),
      height: Math.max(50, parseFloat(req.body.height))
    };
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/qr-frame-config
 * Save QR frame/template config (frame type, text, colors)
 */
router.post('/drafts/:draftId/qr-frame-config', [
  body('frameType').optional().isInt({ min: 1, max: 10 }),
  body('textContent').optional().trim().isLength({ max: 50 }),
  body('textStyle').optional().isObject(),
  body('textStyle.bold').optional().isBoolean(),
  body('textStyle.italic').optional().isBoolean(),
  body('textStyle.color').optional().isString(),
  body('textStyle.gradient').optional().custom((val) => val == null || Array.isArray(val)),
  body('transparentBackground').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errList = errors.array();
      const firstMsg = errList[0]?.msg || 'Validation failed';
      return res.status(400).json({ success: false, message: firstMsg, errors: errList });
    }
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;

    const def = {
      frameType: 1,
      textContent: 'SCAN ME',
      textStyle: { bold: true, italic: false, color: '#FFFFFF', gradient: null },
      transparentBackground: false
    };
    draft.qrFrameConfig = {
      frameType: req.body.frameType != null ? Number(req.body.frameType) : def.frameType,
      textContent: (req.body.textContent != null && req.body.textContent !== '') ? String(req.body.textContent).trim() : def.textContent,
      textStyle: {
        bold: req.body.textStyle?.bold !== false,
        italic: !!req.body.textStyle?.italic,
        color: req.body.textStyle?.color || def.textStyle.color,
        gradient: req.body.textStyle?.gradient || null
      },
      transparentBackground: !!req.body.transparentBackground
    };
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/mind-target
 * Upload .mind file or buffer for AR target
 */
router.post('/drafts/:draftId/mind-target', uploadSingle.single('mindTarget'), async (req, res) => {
  try {
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;
    if (!req.file) return res.status(400).json({ success: false, message: 'No mind target file' });

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    const uploadResult = await uploadToCloudinaryDraft(req.file, draft._id.toString(), 'mindTarget');
    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.mindTarget = {
      filename: uploadResult.public_id,
      url: uploadResult.url,
      size: uploadResult.size || req.file.size,
      uploadedAt: new Date(),
      generated: false
    };
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin draft mind-target upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/composite-design
 * Upload composite image (design + QR overlay)
 */
router.post('/drafts/:draftId/composite-design', uploadSingle.single('compositeDesign'), async (req, res) => {
  try {
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;
    if (!req.file) return res.status(400).json({ success: false, message: 'No composite file' });

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    const uploadResult = await uploadToCloudinaryDraft(req.file, draft._id.toString(), 'compositeDesign');
    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.compositeDesign = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      url: uploadResult.url,
      size: uploadResult.size || req.file.size,
      uploadedAt: new Date()
    };
    await draft.save();
    return res.json({ success: true, data: { draft: draft.toObject() } });
  } catch (err) {
    console.error('Admin draft composite upload error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/generate-mind-from-composite
 * Save client-generated .mind file (same as upload page: browser compiles with MindAR, then sends base64).
 * Body: { mindTargetBase64: 'data:application/octet-stream;base64,...' }
 */
router.post('/drafts/:draftId/generate-mind-from-composite', [
  body('mindTargetBase64').notEmpty().withMessage('mindTargetBase64 is required (generate .mind in browser like upload page)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0]?.msg || 'Validation failed', errors: errors.array() });
    }
    const result = await getDraftForAdmin(req.params.draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;

    let base64 = req.body.mindTargetBase64;
    const dataUrlPrefix = /^data:application\/(octet-stream|mind)\;base64\,/i;
    if (dataUrlPrefix.test(base64)) {
      base64 = base64.replace(dataUrlPrefix, '');
    }
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid mind target data' });
    }

    const connected = await checkCloudinaryConnection();
    if (!connected) return res.status(503).json({ success: false, message: 'Storage unavailable' });

    const folderPath = `phygital-zone/admin-drafts/${draft._id}/mindTarget`;
    const fileName = `target-${Date.now()}.mind`;
    const resultUpload = await cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${buffer.toString('base64')}`,
      {
        folder: folderPath,
        public_id: fileName.replace('.mind', ''),
        resource_type: 'raw',
        timeout: 120000
      }
    );

    draft.uploadedFiles = draft.uploadedFiles || {};
    draft.uploadedFiles.mindTarget = {
      filename: resultUpload.public_id,
      url: resultUpload.secure_url,
      size: buffer.length,
      uploadedAt: new Date(),
      generated: true
    };
    await draft.save();

    return res.json({ success: true, data: { draft: draft.toObject() }, message: 'AR target saved' });
  } catch (err) {
    console.error('Admin generate-mind-from-composite error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save AR target' });
  }
});

/**
 * POST /api/admin/phygital/drafts/:draftId/grant
 * Copy draft into target user's projects and mark draft as granted
 */
router.post('/drafts/:draftId/grant', logAdminAction('admin_grant_phygital'), async (req, res) => {
  try {
    const { draftId } = req.params;
    const result = await getDraftForAdmin(draftId, req.user._id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    const { draft } = result;

    if (!draft.uploadedFiles?.design?.url) {
      return res.status(400).json({ success: false, message: 'Draft must have a design uploaded' });
    }
    if (!draft.uploadedFiles?.mindTarget?.url && !draft.uploadedFiles?.compositeDesign?.url) {
      return res.status(400).json({ success: false, message: 'Draft must have mind target or composite design for AR' });
    }

    const targetUser = await User.findById(draft.targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Target user not found' });
    }

    let projectUrlCode;
    try {
      projectUrlCode = await generateUniqueProjectCode(targetUser);
    } catch (e) {
      projectUrlCode = crypto.randomBytes(4).toString('hex');
    }

    // Use draft _id as project id so admin-generated QR can safely
    // encode a stable campaign URL before grant happens
    const newProjectId = draft._id.toString();
    const defaultQrFrameConfig = {
      frameType: 1,
      textContent: 'SCAN ME',
      textStyle: { bold: true, italic: false, color: '#FFFFFF', gradient: null },
      transparentBackground: false
    };
    const newProject = {
      id: newProjectId,
      urlCode: projectUrlCode,
      name: draft.name,
      description: draft.description || `Phygital campaign: ${draft.name}`,
      status: 'active',
      isEnabled: true,
      campaignType: draft.campaignType || 'qr-links-ar-video',
      uploadedFiles: draft.uploadedFiles || {},
      qrPosition: draft.qrPosition || { x: 0, y: 0, width: 100, height: 100 },
      qrFrameConfig: draft.qrFrameConfig || defaultQrFrameConfig,
      phygitalizedData: {
        ...(draft.phygitalizedData || {}),
        designUrl: draft.uploadedFiles?.design?.url,
        compositeDesignUrl: draft.uploadedFiles?.compositeDesign?.url,
        qrPosition: draft.qrPosition
      },
      socialLinks: draft.socialLinks || {},
      analytics: {
        totalScans: 0,
        videoViews: 0,
        linkClicks: 0,
        arExperienceStarts: 0,
        socialMediaClicks: 0,
        documentViews: 0,
        documentDownloads: 0,
        videoCompletions: 0
      },
      userEditScope: 'content_only',
      createdByAdmin: true,
      adminSourceDraftId: draft._id.toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    targetUser.projects = targetUser.projects || [];
    targetUser.projects.push(newProject);
    await targetUser.save();

    draft.status = 'granted';
    draft.grantedByAdminId = req.user._id;
    draft.grantedAt = new Date();
    draft.grantedProjectId = newProjectId;
    await draft.save();

    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'];
    await logAdminActivity(
      req.user._id,
      'admin_grant_phygital',
      'user',
      targetUser._id.toString(),
      ipAddress,
      userAgent,
      { draftId: draft._id.toString(), projectId: newProjectId, targetUserId: targetUser._id.toString() }
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Campaign granted to user',
      data: {
        draftId: draft._id,
        projectId: newProjectId,
        targetUserId: targetUser._id,
        targetUser: { username: targetUser.username, email: targetUser.email }
      }
    });
  } catch (err) {
    console.error('Admin phygital grant error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Grant failed' });
  }
});

module.exports = router;
