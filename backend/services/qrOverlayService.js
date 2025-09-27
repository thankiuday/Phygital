/**
 * QR Code Overlay Service
 * Handles overlaying QR codes on design images
 * Supports various image formats and QR code positioning
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Import Jimp with correct pattern for v0.22.x
let Jimp;

try {
  // For Jimp v0.22.x, use standard require
  Jimp = require('jimp');
  
  // Verify Jimp.read is available
  if (!Jimp.read || typeof Jimp.read !== 'function') {
    throw new Error('Jimp.read not found');
  }
  
  console.log('✅ Jimp loaded successfully');
  console.log('🔍 Jimp object keys:', Object.keys(Jimp));
  console.log('🔍 Jimp version info:', Jimp.version || 'unknown');
} catch (error) {
  console.error('❌ Failed to load Jimp:', error.message);
  console.log('🔍 Jimp module:', require('jimp'));
  throw new Error('Jimp library not available');
}

/**
 * Generate QR code as buffer
 * @param {String} data - Data to encode in QR code
 * @param {Number} size - QR code size in pixels
 * @returns {Buffer} QR code image buffer
 */
const generateQRCodeBuffer = async (data, size = 200) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Convert data URL to buffer
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};


/**
 * Overlay QR code on design image
 * @param {String} designImagePath - Path to the design image
 * @param {String} qrData - Data to encode in QR code
 * @param {Object} position - QR code position {x, y, width, height}
 * @param {String} outputPath - Path to save the final image
 * @returns {String} Path to the generated image
 */
const overlayQRCode = async (designImagePath, qrData, position, outputPath) => {
  try {
    // Validate and normalize position data
    const normalizedPosition = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: Math.round(position.width),
      height: Math.round(position.height)
    };
    
    console.log('QR overlay position data:', {
      original: position,
      normalized: normalizedPosition
    });
    
    // Validate position values
    if (normalizedPosition.x < 0 || normalizedPosition.y < 0 || 
        normalizedPosition.width <= 0 || normalizedPosition.height <= 0) {
      throw new Error('Invalid position values: x, y, width, height must be positive');
    }
    
    // Load the design image using Jimp
    console.log('🖼️ Loading design image:', designImagePath);
    console.log('🔍 Jimp object:', typeof Jimp, Jimp ? Object.keys(Jimp) : 'undefined');
    
    // Load image using correct Jimp API
    let designImage;
    try {
      designImage = await Jimp.read(designImagePath);
      
      console.log('🔍 Design image object:', {
        type: typeof designImage,
        keys: designImage ? Object.keys(designImage) : 'undefined',
        hasGetWidth: designImage && typeof designImage.getWidth === 'function',
        hasGetHeight: designImage && typeof designImage.getHeight === 'function',
        hasBitmap: designImage && designImage.bitmap ? 'yes' : 'no'
      });
      
      // Get dimensions using the correct Jimp API
      let width, height;
      if (designImage.getWidth && typeof designImage.getWidth === 'function') {
        width = designImage.getWidth();
        height = designImage.getHeight();
      } else if (designImage.bitmap) {
        width = designImage.bitmap.width;
        height = designImage.bitmap.height;
      } else {
        throw new Error('Cannot determine image dimensions');
      }
      
      console.log('✅ Design image loaded:', {
        width: width,
        height: height
      });
    } catch (loadError) {
      console.error('❌ Failed to load image with Jimp:', loadError.message);
      console.log('🔍 Jimp object keys:', Jimp ? Object.keys(Jimp) : 'undefined');
      console.log('🔍 Jimp type:', typeof Jimp);
      throw new Error(`Failed to load image: ${loadError.message}`);
    }
    
    // Validate position is within image bounds
    if (normalizedPosition.x + normalizedPosition.width > width ||
        normalizedPosition.y + normalizedPosition.height > height) {
      throw new Error('QR position is outside image bounds');
    }
    
    // Generate QR code buffer
    console.log('🔲 Generating QR code for data:', qrData.substring(0, 50) + '...');
    const qrCodeBuffer = await generateQRCodeBuffer(qrData, normalizedPosition.width);
    console.log('✅ QR code generated, buffer size:', qrCodeBuffer.length);
    
    // Load QR code image using Jimp
    console.log('🖼️ Loading QR code image...');
    const qrCodeImage = await Jimp.read(qrCodeBuffer);
    console.log('✅ QR code image loaded');
    
    // Resize QR code to match the specified dimensions
    console.log('📏 Resizing QR code to:', normalizedPosition.width, 'x', normalizedPosition.height);
    qrCodeImage.resize(normalizedPosition.width, normalizedPosition.height);
    
    // Composite the QR code onto the design image
    console.log('🎨 Compositing QR code onto design...');
    designImage.composite(qrCodeImage, normalizedPosition.x, normalizedPosition.y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1.0,
      opacityDest: 1.0
    });
    
    // Save the final composite image
    console.log('💾 Saving composite image to:', outputPath);
    await designImage.writeAsync(outputPath);
    console.log('✅ Composite image saved successfully');
    
    return outputPath;
  } catch (error) {
    console.error('QR overlay error:', error);
    throw new Error('Failed to overlay QR code on design');
  }
};

/**
 * Generate final design with QR code from S3 or local storage
 * @param {String} designUrl - URL of the design image
 * @param {String} qrData - Data to encode in QR code
 * @param {Object} position - QR code position
 * @param {String} userId - User ID for file naming
 * @returns {String} Path to the generated final design
 */
const generateFinalDesign = async (designUrl, qrData, position, userId) => {
  try {
    console.log('🎨 Starting final design generation:', { designUrl, qrData, position, userId });
    
    // Validate inputs
    if (!designUrl || !qrData || !position || !userId) {
      console.error('❌ Missing required parameters:', { designUrl: !!designUrl, qrData: !!qrData, position: !!position, userId: !!userId });
      throw new Error('Missing required parameters for final design generation');
    }
    
    // Validate position data
    if (position.x === undefined || position.y === undefined || position.width === undefined || position.height === undefined) {
      console.error('❌ Invalid position data:', position);
      throw new Error('Invalid QR position data');
    }
    
    // Determine if it's S3 or local storage
    const isS3Url = designUrl.includes('amazonaws.com') || designUrl.includes('s3');
    console.log('📡 URL type:', isS3Url ? 'S3' : 'Local');
    
    let designImagePath;
    let designBuffer;
    
    if (isS3Url) {
      // For S3 URLs, we need to download the image first
      console.log('📥 Downloading image from S3:', designUrl);
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = new URL(designUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      designBuffer = await new Promise((resolve, reject) => {
        const request = client.get(designUrl, (response) => {
          console.log('📡 S3 response status:', response.statusCode);
          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to download image: ${response.statusCode} ${response.statusMessage}`));
          }
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            console.log('✅ S3 download completed, buffer size:', Buffer.concat(chunks).length);
            resolve(Buffer.concat(chunks));
          });
          response.on('error', (err) => {
            console.error('❌ S3 response error:', err);
            reject(err);
          });
        });
        
        request.on('error', (error) => {
          console.error('❌ S3 download error:', error);
          reject(error);
        });
        
        request.setTimeout(60000, () => { // Increased timeout to 60 seconds
          console.error('❌ S3 download timeout');
          request.destroy();
          reject(new Error('S3 download timeout'));
        });
      });
      
      // Save temporarily - use os.tmpdir() for better compatibility
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'phygital-temp');
      console.log('📁 Using temp directory:', tempDir);
      
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
          console.log('✅ Created temp directory');
        }
        const tempPath = path.join(tempDir, `design-${userId}-${Date.now()}.png`);
        fs.writeFileSync(tempPath, designBuffer);
        designImagePath = tempPath;
        console.log('✅ Saved temp image:', tempPath);
      } catch (fsError) {
        console.error('❌ File system error:', fsError);
        throw new Error('Failed to save temporary image file');
      }
    } else {
      // For local storage
      const fileName = path.basename(designUrl);
      designImagePath = path.join('uploads', fileName);
      
      if (!fs.existsSync(designImagePath)) {
        throw new Error('Design image not found');
      }
    }
    
    // Generate output path - use os.tmpdir() for better compatibility
    const os = require('os');
    const tempDir = path.join(os.tmpdir(), 'phygital-temp');
    console.log('📁 Preparing output directory:', tempDir);
    
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('✅ Created output temp directory');
      }
      const outputPath = path.join(tempDir, `final-design-${userId}-${Date.now()}.png`);
      console.log('📄 Output path:', outputPath);
      
      // Overlay QR code
      console.log('🎨 Starting QR code overlay...');
      const finalImagePath = await overlayQRCode(designImagePath, qrData, position, outputPath);
      console.log('✅ QR overlay completed:', finalImagePath);
      
      // Clean up temporary design file if it was downloaded from S3
      if (isS3Url && fs.existsSync(designImagePath)) {
        fs.unlinkSync(designImagePath);
        console.log('🧹 Cleaned up temp design file');
      }
      
      return finalImagePath;
    } catch (overlayError) {
      console.error('❌ QR overlay error:', overlayError);
      // Clean up temporary design file if it was downloaded from S3
      if (isS3Url && fs.existsSync(designImagePath)) {
        fs.unlinkSync(designImagePath);
        console.log('🧹 Cleaned up temp design file after error');
      }
      throw overlayError;
    }
  } catch (error) {
    console.error('Final design generation error:', error);
    throw new Error('Failed to generate final design');
  }
};

/**
 * Clean up temporary files
 * @param {String} filePath - Path to the file to delete
 */
const cleanupTempFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
};

module.exports = {
  generateQRCodeBuffer,
  overlayQRCode,
  generateFinalDesign,
  cleanupTempFile
};




