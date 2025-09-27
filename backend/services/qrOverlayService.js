/**
 * QR Code Overlay Service
 * Handles overlaying QR codes on design images
 * Supports various image formats and QR code positioning
 */

const QRCode = require('qrcode');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

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
    
    // Load the design image using Jimp
    const designImage = await Jimp.read(designImagePath);
    console.log('Design image loaded:', {
      width: designImage.getWidth(),
      height: designImage.getHeight()
    });
    
    // Generate QR code buffer
    const qrCodeBuffer = await generateQRCodeBuffer(qrData, normalizedPosition.width);
    
    // Load QR code image using Jimp
    const qrCodeImage = await Jimp.read(qrCodeBuffer);
    
    // Resize QR code to match the specified dimensions
    qrCodeImage.resize(normalizedPosition.width, normalizedPosition.height);
    
    // Composite the QR code onto the design image
    designImage.composite(qrCodeImage, normalizedPosition.x, normalizedPosition.y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1.0,
      opacityDest: 1.0
    });
    
    // Save the final composite image
    await designImage.writeAsync(outputPath);
    console.log('Composite image saved to:', outputPath);
    
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
      throw new Error('Missing required parameters for final design generation');
    }
    
    // Determine if it's S3 or local storage
    const isS3Url = designUrl.includes('amazonaws.com') || designUrl.includes('s3');
    console.log('📡 URL type:', isS3Url ? 'S3' : 'Local');
    
    let designImagePath;
    let designBuffer;
    
    if (isS3Url) {
      // For S3 URLs, we need to download the image first
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = new URL(designUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      designBuffer = await new Promise((resolve, reject) => {
        const request = client.get(designUrl, (response) => {
          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to download image: ${response.statusCode} ${response.statusMessage}`));
          }
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        });
        
        request.on('error', (error) => {
          console.error('❌ S3 download error:', error);
          reject(error);
        });
        
        request.setTimeout(30000, () => {
          request.destroy();
          reject(new Error('S3 download timeout'));
        });
      });
      
      // Save temporarily - use os.tmpdir() for better compatibility
      const os = require('os');
      const tempDir = path.join(os.tmpdir(), 'phygital-temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, `design-${userId}-${Date.now()}.png`);
      fs.writeFileSync(tempPath, designBuffer);
      designImagePath = tempPath;
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
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const outputPath = path.join(tempDir, `final-design-${userId}-${Date.now()}.png`);
    
    // Overlay QR code
    const finalImagePath = await overlayQRCode(designImagePath, qrData, position, outputPath);
    
    // Clean up temporary design file if it was downloaded from S3
    if (isS3Url && fs.existsSync(designImagePath)) {
      fs.unlinkSync(designImagePath);
    }
    
    return finalImagePath;
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




