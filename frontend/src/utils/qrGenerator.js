/**
 * QR Code Generator Utility
 * Generates QR codes with optional icon overlays (similar to Bitly)
 * Uses qrcode-styling for advanced customization
 */

/**
 * Generate QR code with icon overlay
 * @param {string} url - URL to encode in QR code
 * @param {Object} options - Generation options
 * @param {string} options.iconUrl - URL or data URL of icon to overlay
 * @param {number} options.size - QR code size in pixels (default: 300)
 * @param {number} options.iconSize - Icon size as percentage of QR code (default: 0.15 = 15%)
 * @param {string} options.darkColor - Dark color for QR code (default: '#000000')
 * @param {string} options.lightColor - Light color for QR code (default: '#FFFFFF')
 * @returns {Promise<string>} Data URL of the generated QR code with icon
 */
export const generateQRCodeWithIcon = async (url, options = {}) => {
  try {
    const QRCodeStyling = (await import('qr-code-styling')).default;
    const {
      iconUrl,
      size = 300,
      iconSize = 0.15, // 15% of QR code size
      darkColor = '#000000',
      lightColor = '#FFFFFF',
      errorCorrectionLevel = 'H' // High error correction for better icon overlay support
    } = options;

    // Create QR code styling configuration
    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'canvas',
      data: url,
      margin: 2,
      qrOptions: {
        errorCorrectionLevel: errorCorrectionLevel,
        typeNumber: 0
      },
      dotsOptions: {
        color: darkColor,
        type: 'square'
      },
      backgroundOptions: {
        color: lightColor,
        type: 'square',
        hideBackgroundDots: false
      },
      imageOptions: iconUrl ? {
        image: iconUrl,
        imageSize: iconSize,
        margin: 0.1
      } : undefined,
      cornersSquareOptions: {
        color: darkColor,
        type: 'square'
      },
      cornersDotOptions: {
        color: darkColor,
        type: 'square'
      }
    });

    // Get canvas element - need to append to container first
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    document.body.appendChild(container);
    
    // Append QR code to container
    qrCode.append(container);
    
    // Get the canvas from the container
    const canvas = container.querySelector('canvas');
    
    if (!canvas) {
      document.body.removeChild(container);
      throw new Error('Failed to generate QR code canvas');
    }
    
    // Clone the canvas so we can remove the container
    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = canvas.width;
    clonedCanvas.height = canvas.height;
    const clonedCtx = clonedCanvas.getContext('2d');
    clonedCtx.drawImage(canvas, 0, 0);
    
    // Remove temporary container
    document.body.removeChild(container);

    // Return canvas as data URL
    return clonedCanvas.toDataURL('image/png');
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code with icon');
  }
};

/**
 * Download QR code as PNG file
 * @param {string} dataUrl - Data URL of the QR code
 * @param {string} filename - Filename for download (default: 'qr-code.png')
 */
export const downloadQRCode = (dataUrl, filename = 'qr-code.png') => {
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download error:', error);
    throw new Error('Failed to download QR code');
  }
};

/**
 * Create gradient fill style
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string|string[]} colors - Color(s) for gradient
 * @param {number} x0 - Start X
 * @param {number} y0 - Start Y
 * @param {number} x1 - End X
 * @param {number} y1 - End Y
 * @returns {CanvasGradient|string} Gradient or solid color
 */
const createGradient = (ctx, colors, x0, y0, x1, y1) => {
  if (Array.isArray(colors) && colors.length > 1) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    const step = 1 / (colors.length - 1);
    colors.forEach((color, index) => {
      gradient.addColorStop(index * step, color);
    });
    return gradient;
  }
  return Array.isArray(colors) ? colors[0] : colors;
};

/**
 * Map pattern style to qrcode-styling dot type
 * @param {string} style - Pattern style
 * @returns {string} qrcode-styling dot type
 */
const mapPatternStyle = (style) => {
  const styleMap = {
    'square': 'square',
    'rounded': 'rounded',
    'circle': 'dots',
    'heart': 'dots', // qrcode-styling doesn't support heart, use dots
    'diamond': 'dots' // qrcode-styling doesn't support diamond, use dots
  };
  return styleMap[style] || 'square';
};

/**
 * Map corner style to qrcode-styling corner type
 * @param {string} style - Corner style
 * @returns {string} qrcode-styling corner type
 */
const mapCornerStyle = (style) => {
  const styleMap = {
    'square': 'square',
    'rounded': 'extra-rounded',
    'circle': 'dot'
  };
  return styleMap[style] || 'square';
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB object with r, g, b properties
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

/**
 * Helper functions to draw special frame shapes
 */

// Draw shopping bag frame
function drawShoppingBag(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  
  // Bag body - make it fill more of the frame area
  const bagTopWidth = w * 0.85;
  const bagBottomWidth = w * 0.75;
  const bagHeight = h * 0.75;
  const bagX = x + (w - bagTopWidth) / 2;
  const bagY = y + (h - bagHeight) / 2 + h * 0.05; // Slightly lower for handles
  
  ctx.beginPath();
  // Top opening
  ctx.moveTo(bagX, bagY);
  ctx.lineTo(bagX + bagTopWidth, bagY);
  // Right side
  ctx.lineTo(bagX + bagTopWidth + (bagBottomWidth - bagTopWidth) / 2, bagY + bagHeight);
  // Bottom
  ctx.lineTo(bagX + (bagTopWidth - bagBottomWidth) / 2 + bagBottomWidth, bagY + bagHeight);
  // Left side
  ctx.lineTo(bagX + (bagTopWidth - bagBottomWidth) / 2, bagY + bagHeight);
  ctx.closePath();
  ctx.stroke();
  
  // Handles
  const handleWidth = bagTopWidth * 0.3;
  const handleHeight = h * 0.12;
  ctx.beginPath();
  // Left handle
  ctx.arc(bagX + bagTopWidth * 0.2, bagY - handleHeight * 0.3, handleWidth / 2, 0, Math.PI, true);
  ctx.stroke();
  // Right handle
  ctx.beginPath();
  ctx.arc(bagX + bagTopWidth * 0.8, bagY - handleHeight * 0.3, handleWidth / 2, 0, Math.PI, true);
  ctx.stroke();
}

// Draw gift box with bow
function drawGiftBox(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  
  const boxWidth = w * 0.8;
  const boxHeight = h * 0.75;
  const boxX = x + (w - boxWidth) / 2;
  const boxY = y + (h - boxHeight) / 2;
  
  // Box
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
  
  // Bow on top
  const bowX = boxX + boxWidth / 2;
  const bowY = boxY;
  const bowSize = boxWidth * 0.12;
  
  // Bow loops
  ctx.beginPath();
  ctx.ellipse(bowX - bowSize, bowY, bowSize, bowSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bowX + bowSize, bowY, bowSize, bowSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Bow center
  ctx.fillRect(bowX - bowSize * 0.3, bowY - bowSize * 0.3, bowSize * 0.6, bowSize * 0.6);
  
  // Ribbon lines on box
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bowX, boxY);
  ctx.lineTo(bowX, boxY + boxHeight);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(boxX, boxY + boxHeight / 2);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight / 2);
  ctx.stroke();
  ctx.lineWidth = 4; // Reset
}

// Draw ribbon banner
function drawRibbonBanner(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  
  // Simple frame
  ctx.strokeRect(x, y, w, h * 0.8);
  
  // Ribbon banner at bottom
  const ribbonY = y + h * 0.75;
  const ribbonHeight = h * 0.15;
  const ribbonWidth = w * 0.9;
  const ribbonX = x + (w - ribbonWidth) / 2;
  
  // Ribbon shape (wavy bottom)
  ctx.beginPath();
  ctx.moveTo(ribbonX, ribbonY);
  ctx.lineTo(ribbonX + ribbonWidth, ribbonY);
  
  // Wavy bottom
  const waveLength = ribbonWidth / 4;
  for (let i = 0; i < 4; i++) {
    const waveX = ribbonX + i * waveLength;
    ctx.quadraticCurveTo(
      waveX + waveLength / 2,
      ribbonY + ribbonHeight,
      waveX + waveLength,
      ribbonY
    );
  }
  
  ctx.lineTo(ribbonX, ribbonY);
  ctx.closePath();
  ctx.fill();
  
  // Ribbon ends (triangular cuts)
  ctx.beginPath();
  ctx.moveTo(ribbonX, ribbonY);
  ctx.lineTo(ribbonX - ribbonHeight * 0.5, ribbonY + ribbonHeight / 2);
  ctx.lineTo(ribbonX, ribbonY + ribbonHeight);
  ctx.closePath();
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(ribbonX + ribbonWidth, ribbonY);
  ctx.lineTo(ribbonX + ribbonWidth + ribbonHeight * 0.5, ribbonY + ribbonHeight / 2);
  ctx.lineTo(ribbonX + ribbonWidth, ribbonY + ribbonHeight);
  ctx.closePath();
  ctx.fill();
}

// Draw envelope
function drawEnvelope(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  
  const envWidth = w * 0.85;
  const envHeight = h * 0.8;
  const envX = x + (w - envWidth) / 2;
  const envY = y + (h - envHeight) / 2;
  
  // Envelope body
  ctx.beginPath();
  ctx.moveTo(envX, envY + envHeight * 0.25); // Start below flap
  ctx.lineTo(envX + envWidth, envY + envHeight * 0.25);
  ctx.lineTo(envX + envWidth, envY + envHeight);
  ctx.lineTo(envX, envY + envHeight);
  ctx.closePath();
  ctx.stroke();
  
  // Flap (triangle)
  ctx.beginPath();
  ctx.moveTo(envX, envY + envHeight * 0.25);
  ctx.lineTo(envX + envWidth / 2, envY);
  ctx.lineTo(envX + envWidth, envY + envHeight * 0.25);
  ctx.closePath();
  ctx.stroke();
}

// Draw thumbs up icon
function drawThumbsUp(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  // Thumb
  ctx.beginPath();
  ctx.arc(x + size * 0.3, y - size * 0.2, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // Hand (base)
  ctx.beginPath();
  ctx.ellipse(x + size * 0.3, y + size * 0.1, size * 0.2, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Draw laptop
function drawLaptop(ctx, x, y, w, h, color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  
  const laptopWidth = w * 0.9;
  const laptopHeight = h * 0.65;
  const laptopX = x + (w - laptopWidth) / 2;
  const laptopY = y + (h - laptopHeight) / 2;
  
  // Screen (top part)
  const screenHeight = laptopHeight * 0.7;
  ctx.strokeRect(laptopX, laptopY, laptopWidth, screenHeight);
  
  // Keyboard/base (bottom part)
  const baseHeight = laptopHeight * 0.3;
  const baseY = laptopY + screenHeight;
  ctx.beginPath();
  ctx.moveTo(laptopX, baseY);
  ctx.lineTo(laptopX + laptopWidth * 0.15, baseY + baseHeight);
  ctx.lineTo(laptopX + laptopWidth * 0.85, baseY + baseHeight);
  ctx.lineTo(laptopX + laptopWidth, baseY);
  ctx.closePath();
  ctx.stroke();
  
  // Screen bezel
  const bezelWidth = 3;
  ctx.strokeRect(
    laptopX + bezelWidth,
    laptopY + bezelWidth,
    laptopWidth - bezelWidth * 2,
    screenHeight - bezelWidth * 2
  );
}

/**
 * Generate advanced QR code with custom design options
 * Uses qrcode-styling for native advanced customization
 * @param {string} url - URL to encode in QR code
 * @param {Object} designOptions - Design customization options
 * @param {Object} designOptions.frame - Frame options
 * @param {Object} designOptions.pattern - Pattern options (colors)
 * @param {Object} designOptions.corners - Corner options (colors)
 * @param {Object} designOptions.logo - Logo options
 * @param {number} size - QR code size in pixels (default: 512)
 * @returns {Promise<string>} Data URL of the generated QR code
 */
export const generateAdvancedQRCode = async (url, designOptions = {}, size = 512) => {
  try {
    const QRCodeStyling = (await import('qr-code-styling')).default;
    
    const {
      frame = { 
        style: 'none', 
        text: '', 
        textColor: '#000000', 
        color: '#000000', 
        backgroundColor: '#FFFFFF', 
        transparentBackground: false, 
        useGradient: false 
      },
      pattern = { 
        style: 'square', 
        color: '#000000', 
        backgroundColor: '#FFFFFF', 
        transparentBackground: false, 
        useGradient: false 
      },
      corners = { 
        frameStyle: 'square', 
        dotStyle: 'square', 
        frameColor: '#000000', 
        dotColor: '#000000' 
      },
      logo = { enabled: false, url: null, size: 0.15 }
    } = designOptions;

    // Use high error correction when logo is enabled
    const errorCorrectionLevel = logo.enabled ? 'H' : 'M';

    // Determine QR code colors
    // Note: qrcode-styling may not support gradient arrays directly, so we use the first color
    // Gradients can be applied as post-processing if needed
    const patternColor = Array.isArray(pattern.color) ? pattern.color[0] : pattern.color;
    
    // Handle transparent background - use white with alpha or rgba
    // Ensure we have valid colors (not empty or undefined)
    let backgroundColor = pattern.transparentBackground 
      ? '#FFFFFF' // Use white as fallback, transparency will be handled in canvas overlay
      : (Array.isArray(pattern.backgroundColor) ? pattern.backgroundColor[0] : pattern.backgroundColor);
    
    // Fallback to white if backgroundColor is invalid
    if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor.trim() === '') {
      backgroundColor = '#FFFFFF';
    }
    
    // Ensure pattern color is valid (fallback to black)
    const finalPatternColor = patternColor && patternColor.trim() !== '' ? patternColor : '#000000';

    // Map corner colors
    const cornerFrameColor = Array.isArray(corners.frameColor) ? corners.frameColor[0] : corners.frameColor;
    const cornerDotColor = Array.isArray(corners.dotColor) ? corners.dotColor[0] : corners.dotColor;

    // Create QR code styling configuration
    const qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'canvas',
      data: url,
      margin: 2,
      qrOptions: {
        errorCorrectionLevel: errorCorrectionLevel,
        typeNumber: 0
      },
      dotsOptions: {
        color: finalPatternColor,
        type: mapPatternStyle(pattern.style),
        ...(pattern.useGradient && Array.isArray(pattern.color) && pattern.color.length > 1
          ? {
              gradient: {
                type: 'linear',
                rotation: 0,
                colorStops: pattern.color.map((color, index) => ({
                  offset: index / (pattern.color.length - 1),
                  color: color
                }))
              }
            }
          : {})
      },
      backgroundOptions: {
        color: backgroundColor,
        type: 'square',
        hideBackgroundDots: false
      },
      cornersSquareOptions: {
        color: cornerFrameColor,
        type: mapCornerStyle(corners.frameStyle)
      },
      cornersDotOptions: {
        color: cornerDotColor,
        type: mapCornerStyle(corners.dotStyle)
      },
      ...(logo.enabled && logo.url ? {
        imageOptions: {
          image: logo.url,
          imageSize: logo.size,
          margin: 0.1
        }
      } : {})
    });

    // Generate QR code - need to append to container to get canvas
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    document.body.appendChild(container);
    
    // Append QR code to container
    qrCode.append(container);
    
    // Wait for QR code to render (qr-code-styling needs time to render)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get the canvas from the container
    const qrCanvas = container.querySelector('canvas');
    
    if (!qrCanvas) {
      console.error('QR code canvas not found in container');
      document.body.removeChild(container);
      throw new Error('Failed to generate QR code canvas');
    }
    
    // Verify canvas has content and valid dimensions
    if (qrCanvas.width === 0 || qrCanvas.height === 0) {
      console.error('QR code canvas has invalid dimensions:', { width: qrCanvas.width, height: qrCanvas.height });
      document.body.removeChild(container);
      throw new Error('QR code canvas has invalid dimensions');
    }
    
    // Debug: Check if canvas has any content
    const testCtx = qrCanvas.getContext('2d');
    const imageData = testCtx.getImageData(0, 0, Math.min(10, qrCanvas.width), Math.min(10, qrCanvas.height));
    const hasContent = imageData.data.some((val, idx) => idx % 4 !== 3 && val !== 0 && val !== 255);
    console.log('QR code canvas check:', { 
      width: qrCanvas.width, 
      height: qrCanvas.height, 
      hasContent,
      patternColor: finalPatternColor,
      backgroundColor 
    });
    
    // Clone the canvas so we can remove the container
    const clonedCanvas = document.createElement('canvas');
    clonedCanvas.width = qrCanvas.width;
    clonedCanvas.height = qrCanvas.height;
    const clonedCtx = clonedCanvas.getContext('2d');
    clonedCtx.drawImage(qrCanvas, 0, 0);
    
    // Remove temporary container
    document.body.removeChild(container);
    
    let qrCanvasFinal = clonedCanvas;

    // Apply gradient to pattern if gradient is enabled
    if (pattern.useGradient && Array.isArray(pattern.color) && pattern.color.length > 1) {
      const gradientCanvas = document.createElement('canvas');
      const gradientCtx = gradientCanvas.getContext('2d');
      gradientCanvas.width = size;
      gradientCanvas.height = size;

      // Create gradient
      const gradient = gradientCtx.createLinearGradient(0, 0, size, size);
      const step = 1 / (pattern.color.length - 1);
      pattern.color.forEach((color, index) => {
        gradient.addColorStop(index * step, color);
      });

      // Draw background from original QR code
      gradientCtx.drawImage(qrCanvasFinal, 0, 0);

      // Get image data to identify dark pixels
      const imageData = gradientCtx.getImageData(0, 0, size, size);
      const pixels = imageData.data;

      // Apply gradient to dark pixels only
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;

        // If pixel is dark (part of QR code pattern), apply gradient color
        if (brightness < 128) {
          const x = (i / 4) % size;
          const y = Math.floor((i / 4) / size);
          
          // Calculate gradient position (0 to 1)
          const gradientPos = (x + y) / (size * 2);
          
          // Find color in gradient
          let colorIndex = 0;
          for (let j = 0; j < pattern.color.length - 1; j++) {
            const stop1 = j * step;
            const stop2 = (j + 1) * step;
            if (gradientPos >= stop1 && gradientPos <= stop2) {
              // Interpolate between colors
              const t = (gradientPos - stop1) / (stop2 - stop1);
              const color1 = pattern.color[j];
              const color2 = pattern.color[j + 1];
              
              // Simple RGB interpolation
              const rgb1 = hexToRgb(color1);
              const rgb2 = hexToRgb(color2);
              
              pixels[i] = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
              pixels[i + 1] = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
              pixels[i + 2] = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
              break;
            }
          }
        }
      }

      gradientCtx.putImageData(imageData, 0, 0);
      qrCanvasFinal = gradientCanvas;
    }

    // Calculate frame dimensions based on style
    let frameWidth = 0;
    let framePadding = 0;
    let textHeight = frame.text ? 40 : 0;
    
    if (frame.style !== 'none') {
      // Different frame widths for different styles
      switch (frame.style) {
        case 'simple1':
          frameWidth = 8;
          framePadding = 20;
          break;
        case 'simple2':
          frameWidth = 6;
          framePadding = 18;
          break;
        case 'simple3':
          frameWidth = 4;
          framePadding = 16;
          break;
        case 'simple4':
          frameWidth = 10;
          framePadding = 22;
          break;
        case 'simple5':
          frameWidth = 6;
          framePadding = 18;
          break;
        case 'simple6':
          frameWidth = 2;
          framePadding = 14;
          break;
        case 'simple7':
          frameWidth = 6;
          framePadding = 18;
          break;
        case 'handwritten':
        case 'thumbsup':
        case 'shopping':
        case 'gift':
        case 'ribbon':
        case 'envelope':
        case 'scooter':
        case 'laptop':
          frameWidth = 6;
          framePadding = 20;
          break;
        default:
          frameWidth = 4;
          framePadding = 16;
      }
    }
    
    const totalWidth = size + (frameWidth * 2) + (framePadding * 2);
    const totalHeight = size + (frameWidth * 2) + (framePadding * 2) + textHeight;
    
    // If no frame, return QR code directly
    if (frame.style === 'none' && !frame.text) {
      return qrCanvasFinal.toDataURL('image/png');
    }

    // Create canvas for frame overlay
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Fill background
    if (frame.transparentBackground && frame.style !== 'none') {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (frame.style !== 'none') {
      const bgGradient = createGradient(
        ctx, 
        frame.backgroundColor, 
        0, 0, 
        canvas.width, 
        canvas.height
      );
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (pattern.transparentBackground) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      const patternBg = createGradient(
        ctx, 
        pattern.backgroundColor, 
        0, 0, 
        canvas.width, 
        canvas.height
      );
      ctx.fillStyle = patternBg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Calculate QR code position based on frame style
    let qrStartX = frameWidth + framePadding;
    let qrStartY = frameWidth + framePadding;
    
    // For special frames, adjust QR code position to be inside the shape
    const isSpecialFrame = ['shopping', 'gift', 'envelope', 'laptop'].includes(frame.style);
    
    if (frame.style !== 'none') {
      const frameColorStyle = createGradient(
        ctx, 
        frame.color, 
        0, 0, 
        canvas.width, 
        canvas.height
      );
      ctx.strokeStyle = frameColorStyle;
      ctx.fillStyle = frameColorStyle;
      ctx.lineWidth = frameWidth;
      
      const frameX = frameWidth / 2;
      const frameY = frameWidth / 2;
      const frameW = size + (framePadding * 2);
      const frameH = size + (framePadding * 2);
      
      // Draw frame based on style
      switch (frame.style) {
        case 'rounded':
          const borderRadius = 12;
          ctx.beginPath();
          ctx.moveTo(frameX + borderRadius, frameY);
          ctx.lineTo(frameX + frameW - borderRadius, frameY);
          ctx.quadraticCurveTo(frameX + frameW, frameY, frameX + frameW, frameY + borderRadius);
          ctx.lineTo(frameX + frameW, frameY + frameH - borderRadius);
          ctx.quadraticCurveTo(frameX + frameW, frameY + frameH, frameX + frameW - borderRadius, frameY + frameH);
          ctx.lineTo(frameX + borderRadius, frameY + frameH);
          ctx.quadraticCurveTo(frameX, frameY + frameH, frameX, frameY + frameH - borderRadius);
          ctx.lineTo(frameX, frameY + borderRadius);
          ctx.quadraticCurveTo(frameX, frameY, frameX + borderRadius, frameY);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'shadow':
          // Draw shadow first
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 4;
          ctx.shadowOffsetY = 4;
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          // Draw frame on top
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          break;
        case 'simple1':
        case 'simple2':
        case 'simple3':
        case 'simple4':
        case 'simple6':
          // Simple rectangular frames with different widths
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          break;
        case 'simple5':
          // Rounded rectangle frame
          const roundedRadius = 8;
          ctx.beginPath();
          ctx.moveTo(frameX + roundedRadius, frameY);
          ctx.lineTo(frameX + frameW - roundedRadius, frameY);
          ctx.quadraticCurveTo(frameX + frameW, frameY, frameX + frameW, frameY + roundedRadius);
          ctx.lineTo(frameX + frameW, frameY + frameH - roundedRadius);
          ctx.quadraticCurveTo(frameX + frameW, frameY + frameH, frameX + frameW - roundedRadius, frameY + frameH);
          ctx.lineTo(frameX + roundedRadius, frameY + frameH);
          ctx.quadraticCurveTo(frameX, frameY + frameH, frameX, frameY + frameH - roundedRadius);
          ctx.lineTo(frameX, frameY + roundedRadius);
          ctx.quadraticCurveTo(frameX, frameY, frameX + roundedRadius, frameY);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'simple7':
          // Double-line frame
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          ctx.strokeRect(frameX + 4, frameY + 4, frameW - 8, frameH - 8);
          break;
        case 'handwritten':
          // Simple frame with handwritten style text (handled in text drawing)
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          break;
        case 'thumbsup':
          // Frame with dashed border
          ctx.setLineDash([8, 4]);
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          ctx.setLineDash([]);
          break;
        case 'shopping':
          // Shopping bag shape - adjust QR position to be inside bag
          drawShoppingBag(ctx, frameX, frameY, frameW, frameH, frameColorStyle);
          // Position QR code inside the bag shape (match drawing function dimensions)
          const bagTopWidth = frameW * 0.85;
          const bagBottomWidth = frameW * 0.75;
          const bagHeight = frameH * 0.75;
          const bagX = frameX + (frameW - bagTopWidth) / 2;
          const bagY = frameY + (frameH - bagHeight) / 2 + frameH * 0.05;
          // Center QR code inside bag
          qrStartX = bagX + (bagTopWidth - size) / 2;
          qrStartY = bagY + (bagHeight - size) / 2;
          break;
        case 'gift':
          // Gift box with bow - adjust QR position to be inside box
          drawGiftBox(ctx, frameX, frameY, frameW, frameH, frameColorStyle);
          const boxWidth = frameW * 0.8;
          const boxHeight = frameH * 0.75;
          const boxX = frameX + (frameW - boxWidth) / 2;
          const boxY = frameY + (frameH - boxHeight) / 2;
          // Center QR code inside box
          qrStartX = boxX + (boxWidth - size) / 2;
          qrStartY = boxY + (boxHeight - size) / 2;
          break;
        case 'ribbon':
          // Ribbon banner
          drawRibbonBanner(ctx, frameX, frameY, frameW, frameH, frameColorStyle);
          break;
        case 'envelope':
          // Envelope shape - adjust QR position to be inside envelope
          drawEnvelope(ctx, frameX, frameY, frameW, frameH, frameColorStyle);
          const envWidth = frameW * 0.85;
          const envHeight = frameH * 0.8;
          const envX = frameX + (frameW - envWidth) / 2;
          const envY = frameY + (frameH - envHeight) / 2 + (envHeight * 0.25); // Below flap
          // Center QR code inside envelope
          qrStartX = envX + (envWidth - size) / 2;
          qrStartY = envY + (envHeight * 0.75 - size) / 2;
          break;
        case 'scooter':
          // Simple frame for scooter (scooter drawn separately if needed)
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          break;
        case 'laptop':
          // Laptop frame - adjust QR position to be on screen
          drawLaptop(ctx, frameX, frameY, frameW, frameH, frameColorStyle);
          const laptopWidth = frameW * 0.85;
          const laptopHeight = frameH * 0.7;
          const laptopX = frameX + (frameW - laptopWidth) / 2;
          const laptopY = frameY + (frameH - laptopHeight) / 2;
          const screenHeight = laptopHeight * 0.65;
          // Center QR code on laptop screen
          qrStartX = laptopX + (laptopWidth - size) / 2;
          qrStartY = laptopY + (screenHeight - size) / 2 + 4; // Account for bezel
          break;
        case 'rect':
        default:
          ctx.strokeRect(frameX, frameY, frameW, frameH);
          break;
      }
    }

    // Draw QR code on canvas
    ctx.drawImage(qrCanvasFinal, qrStartX, qrStartY, size, size);

    // Draw frame text if provided
    if (frame.text && frame.style !== 'none') {
      let textY = qrStartY + size + framePadding + textHeight / 2;
      let textStyle = 'bold 24px Arial, sans-serif';
      
      switch (frame.style) {
        case 'handwritten':
          // Handwritten style text
          textStyle = 'italic 22px "Comic Sans MS", cursive';
          ctx.fillStyle = frame.textColor;
          break;
        case 'thumbsup':
          // Draw thumbs up icon before text
          const thumbsX = canvas.width / 2 - 40;
          drawThumbsUp(ctx, thumbsX, textY - 12, 24, frame.textColor);
          break;
        case 'ribbon':
          // Text on ribbon banner
          ctx.fillStyle = '#FFFFFF'; // White text on dark ribbon
          break;
        case 'laptop':
          // Text on laptop screen (above QR code)
          textY = qrStartY - 30;
          break;
        default:
      ctx.fillStyle = frame.textColor;
      }
      
      ctx.font = textStyle;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(frame.text, canvas.width / 2, textY);
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Advanced QR code generation error:', error);
    throw new Error('Failed to generate advanced QR code');
  }
};
















