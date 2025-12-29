/**
 * QR Code Overlay Service
 * Handles overlaying QR codes on design images
 * Supports various image formats and QR code positioning
 */

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Import Jimp with standard CommonJS pattern
const Jimp = require('jimp');

console.log('✅ Jimp loaded successfully');
console.log('🔍 Jimp object keys:', Object.keys(Jimp));
console.log('🔍 Jimp version info:', Jimp.version || 'unknown');

/**
 * Generate QR code as buffer - plain QR code without watermark
 * @param {String} data - Data to encode in QR code
 * @param {Number} size - QR code size in pixels
 * @returns {Buffer} QR code image buffer
 */
const generateQRCodeBuffer = async (data, size = 200) => {
  try {
    if (!data || typeof data !== 'string') {
      throw new Error('Invalid data provided for QR code generation');
    }
    
    if (!size || size <= 0 || size > 2000) {
      throw new Error('Invalid QR code size. Must be between 1 and 2000 pixels');
    }
    
    console.log('🔲 Generating plain QR code buffer (no watermark):', { dataLength: data.length, size });
    
    // Generate plain QR code without watermark
    const margin = 2; // Standard margin for QR codes
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: size,
      margin: margin,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Convert to buffer and return (no watermark processing)
    const base64Data = qrCodeDataURL.replace(/^data:image\/png;base64,/, '');
    const finalBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('✅ Plain QR code buffer generated:', { size: finalBuffer.length, width: size });
    return finalBuffer;
  } catch (error) {
    console.error('❌ QR code generation error:', error);
    console.error('❌ Error details:', { data: data?.substring(0, 50), size, errorMessage: error.message });
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

/**
 * Generate QR sticker with customizable frame and text
 * @param {Buffer} qrCodeBuffer - QR code image buffer
 * @param {Number} qrSize - QR code size in pixels (inner QR code size)
 * @param {Number} borderWidth - Border width in pixels (default: 4)
 * @param {Number} padding - Padding around QR code in pixels (default: 16)
 * @param {String} variant - Gradient variant: 'purple' (default), 'blue', 'green-blue', 'yellow-orange', 'orange-pink'
 * @param {Object} frameConfig - Frame configuration object (optional)
 * @param {Number} frameConfig.frameType - Frame type (1-9)
 * @param {String} frameConfig.textContent - Text content (default: "SCAN ME")
 * @param {Object} frameConfig.textStyle - Text styling options
 * @returns {Jimp} Jimp image object of the sticker
 */
const generateQRSticker = async (qrCodeBuffer, qrSize, borderWidth = 4, padding = 16, variant = 'purple', frameConfig = null) => {
  try {
    console.log('🎨 Generating QR sticker with design:', { qrSize, borderWidth, padding, variant });
    
    // Load QR code image
    const qrCodeImage = await Jimp.read(qrCodeBuffer);
    
    // Resize QR code to specified size
    qrCodeImage.resize(qrSize, qrSize);
    
    // Gradient color variants (matching frontend)
    const gradients = {
      'green-blue': {
        border: ['#4ade80', '#22d3ee'],
        text: ['#4ade80', '#22d3ee']
      },
      'blue': {
        border: ['#22d3ee', '#3b82f6'],
        text: ['#22d3ee', '#3b82f6']
      },
      'yellow-orange': {
        border: ['#fbbf24', '#f97316'],
        text: ['#fbbf24', '#f97316']
      },
      'orange-pink': {
        border: ['#f97316', '#ec4899'],
        text: ['#f97316', '#ec4899']
      },
      'purple': {
        border: ['#00d4ff', '#a855f7', '#ec4899'],
        text: ['#00d4ff', '#a855f7', '#ec4899']
      }
    };
    
    const selectedGradient = gradients[variant] || gradients.purple;
    
    // Get frame config or use defaults
    const frameType = frameConfig?.frameType || 1;
    const textContent = frameConfig?.textContent || 'SCAN ME';
    const textStyle = frameConfig?.textStyle || { bold: true, italic: false, color: '#FFFFFF', gradient: null };
    const transparentBackground = frameConfig?.transparentBackground || false;
    
    // Determine if label is on top (3, 4, 6, 9) or bottom (1, 2, 5)
    const topLabelFrames = [3, 4, 6, 9];
    const hasTopLabel = topLabelFrames.includes(frameType);
    const labelHeight = 40; // Height for label/bar
    const labelPadding = 8;
    
    // Calculate dimensions based on frame type
    const totalPadding = padding * 2;
    const totalBorder = borderWidth * 2;
    const textHeight = labelHeight;
    
    let stickerWidth, stickerHeight;
    if (frameType === 10) {
      // None - QR code only, no frame or text
      stickerWidth = qrSize;
      stickerHeight = qrSize;
    } else if (frameType === 7) {
      // Corner brackets only - minimal padding, no label
      stickerWidth = qrSize + totalPadding;
      stickerHeight = qrSize + totalPadding;
    } else if (frameType === 8) {
      // Label on right side
      const labelWidth = qrSize * 0.8;
      stickerWidth = qrSize + totalPadding + totalBorder + labelWidth;
      stickerHeight = qrSize + totalPadding + totalBorder;
    } else if (hasTopLabel) {
      // Labels on top - need extra space above QR code
      stickerWidth = qrSize + totalPadding + totalBorder;
      stickerHeight = qrSize + totalPadding + totalBorder + labelHeight + (frameType === 4 ? labelPadding * 2 : 0);
    } else {
      // Labels on bottom (1, 2, 5)
      stickerWidth = qrSize + totalPadding + totalBorder;
      stickerHeight = qrSize + totalPadding + totalBorder + labelHeight;
    }
    
    // Create sticker canvas
    const sticker = new Jimp(stickerWidth, stickerHeight, 0x00000000); // Transparent background
    
    let qrX, qrY;
    
    if (frameType === 10) {
      // None - QR code only, no frame or text
      qrX = 0;
      qrY = 0;
      // Just composite the QR code directly, no borders or backgrounds
      sticker.composite(qrCodeImage, qrX, qrY);
      return sticker; // Return early, no text to draw
    }
    
    // Draw gradient border - create a simple horizontal gradient effect
    // Parse hex color to RGB components
    const hexToRgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };
    
    // Get gradient colors
    const color1 = hexToRgb(selectedGradient.border[0]);
    const color2 = selectedGradient.border.length > 1 ? hexToRgb(selectedGradient.border[selectedGradient.border.length - 1]) : color1;
    
    // Draw border with horizontal gradient effect
    sticker.scan(0, 0, stickerWidth, stickerHeight, function (x, y, idx) {
      // Draw border area (all edges)
      if (x < borderWidth || x >= stickerWidth - borderWidth || 
          y < borderWidth || y >= stickerHeight - borderWidth) {
        // Calculate gradient position (0 to 1 across width)
        const gradientPos = stickerWidth > 0 ? x / stickerWidth : 0;
        
        // Interpolate between colors
        const r = Math.round(color1.r + (color2.r - color1.r) * gradientPos);
        const g = Math.round(color1.g + (color2.g - color1.g) * gradientPos);
        const b = Math.round(color1.b + (color2.b - color1.b) * gradientPos);
        
        this.bitmap.data[idx] = r; // R
        this.bitmap.data[idx + 1] = g; // G
        this.bitmap.data[idx + 2] = b; // B
        this.bitmap.data[idx + 3] = 255; // A
      }
    });
    
    // Draw white background for QR code and text area - skip if transparentBackground is true
    if (!transparentBackground) {
      const whiteBgX = borderWidth;
      const whiteBgY = borderWidth;
      const whiteBgWidth = qrSize + totalPadding;
      const whiteBgHeight = qrSize + totalPadding + textHeight;
      const whiteBg = new Jimp(whiteBgWidth, whiteBgHeight, 0xFFFFFFFF);
      sticker.composite(whiteBg, whiteBgX, whiteBgY);
    }
    
    // Composite QR code onto sticker
    // For top labels (3, 4, 6, 9), move QR code down to make room for label
    const topLabelOffset = hasTopLabel ? labelHeight + (frameType === 4 ? labelPadding * 2 : 0) : 0;
    qrX = borderWidth + padding;
    qrY = borderWidth + padding + topLabelOffset; // Move QR code down if label is on top
    sticker.composite(qrCodeImage, qrX, qrY);
    
    // Draw "SCAN ME" text with gradient color effect
    // Jimp doesn't support gradient text natively, so we'll use a color from the gradient
    try {
      // Use frame config text color/gradient or fallback to variant gradient
      let textColorHex;
      if (textStyle.gradient && textStyle.gradient.length > 0) {
        // Use gradient from frame config
        textColorHex = textStyle.gradient.length >= 3 ? textStyle.gradient[1] : textStyle.gradient[0];
      } else if (textStyle.color) {
        // Use solid color from frame config
        textColorHex = textStyle.color;
      } else if (selectedGradient.text.length >= 3) {
        // Fallback to variant gradient
        textColorHex = selectedGradient.text[1];
      } else {
        textColorHex = selectedGradient.text[0];
      }
      
      // Load a smaller font - use 16px font instead of 32px for better proportions
      // This makes the text more appropriately sized for the sticker
      let font;
      try {
        // Use 16px font which is half the size of 32px and should be more appropriate
        font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
      } catch (e) {
        // If 16px is not available, try 24px as fallback
        try {
          font = await Jimp.loadFont(Jimp.FONT_SANS_24_BLACK);
        } catch (e2) {
          // Last resort: use 32px
          console.warn('Smaller fonts not available, using 32px font:', e2.message);
          font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        }
      }
      
      // Calculate text dimensions using actual text content
      const textWidth = Jimp.measureText(font, textContent);
      const textHeightActual = Jimp.measureTextHeight(font, textContent, textWidth);
      
      // Calculate text position based on frame type
      let textAreaY, textX, textY;
      
      if (hasTopLabel) {
        // Labels on top (3, 4, 6, 9)
        textAreaY = borderWidth + (frameType === 4 ? labelPadding : 0);
      } else if (frameType === 8) {
        // Label on right side - will be rotated
        textAreaY = borderWidth + padding;
      } else {
        // Labels on bottom (1, 2, 5)
        textAreaY = borderWidth + padding + qrSize + topLabelOffset;
      }
      
      textY = textAreaY + (textHeight / 2) - (textHeightActual / 2);
      textX = (stickerWidth - textWidth) / 2;
      
      // Create a temporary image for the text (full width for proper centering)
      const textImg = new Jimp(stickerWidth, textHeight, 0x00000000); // Transparent
      
      // Print text centered in the temporary image
      textImg.print(font, 0, (textHeight - textHeightActual) / 2, {
        text: textContent,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      }, stickerWidth, textHeight);
      
      // Colorize the text to match the gradient
      // Convert hex to RGB
      const textRgb = hexToRgb(textColorHex);
      
      // Scan and replace text pixels with gradient color
      // Handle anti-aliased text by checking for any non-white pixels
      textImg.scan(0, 0, textImg.bitmap.width, textImg.bitmap.height, function (x, y, idx) {
        const alpha = this.bitmap.data[idx + 3];
        // Only process non-transparent pixels (the text)
        if (alpha > 0) {
          const r = this.bitmap.data[idx];
          const g = this.bitmap.data[idx + 1];
          const b = this.bitmap.data[idx + 2];
          
          // If pixel is not white (i.e., it's part of the text, including anti-aliased edges)
          // Replace with gradient color, preserving the alpha for smooth edges
          if (!(r === 255 && g === 255 && b === 255)) {
            // Replace color directly with gradient color, keep alpha for smooth edges
            this.bitmap.data[idx] = textRgb.r; // R
            this.bitmap.data[idx + 1] = textRgb.g; // G
            this.bitmap.data[idx + 2] = textRgb.b; // B
            // Keep original alpha for smooth anti-aliased edges
          }
        }
      });
      
      // Composite the colored text onto the sticker at the correct position
      sticker.composite(textImg, 0, textAreaY);
    } catch (fontError) {
      console.warn('⚠️ Could not load font for "SCAN ME" text, skipping text:', fontError.message);
      // Continue without text if font loading fails
    }
    
    console.log('✅ QR sticker generated:', { stickerWidth, stickerHeight });
    return sticker;
  } catch (error) {
    console.error('❌ QR sticker generation error:', error);
    throw new Error(`Failed to generate QR sticker: ${error.message}`);
  }
};


/**
 * Overlay QR code on design image
 * @param {String} designImagePath - Path to the design image
 * @param {String} qrData - Data to encode in QR code
 * @param {Object} position - QR code position {x, y, width, height}
 * @param {String} outputPath - Path to save the final image
 * @param {Object} frameConfig - Frame configuration (optional)
 * @returns {String} Path to the generated image
 */
const overlayQRCode = async (designImagePath, qrData, position, outputPath, frameConfig = null) => {
  try {
    // Validate input parameters
    if (!designImagePath || typeof designImagePath !== 'string') {
      throw new Error('Invalid design image path');
    }
    
    if (!qrData || typeof qrData !== 'string') {
      throw new Error('Invalid QR data provided');
    }
    
    if (!position || typeof position !== 'object') {
      throw new Error('Invalid position data provided');
    }
    
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('Invalid output path provided');
    }
    
    // Validate and normalize position data
    const normalizedPosition = {
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: Math.round(position.width),
      height: Math.round(position.height)
    };
    
    console.log('🎨 QR overlay position data:', {
      original: position,
      normalized: normalizedPosition
    });
    
    // Validate position values
    if (normalizedPosition.x < 0 || normalizedPosition.y < 0 || 
        normalizedPosition.width <= 0 || normalizedPosition.height <= 0) {
      throw new Error('Invalid position values: x, y, width, height must be positive');
    }
    
    // Check if design image file exists
    if (!fs.existsSync(designImagePath)) {
      throw new Error(`Design image file not found: ${designImagePath}`);
    }
    
    // Load the design image using Jimp
    console.log('🖼️ Loading design image:', designImagePath);
    console.log('🔍 Jimp object:', typeof Jimp, Jimp ? Object.keys(Jimp) : 'undefined');
    
    // Load image using correct Jimp API
    let designImage, width, height;
    try {
      designImage = await Jimp.read(designImagePath);
      
      console.log('🔍 Design image object:', {
        type: typeof designImage,
        keys: designImage ? Object.keys(designImage) : 'undefined',
        hasGetWidth: designImage && typeof designImage.getWidth === 'function',
        hasGetHeight: designImage && typeof designImage.getHeight === 'function',
        hasBitmap: designImage && designImage.bitmap ? 'yes' : 'no',
        mimeType: designImage._originalMime || 'unknown'
      });
      
      // Get dimensions using the correct Jimp API
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
        height: height,
        format: designImage._originalMime || 'unknown'
      });
    } catch (loadError) {
      console.error('❌ Failed to load image with Jimp:', loadError.message);
      console.log('🔍 Jimp object keys:', Jimp ? Object.keys(Jimp) : 'undefined');
      console.log('🔍 Jimp type:', typeof Jimp);
      console.log('🔍 File exists:', fs.existsSync(designImagePath));
      console.log('🔍 File size:', fs.existsSync(designImagePath) ? fs.statSync(designImagePath).size : 'N/A');
      throw new Error(`Failed to load image: ${loadError.message}`);
    }
    
    // Validate position is within image bounds
    if (normalizedPosition.x + normalizedPosition.width > width ||
        normalizedPosition.y + normalizedPosition.height > height) {
      throw new Error('QR position is outside image bounds');
    }
    
    // Generate QR code buffer (plain QR code)
    console.log('🔲 Generating QR code for data:', qrData.substring(0, 50) + '...');
    
    // Calculate QR code size (inner QR code size, excluding border and padding)
    // The normalizedPosition includes the full sticker size, so we need to calculate the inner QR size
    const borderWidth = 4;
    const padding = 16;
    const textHeight = 40;
    const qrCodeSize = Math.max(80, normalizedPosition.width - (padding * 2 + borderWidth * 2));
    
    const qrCodeBuffer = await generateQRCodeBuffer(qrData, qrCodeSize);
    console.log('✅ QR code generated, buffer size:', qrCodeBuffer.length);
    
    // Generate QR sticker with frame config
    console.log('🎨 Generating QR sticker with design...', frameConfig ? `Frame type: ${frameConfig.frameType}` : 'Default frame');
    const qrSticker = await generateQRSticker(
      qrCodeBuffer,
      qrCodeSize,
      borderWidth,
      padding,
      'purple', // Default variant
      frameConfig // Pass frame config
    );
    
    // Resize sticker to match the specified dimensions (user's positioned size)
    console.log('📏 Resizing sticker to:', normalizedPosition.width, 'x', normalizedPosition.height);
    qrSticker.resize(normalizedPosition.width, normalizedPosition.height);
    
    // Composite the QR sticker onto the design image
    console.log('🎨 Compositing QR sticker onto design...');
    designImage.composite(qrSticker, normalizedPosition.x, normalizedPosition.y, {
      mode: Jimp.BLEND_SOURCE_OVER,
      opacitySource: 1.0,
      opacityDest: 1.0
    });
    
    // Detect image format and set maximum quality for JPEG
    const isJPEG = designImage._originalMime === 'image/jpeg' || 
                   designImagePath.toLowerCase().endsWith('.jpg') || 
                   designImagePath.toLowerCase().endsWith('.jpeg');
    
    if (isJPEG) {
      console.log('📸 Setting JPEG quality to 100 (maximum quality, no compression)');
      designImage.quality(100); // Set JPEG quality to 100 (maximum quality)
    }
    
    // Save the final composite image
    console.log('💾 Saving composite image to:', outputPath);
    console.log('📊 Output format:', isJPEG ? 'JPEG (quality: 100)' : 'PNG (lossless)');
    await designImage.writeAsync(outputPath);
    console.log('✅ Composite image saved successfully with maximum quality');
    
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
 * @param {Object} frameConfig - Frame configuration (optional)
 * @returns {String} Path to the generated final design
 */
const generateFinalDesign = async (designUrl, qrData, position, userId, frameConfig = null) => {
  try {
    console.log('🎨 Starting final design generation:', { designUrl, qrData, position, userId });
    
    // Validate inputs
    if (!designUrl || typeof designUrl !== 'string') {
      console.error('❌ Invalid designUrl:', designUrl);
      throw new Error('Invalid design URL provided');
    }
    
    if (!qrData || typeof qrData !== 'string') {
      console.error('❌ Invalid qrData:', qrData);
      throw new Error('Invalid QR data provided');
    }
    
    if (!position || typeof position !== 'object') {
      console.error('❌ Invalid position:', position);
      throw new Error('Invalid position data provided');
    }
    
    if (!userId || typeof userId !== 'string') {
      console.error('❌ Invalid userId:', userId);
      throw new Error('Invalid user ID provided');
    }
    
    // Validate position data
    if (position.x === undefined || position.y === undefined || position.width === undefined || position.height === undefined) {
      console.error('❌ Invalid position data:', position);
      throw new Error('Invalid QR position data - missing required fields');
    }
    
    // Validate position values
    if (position.x < 0 || position.y < 0 || position.width <= 0 || position.height <= 0) {
      console.error('❌ Invalid position values:', position);
      throw new Error('Invalid QR position values - must be positive numbers');
    }
    
    // Determine if it's S3, Cloudinary, or local storage
    const isS3Url = designUrl.includes('amazonaws.com') || designUrl.includes('s3');
    const isCloudinaryUrl = designUrl.includes('cloudinary.com') || designUrl.includes('res.cloudinary.com');
    const isRemoteUrl = isS3Url || isCloudinaryUrl;
    console.log('📡 URL type:', isS3Url ? 'S3' : isCloudinaryUrl ? 'Cloudinary' : 'Local');
    
    let designImagePath;
    let designBuffer;
    
    if (isRemoteUrl) {
      // For S3 or Cloudinary URLs, we need to download the image first
      console.log('📥 Downloading image from remote storage:', designUrl);
      const https = require('https');
      const http = require('http');
      const url = require('url');
      
      const parsedUrl = new URL(designUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      designBuffer = await new Promise((resolve, reject) => {
        const request = client.get(designUrl, (response) => {
          console.log('📡 Remote storage response status:', response.statusCode);
          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to download image: ${response.statusCode} ${response.statusMessage}`));
          }
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            console.log('✅ Remote download completed, buffer size:', Buffer.concat(chunks).length);
            resolve(Buffer.concat(chunks));
          });
          response.on('error', (err) => {
            console.error('❌ Remote response error:', err);
            reject(err);
          });
        });
        
        request.on('error', (error) => {
          console.error('❌ Remote download error:', error);
          reject(error);
        });
        
        request.setTimeout(30000, () => { // 30 seconds timeout
          console.error('❌ Remote download timeout');
          request.destroy();
          reject(new Error('Remote download timeout'));
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
        // Detect file extension from URL to preserve original format
        const urlExtension = designUrl.split('.').pop().split('?')[0].toLowerCase();
        const extension = ['jpg', 'jpeg', 'png'].includes(urlExtension) ? urlExtension : 'jpg';
        const tempPath = path.join(tempDir, `design-${userId}-${Date.now()}.${extension}`);
        fs.writeFileSync(tempPath, designBuffer);
        designImagePath = tempPath;
        console.log('✅ Saved temp image:', tempPath, `(format: ${extension})`);
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
      
      // Detect file extension from original image to preserve format
      const inputExtension = path.extname(designImagePath).toLowerCase();
      const extension = ['.jpg', '.jpeg', '.png'].includes(inputExtension) ? 
                        inputExtension.substring(1) : 'jpg';
      const outputPath = path.join(tempDir, `final-design-${userId}-${Date.now()}.${extension}`);
      console.log('📄 Output path:', outputPath, `(format: ${extension})`);
      
      // Overlay QR code with frame config
      console.log('🎨 Starting QR code overlay...', frameConfig ? `Frame type: ${frameConfig.frameType}` : 'Default frame');
      const finalImagePath = await overlayQRCode(designImagePath, qrData, position, outputPath, frameConfig);
      console.log('✅ QR overlay completed:', finalImagePath);
      
      // Clean up temporary design file if it was downloaded from remote storage
      if (isRemoteUrl && fs.existsSync(designImagePath)) {
        fs.unlinkSync(designImagePath);
        console.log('🧹 Cleaned up temp design file');
      }
      
      return finalImagePath;
    } catch (overlayError) {
      console.error('❌ QR overlay error:', overlayError);
      // Clean up temporary design file if it was downloaded from remote storage
      if (isRemoteUrl && fs.existsSync(designImagePath)) {
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
  generateQRSticker,
  overlayQRCode,
  generateFinalDesign,
  cleanupTempFile
};




