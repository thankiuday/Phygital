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

    // Upload options with different timeouts for videos vs images
    const uploadOptions = {
      folder: folderPath,
      public_id: fileName.replace(`.${fileExtension}`, ''), // Remove extension for public_id
      resource_type: type === 'video' ? 'video' : 'image',
      format: fileExtension,
      timeout: type === 'video' ? 600000 : 120000, // 10 minutes for videos, 2 minutes for images
      chunk_size: type === 'video' ? 6000000 : undefined, // 6MB chunks for videos (better for large files)
    };

    // Add quality settings only for images (not for videos during upload to avoid processing delays)
    if (type !== 'video') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
      uploadOptions.transformation = [
        { quality: 'auto' },
        { fetch_format: 'auto' },
        { width: 1920, height: 1080, crop: 'limit' } // Limit image size
      ];
    }

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
 * @param {Object} options - Optional upload options (e.g., { quality: 100 })
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
const uploadToCloudinaryBuffer = async (buffer, userId, type, filename, contentType, options = {}) => {
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
    console.log('Content-Type:', contentType);
    console.log('Type:', type);

    // Upload options
    // Determine resource type based on content type or folder
    let resourceType = 'image'; // default
    if (type === 'video') {
      resourceType = 'video';
    } else if (type === 'targets' || contentType === 'application/octet-stream' || finalFilename.endsWith('.mind')) {
      resourceType = 'raw'; // For .mind files and other binary files
    } else if (type === 'documents') {
      // For documents folder, check content type to determine resource type
      if (contentType.startsWith('image/')) {
        resourceType = 'image';
      } else {
        // PDFs, Word docs, text files, etc. should be 'raw'
        resourceType = 'raw';
      }
    }
    
    const uploadOptions = {
      folder: folderPath,
      public_id: finalFilename,
      resource_type: resourceType,
      timeout: type === 'video' ? 600000 : 300000, // 10 minutes for videos, 5 minutes for others (increased)
      chunk_size: type === 'video' ? 6000000 : undefined, // 6MB chunks for videos
      eager_async: true, // Process transformations asynchronously to speed up upload
    };
    
    // Only add quality and fetch_format for images (not for videos or raw files)
    if (resourceType === 'image') {
      // Use custom quality if provided (e.g., 100 for maximum quality), otherwise use 'auto'
      uploadOptions.quality = options.quality !== undefined ? options.quality : 'auto';
      uploadOptions.fetch_format = 'auto';
      
      console.log(`📸 Image upload quality set to: ${uploadOptions.quality}`);
    }

    console.log('Upload options:', uploadOptions);
    console.log('📦 Resource type:', resourceType, '(for .mind files, this should be "raw")');

    // Upload to Cloudinary with retry logic for timeout errors
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Upload attempt ${attempt}/${maxRetries}`);
        
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
      } catch (uploadError) {
        lastError = uploadError;
        const isTimeout = uploadError.message?.includes('Timeout') || uploadError.http_code === 499;
        
        console.warn(`⚠️ Upload attempt ${attempt} failed:`, uploadError.message);
        
        // If it's a timeout and we have retries left, wait and retry
        if (isTimeout && attempt < maxRetries) {
          const delay = attempt * 2000; // 2s, 4s exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not a timeout or no retries left, throw immediately
        if (!isTimeout || attempt === maxRetries) {
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;

  } catch (error) {
    console.error('❌ Cloudinary buffer upload failed after all retries:', error);
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
        // Handle different error formats
        const errorMessage = cloudinaryError?.message || 
                           cloudinaryError?.error?.message || 
                           JSON.stringify(cloudinaryError) || 
                           'Unknown error';
        const errorStatus = cloudinaryError?.http_code || 
                          cloudinaryError?.statusCode || 
                          cloudinaryError?.status || 
                          'No status';
        
        console.error('❌ Cloudinary connection failed:', errorMessage);
        console.error('Cloudinary Error Details:', {
          message: errorMessage,
          status: errorStatus,
          fullError: cloudinaryError
        });
        
        // Check if it's an authentication error
        if (errorStatus === 401 || errorMessage.includes('auth')) {
          console.error('⚠️ Authentication failed - please check your Cloudinary credentials');
        }
        
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

/**
 * Optimized video upload using stream (faster than base64)
 * @param {Object} file - File object from multer
 * @param {String} userId - User ID
 * @param {Object} options - Upload options (compression, quality, etc.)
 * @returns {Object} Upload result with URL and metadata
 */
const uploadVideoToCloudinary = async (file, userId, options = {}) => {
  const streamifier = require('streamifier');
  
  try {
    console.log('=== OPTIMIZED VIDEO UPLOAD ===');
    console.log('File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    console.log('Options:', options);
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `video-${uniqueSuffix}`;
    
    // Create folder path
    const folderPath = `phygital-zone/users/${userId}/video`;
    
    console.log('📁 Folder:', folderPath);
    console.log('📄 Filename:', fileName);
    
    // Configure upload options
    const uploadOptions = {
      folder: folderPath,
      public_id: fileName,
      resource_type: 'video',
      type: 'upload',
      
      // Large file handling
      chunk_size: 6000000, // 6MB chunks for better reliability
      timeout: 600000, // 10 minutes timeout
      
      // Quality and compression settings
      quality: options.quality || 'auto', // auto, 80, 60, etc.
      
      // Format and codec optimization
      format: options.format || fileExtension, // Keep original or convert (mp4, webm)
      
      // Video transformation for faster loading
      transformation: options.compress ? [
        {
          video_codec: 'h264', // H.264 codec for better compatibility
          audio_codec: 'aac', // AAC audio
          quality: options.quality || 'auto',
          fetch_format: 'auto'
        }
      ] : undefined,
      
      // Enable streaming for better performance
      resource_type: 'video',
      
      // Eager transformations for commonly used formats
      eager: options.generatePreview ? [
        { 
          width: 640, 
          height: 360, 
          crop: 'limit', 
          quality: 'auto',
          video_codec: 'h264',
          format: 'mp4'
        }
      ] : undefined,
      
      eager_async: true, // Generate previews in background
      
      // Notification URL for upload progress (optional)
      notification_url: options.webhookUrl || undefined
    };
    
    console.log('⚙️ Upload configuration:', {
      folder: uploadOptions.folder,
      chunk_size: '6MB',
      timeout: '10 minutes',
      quality: uploadOptions.quality,
      compression: !!options.compress
    });
    
    // Create upload stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('❌ Video upload failed:', error);
            reject(error);
          } else {
            console.log('✅ Video uploaded successfully');
            console.log('📊 Upload stats:', {
              url: result.secure_url,
              size: (result.bytes / (1024 * 1024)).toFixed(2) + 'MB',
              duration: result.duration ? result.duration.toFixed(2) + 's' : 'N/A',
              format: result.format
            });
            
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
              asset_id: result.asset_id,
              size: result.bytes,
              format: result.format,
              duration: result.duration,
              width: result.width,
              height: result.height,
              folder: result.folder,
              created_at: result.created_at,
              resource_type: result.resource_type
            });
          }
        }
      );
      
      // Stream the file buffer to Cloudinary
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
      
      console.log('🔄 Streaming video to Cloudinary...');
    });
    
  } catch (error) {
    console.error('❌ Video upload error:', error);
    throw new Error(`Video upload failed: ${error.message}`);
  }
};

/**
 * Upload file to Cloudinary for Phygitalized campaigns
 * @param {Object} file - File object from multer (or buffer)
 * @param {String} userId - User ID (MongoDB ObjectId)
 * @param {String} projectId - Project ID
 * @param {String} variation - Campaign variation (QR-Link, QR-Links, QR-Links-Video, etc.)
 * @param {String} fileType - File type (video, pdf, document)
 * @returns {Object} Upload result with URL and metadata
 */
const uploadToPhygitalizedCloudinary = async (file, userId, projectId, variation, fileType) => {
  try {
    console.log('=== PHYGITALIZED CLOUDINARY UPLOAD ===');
    console.log('User ID:', userId);
    console.log('Project ID:', projectId);
    console.log('Variation:', variation);
    console.log('File type:', fileType);
    console.log('File details:', {
      originalname: file.originalname || 'buffer',
      mimetype: file.mimetype || 'unknown',
      size: file.size || (file.buffer ? file.buffer.length : 0)
    });

    // Validate inputs
    if (!file || (!file.buffer && !Buffer.isBuffer(file))) {
      throw new Error('Invalid file object - missing buffer');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (!projectId) {
      throw new Error('Project ID is required');
    }
    
    if (!variation) {
      throw new Error('Variation is required');
    }
    
    if (!fileType) {
      throw new Error('File type is required');
    }

    // Sanitize variation name (remove special characters, replace spaces with hyphens)
    const sanitizedVariation = variation.replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-');
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.originalname ? file.originalname.split('.').pop() : 
                         (fileType === 'video' ? 'mp4' : 
                          fileType === 'pdf' ? 'pdf' : 
                          fileType === 'document' ? 'doc' : 'file');
    const fileName = `${fileType}-${uniqueSuffix}.${fileExtension}`;

    // Create folder path: Phygitalized/{variation}/{userId}/{projectId}/
    const folderPath = `Phygitalized/${sanitizedVariation}/${userId}/${projectId}`;
    
    console.log('Uploading to Cloudinary with folder:', folderPath);
    console.log('File name:', fileName);

    // Determine resource type based on file type
    // Priority: fileType parameter > mimetype detection
    let resourceType = 'raw'; // default for PDF/DOC/text
    
    if (fileType === 'video') {
      resourceType = 'video';
    } else if (fileType === 'image') {
      // Images explicitly marked as 'image' type (e.g., composite designs)
      resourceType = 'image';
    } else if (fileType === 'document') {
      // Documents are always 'raw' regardless of mimetype (PDF, DOC, images, text, etc.)
      resourceType = 'raw';
    } else if (fileType === 'pdf') {
      resourceType = 'raw';
    } else if (file.mimetype && file.mimetype.startsWith('image/')) {
      // Images without explicit fileType are treated as 'image' (for design uploads)
      resourceType = 'image';
    } else if (file.mimetype && (file.mimetype.includes('pdf') || file.mimetype.includes('document') || file.mimetype.includes('msword') || file.mimetype.startsWith('text/'))) {
      resourceType = 'raw'; // PDF, DOC, and text files
    }

    // Upload options
    const uploadOptions = {
      folder: folderPath,
      public_id: fileName.replace(`.${fileExtension}`, ''), // Remove extension for public_id
      resource_type: resourceType,
      format: fileExtension,
      timeout: fileType === 'video' ? 600000 : 300000, // 10 minutes for videos, 5 minutes for others
      chunk_size: fileType === 'video' ? 6000000 : undefined, // 6MB chunks for videos
    };

    // Add quality settings only for images
    if (resourceType === 'image') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }

    console.log('Upload options:', uploadOptions);

    // Prepare file data for upload
    let fileData;
    if (file.buffer) {
      // File from multer
      fileData = `data:${file.mimetype || 'application/octet-stream'};base64,${file.buffer.toString('base64')}`;
    } else if (Buffer.isBuffer(file)) {
      // Direct buffer
      fileData = `data:application/octet-stream;base64,${file.toString('base64')}`;
    } else {
      throw new Error('Invalid file format');
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileData, uploadOptions);

    console.log('✅ Phygitalized Cloudinary upload successful:', result.secure_url);

    return {
      url: result.secure_url,
      public_id: result.public_id,
      asset_id: result.asset_id,
      size: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration, // For videos
      folder: result.folder,
      created_at: result.created_at,
      resource_type: result.resource_type
    };

  } catch (error) {
    console.error('❌ Phygitalized Cloudinary upload failed:', error);
    console.error('Upload error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      projectId: projectId,
      variation: variation,
      fileType: fileType,
      fileSize: file?.size || (file?.buffer ? file.buffer.length : 0)
    });
    throw new Error(`Phygitalized Cloudinary upload failed: ${error.message}`);
  }
};

/**
 * Upload QR Design to Cloudinary
 * @param {Buffer} buffer - QR code image buffer
 * @param {String} userId - User ID
 * @param {String} designId - Unique design ID
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
const uploadQRDesign = async (buffer, userId, designId) => {
  try {
    console.log('=== QR DESIGN UPLOAD ===');
    console.log('User ID:', userId);
    console.log('Design ID:', designId);
    console.log('Buffer size:', buffer ? buffer.length : 'null');

    // Validate inputs
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Invalid buffer provided for QR design');
    }
    
    if (!userId) {
      throw new Error('User ID is required for QR design upload');
    }
    
    if (!designId) {
      throw new Error('Design ID is required for QR design upload');
    }

    // Generate filename
    const filename = `qr-design-${designId}`;
    
    // Create folder path: phygital-zone/users/{userId}/qr-designs/
    const folderPath = `phygital-zone/users/${userId}/qr-designs`;
    
    console.log('Uploading QR design to folder:', folderPath);
    console.log('Filename:', filename);

    // Upload options for QR design (PNG image)
    const uploadOptions = {
      folder: folderPath,
      public_id: filename,
      resource_type: 'image',
      timeout: 120000, // 2 minutes
      quality: 'auto',
      fetch_format: 'auto'
    };

    console.log('Upload options:', uploadOptions);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${buffer.toString('base64')}`,
      uploadOptions
    );

    console.log('✅ QR design uploaded successfully:', result.secure_url);

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
    console.error('❌ QR design upload failed:', error);
    console.error('QR design upload error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId,
      designId: designId,
      bufferSize: buffer?.length
    });
    throw new Error(`QR design upload failed: ${error.message}`);
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  uploadToCloudinaryBuffer,
  uploadVideoToCloudinary,
  uploadQRDesign,
  uploadToPhygitalizedCloudinary,
  deleteFromCloudinary,
  checkCloudinaryConnection
};
