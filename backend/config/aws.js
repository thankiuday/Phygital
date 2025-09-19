/**
 * AWS S3 Configuration
 * Handles file uploads to AWS S3 bucket
 * Provides methods for uploading, deleting, and managing files
 */

const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 instance
const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Configure multer for S3 uploads
const upload = multer({
  storage: process.env.AWS_S3_BUCKET ? multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'public-read',
    key: function (req, file, cb) {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      const sanitizedUserId = req.user._id.toString().replace(/[^a-zA-Z0-9]/g, '');
      // Create structured folder hierarchy: users/{userId}/{fileType}/{filename}
      const fileName = `users/${sanitizedUserId}/${file.fieldname}/${file.fieldname}-${uniqueSuffix}${fileExtension}`;
      cb(null, fileName);
    },
    metadata: function (req, file, cb) {
      cb(null, {
        fieldName: file.fieldname,
        userId: req.user._id.toString(),
        uploadedAt: new Date().toISOString()
      });
    }
  }) : multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      const fileName = `${req.user._id}-${file.fieldname}-${uniqueSuffix}${fileExtension}`;
      cb(null, fileName);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: function (req, file, cb) {
    // Check file type based on field name
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
 * Upload file to S3 or local storage
 * @param {Object} file - File object from multer
 * @param {String} userId - User ID
 * @param {String} fieldName - Field name (design or video)
 * @returns {Object} Upload result with URL and metadata
 */
const uploadToS3 = async (file, userId, fieldName) => {
  try {
    // Validate inputs
    if (!file || !file.buffer) {
      throw new Error('Invalid file object - missing buffer');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!fieldName) {
      throw new Error('Field name is required');
    }
    
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    
    // Sanitize userId for file path (remove any problematic characters)
    const sanitizedUserId = userId.toString().replace(/[^a-zA-Z0-9]/g, '');
    
    // Create structured folder hierarchy: users/{userId}/{fileType}/{filename}
    const fileName = `users/${sanitizedUserId}/${fieldName}/${fieldName}-${uniqueSuffix}${fileExtension}`;
    
    if (process.env.AWS_S3_BUCKET) {
      // Upload to S3
      const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: fileName,
        Body: file.buffer,
        ACL: 'public-read',
        ContentType: file.mimetype,
        Metadata: {
          userId: userId.toString(),
          fieldName: fieldName,
          uploadedAt: new Date().toISOString()
        }
      };
      
      const result = await s3.upload(uploadParams).promise();
      
      return {
        url: result.Location,
        key: result.Key,
        bucket: result.Bucket,
        size: file.size,
        mimetype: file.mimetype
      };
    } else {
      // Local storage fallback
      const fs = require('fs');
      const localDir = path.join('uploads', 'users', sanitizedUserId, fieldName);
      const localFileName = `${fieldName}-${uniqueSuffix}${fileExtension}`;
      const localPath = path.join(localDir, localFileName);
      
      // Ensure directory structure exists
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      
      fs.writeFileSync(localPath, file.buffer);
      
      return {
        url: `${process.env.FRONTEND_URL?.replace('5173', '5000') || 'http://localhost:5000'}/uploads/users/${sanitizedUserId}/${fieldName}/${localFileName}`,
        key: `users/${sanitizedUserId}/${fieldName}/${localFileName}`,
        bucket: 'local',
        size: file.size,
        mimetype: file.mimetype
      };
    }
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      fieldName: fieldName,
      fileName: file?.originalname,
      fileSize: file?.size
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Delete file from S3 or local storage
 * @param {String} key - S3 object key or local filename
 * @returns {Boolean} Success status
 */
const deleteFromS3 = async (key) => {
  try {
    console.log(`Attempting to delete file with key: ${key}`);
    
    if (process.env.AWS_S3_BUCKET) {
      // Delete from S3
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      };
      
      console.log('S3 delete params:', deleteParams);
      const result = await s3.deleteObject(deleteParams).promise();
      console.log('S3 delete result:', result);
      return result;
    } else {
      // Delete from local storage
      const fs = require('fs');
      const localPath = path.join('uploads', key);
      
      console.log('Local delete path:', localPath);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log('Local file deleted successfully');
        return { success: true, type: 'local' };
      }
      console.log('Local file not found');
      return { success: false, type: 'local', reason: 'file not found' };
    }
  } catch (error) {
    console.error('Delete error for key:', key, error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Get signed URL for private file access
 * @param {String} key - S3 object key
 * @param {Number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {String} Signed URL
 */
const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Expires: expiresIn
    };
    
    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw new Error('Failed to generate signed URL');
  }
};

/**
 * Check if S3 bucket exists and is accessible, or if local storage is available
 * @returns {Boolean} Storage accessibility status
 */
const checkS3Connection = async () => {
  try {
    if (process.env.AWS_S3_BUCKET) {
      // Check S3 connection
      await s3.headBucket({ Bucket: process.env.AWS_S3_BUCKET }).promise();
      return true;
    } else {
      // Check local storage availability
      const fs = require('fs');
      if (!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads', { recursive: true });
      }
      return true;
    }
  } catch (error) {
    console.error('Storage connection check failed:', error);
    return false;
  }
};

module.exports = {
  s3,
  upload,
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  checkS3Connection
};
