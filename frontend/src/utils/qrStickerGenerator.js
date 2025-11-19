/**
 * QR Sticker Generator Utility
 * Generates QR code stickers with gradient borders and "SCAN ME" text for download
 */

/**
 * Generate QR code sticker with gradient border and "SCAN ME" text
 * @param {string} qrCodeDataUrl - Data URL of the QR code
 * @param {Object} options - Generation options
 * @param {string} options.variant - Gradient variant: 'green-blue', 'blue', 'yellow-orange', 'orange-pink', 'purple'
 * @param {number} options.qrSize - QR code size in pixels (default: 300)
 * @param {number} options.borderWidth - Border width in pixels (default: 4)
 * @param {number} options.padding - Padding around QR code in pixels (default: 16)
 * @returns {Promise<string>} Data URL of the generated sticker
 */
export const generateQRSticker = async (qrCodeDataUrl, options = {}) => {
  try {
    const {
      variant = 'purple',
      qrSize = 300,
      borderWidth = 4,
      padding = 16
    } = options;

    // Gradient color variants
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

    // Load QR code image
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      qrImage.onload = () => {
        console.log('✅ QR code image loaded in sticker generator:', {
          width: qrImage.width,
          height: qrImage.height,
          naturalWidth: qrImage.naturalWidth,
          naturalHeight: qrImage.naturalHeight
        });
        if (qrImage.naturalWidth === 0 || qrImage.naturalHeight === 0) {
          reject(new Error('QR code image has zero dimensions'));
          return;
        }
        resolve();
      };
      qrImage.onerror = (error) => {
        console.error('❌ QR code image load error in sticker generator:', error);
        reject(new Error('Failed to load QR code image'));
      };
      qrImage.src = qrCodeDataUrl;
    });

    // Calculate dimensions
    const qrActualSize = qrSize;
    const totalPadding = padding * 2;
    const totalBorder = borderWidth * 2;
    const textHeight = 40; // Space for "SCAN ME" text inside border
    const stickerWidth = qrActualSize + totalPadding + totalBorder;
    const stickerHeight = qrActualSize + totalPadding + totalBorder + textHeight; // Height includes text inside

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = stickerWidth;
    canvas.height = stickerHeight;

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x, y, width, height, radius) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // Draw gradient border background with rounded corners
    const borderRadius = 16; // Rounded corners
    const gradient = ctx.createLinearGradient(0, 0, stickerWidth, 0);
    if (selectedGradient.border.length === 2) {
      gradient.addColorStop(0, selectedGradient.border[0]);
      gradient.addColorStop(1, selectedGradient.border[1]);
    } else {
      gradient.addColorStop(0, selectedGradient.border[0]);
      gradient.addColorStop(0.5, selectedGradient.border[1]);
      gradient.addColorStop(1, selectedGradient.border[2]);
    }
    
    // Add shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 5;
    
    ctx.fillStyle = gradient;
    drawRoundedRect(0, 0, stickerWidth, stickerHeight, borderRadius);
    ctx.fill();
    
    // Reset shadow for other elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw white background for QR code and text area with rounded corners
    const whiteBgX = borderWidth;
    const whiteBgY = borderWidth;
    const whiteBgWidth = qrActualSize + totalPadding;
    const whiteBgHeight = qrActualSize + totalPadding + textHeight;
    ctx.fillStyle = '#FFFFFF';
    const whiteRadius = Math.max(0, borderRadius - borderWidth);
    drawRoundedRect(whiteBgX, whiteBgY, whiteBgWidth, whiteBgHeight, whiteRadius);
    ctx.fill();

    // Draw QR code
    const qrX = borderWidth + padding;
    const qrY = borderWidth + padding;
    console.log('🎨 Drawing QR code in sticker:', { qrX, qrY, qrActualSize });
    ctx.drawImage(qrImage, qrX, qrY, qrActualSize, qrActualSize);
    console.log('✅ QR code drawn');

    // Draw "SCAN ME" text inside border, below QR code
    const textY = borderWidth + padding + qrActualSize + textHeight / 2;
    const fontSize = Math.max(20, Math.floor(qrSize * 0.08));
    console.log('📝 Drawing "SCAN ME" text:', { textY, fontSize, stickerWidth });
    
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Create gradient for text
    const textGradient = ctx.createLinearGradient(0, textY - fontSize / 2, stickerWidth, textY - fontSize / 2);
    if (selectedGradient.text.length === 2) {
      textGradient.addColorStop(0, selectedGradient.text[0]);
      textGradient.addColorStop(1, selectedGradient.text[1]);
    } else {
      textGradient.addColorStop(0, selectedGradient.text[0]);
      textGradient.addColorStop(0.5, selectedGradient.text[1]);
      textGradient.addColorStop(1, selectedGradient.text[2]);
    }

    ctx.fillStyle = textGradient;
    ctx.fillText('SCAN ME', stickerWidth / 2, textY);
    console.log('✅ "SCAN ME" text drawn');

    const resultDataUrl = canvas.toDataURL('image/png', 1.0);
    console.log('✅ Sticker generation complete:', { 
      canvasWidth: canvas.width, 
      canvasHeight: canvas.height,
      dataUrlLength: resultDataUrl.length 
    });
    return resultDataUrl;
  } catch (error) {
    console.error('QR sticker generation error:', error);
    throw new Error('Failed to generate QR sticker');
  }
};

