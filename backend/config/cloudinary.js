/**
 * Cloudinary Configuration
 * Handles file uploads to Cloudinary with organized folder structure
 * Folder structure: phygital-zone/users/{userId}/{type}/{filename}
 */

const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary with organized folder structure
 * @param {Object} file - File object from multer
 * @param {String} userId - User ID (MongoDB ObjectId)
 * @param {String} type - File type (design, designs, targets, video)
 * @returns {Object} Upload result with URL and metadata
 */
const uploadToCloudinary = async (file, userId, type) => {
  try {
    console.log('=== CLOUDINARY UPLOAD DEBUG ===');
    console.log('User ID:', userId);
    console.log('File type:', type);
    console.log('File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Validate inputs
    if (!file || !file.buffer) {
      throw new Error('Invalid file object - missing buffer');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!type) {
      throw new Error('File type is required');
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${type}-${uniqueSuffix}.${fileExtension}`;

    // Create folder path: phygital-zone/users/{userId}/{type}/
    const folderPath = `phygital-zone/users/${userId}/${type}`;
    
    console.log('Uploading to Cloudinary with folder:', folderPath);
    console.log('File name:', fileName);

    // Upload options
    const uploadOptions = {
      folder: folderPath,
      public_id: fileName.replace(`.${fileExtension}`, ''), // Remove extension for public_id
      resource_type: type === 'video' ? 'video' : 'image',
      format: fileExtension,
      quality: 'auto',
      fetch_format: 'auto',
      transformation: type === 'video' ? [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ] : [
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { width: 1920, height: 1080, crop: 'limit' } // Limit image size
      ]
    };

    console.log('Upload options:', uploadOptions);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      uploadOptions
    );

    console.log('✅ Cloudinary upload successful:', result.secure_url);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      size: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      folder: result.folder,
      created_at: result.created_at
    };

  } catch (error) {
    console.error('❌ Cloudinary upload failed:', error);
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      type: type,
      fileSize: file?.size
    });
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Upload buffer directly to Cloudinary
 * @param {Buffer} buffer - File buffer to upload
 * @param {string} userId - User ID
 * @param {string} type - File type
 * @param {string} filename - Custom filename
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
const uploadToCloudinaryBuffer = async (buffer, userId, type, filename, contentType) => {
  try {
    console.log('=== CLOUDINARY BUFFER UPLOAD DEBUG ===');
    console.log('Buffer size:', buffer ? buffer.length : 'null');
    console.log('User ID:', userId);
    console.log('Type:', type);
    console.log('Filename:', filename);
    console.log('Content Type:', contentType);

    // Validate inputs
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer provided');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!type) {
      throw new Error('File type is required');
    }

    // Generate filename if not provided
    const finalFilename = filename || `${type}-${Date.now()}-${uuidv4()}`;
    
    // Create folder path: phygital-zone/users/{userId}/{type}/
    const folderPath = `phygital-zone/users/${userId}/${type}`;
    
    console.log('Uploading buffer to Cloudinary with folder:', folderPath);
    console.log('File name:', finalFilename);

    // Upload options
    const uploadOptions = {
      folder: folderPath,
      public_id: finalFilename,
      resource_type: type === 'video' ? 'video' : 'image',
      quality: 'auto',
      fetch_format: 'auto'
    };

    console.log('Upload options:', uploadOptions);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${contentType};base64,${buffer.toString('base64')}`,
      uploadOptions
    );

    console.log('✅ Cloudinary buffer upload successful:', result.secure_url);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      size: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      folder: result.folder,
      created_at: result.created_at
    };

  } catch (error) {
    console.error('❌ Cloudinary buffer upload failed:', error);
    console.error('Buffer upload error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      type: type,
      bufferSize: buffer?.length
    });
    throw new Error(`Cloudinary buffer upload failed: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Boolean} Success status
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    console.log(`Attempting to delete file from Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.destroy(publicId);
    console.log('Cloudinary delete result:', result);
    
    return result.result === 'ok';
  } catch (error) {
    console.error('Delete error for public ID:', publicId, error);
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
  }
};

/**
 * Check if Cloudinary is properly configured
 * @returns {Boolean} Cloudinary accessibility status
 */
const checkCloudinaryConnection = async () => {
  try {
    console.log('=== CLOUDINARY CONNECTION CHECK ===');
    console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
    console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
    console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
    
    // Check if Cloudinary credentials are properly configured
    const hasValidCredentials = process.env.CLOUDINARY_CLOUD_NAME && 
                               process.env.CLOUDINARY_API_KEY && 
                               process.env.CLOUDINARY_API_SECRET &&
                               process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
                               process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
                               process.env.CLOUDINARY_API_SECRET !== 'your_cloudinary_api_secret';
    
    console.log('Has valid Cloudinary credentials:', hasValidCredentials);
    
    if (hasValidCredentials) {
      try {
        console.log('Testing Cloudinary connection...');
        // Test connection by getting account info
        const result = await cloudinary.api.ping();
        console.log('✅ Cloudinary connection successful:', result);
        return true;
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary connection failed:', cloudinaryError.message);
        console.error('Cloudinary Error Details:', {
          message: cloudinaryError.message,
          status: cloudinaryError.http_code
        });
        return false;
      }
    } else {
      console.log('⚠️ Cloudinary credentials not properly configured');
      console.log('Missing or invalid credentials:', {
        cloudName: !process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: !process.env.CLOUDINARY_API_KEY,
        apiSecret: !process.env.CLOUDINARY_API_SECRET,
        cloudNamePlaceholder: process.env.CLOUDINARY_CLOUD_NAME === 'your_cloudinary_cloud_name',
        apiKeyPlaceholder: process.env.CLOUDINARY_API_KEY === 'your_cloudinary_api_key',
        apiSecretPlaceholder: process.env.CLOUDINARY_API_SECRET === 'your_cloudinary_api_secret'
      });
      return false;
    }
  } catch (error) {
    console.error('Cloudinary connection check failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadToCloudinaryBuffer,
  deleteFromCloudinary,
  checkCloudinaryConnection
};
