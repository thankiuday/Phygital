/**
 * QR Sticker Generator Utility
 * Generates QR code stickers with customizable frames and text styling
 */

/**
 * Generate QR code sticker with customizable frame and text
 * @param {string} qrCodeDataUrl - Data URL of the QR code
 * @param {Object} options - Generation options
 * @param {number} options.frameType - Frame type (1-9) (default: 1)
 * @param {string} options.textContent - Text content (default: "SCAN ME")
 * @param {Object} options.textStyle - Text styling options
 * @param {boolean} options.textStyle.bold - Bold text (default: true)
 * @param {boolean} options.textStyle.italic - Italic text (default: false)
 * @param {string} options.textStyle.color - Solid color hex (default: "#FFFFFF")
 * @param {Array<string>} options.textStyle.gradient - Array of gradient colors (null for solid color)
 * @param {number} options.qrSize - Target QR code display size in pixels (default: 300)
 * @param {number} options.qrSourceSize - Actual QR code source size in pixels (for scaling down high-res QR codes, default: same as qrSize)
 * @param {number} options.borderWidth - Border width in pixels (default: 4)
 * @param {number} options.padding - Padding around QR code in pixels (default: 16)
 * @param {string} options.variant - Legacy gradient variant (deprecated, use frameType instead)
 * @returns {Promise<string>} Data URL of the generated sticker
 */
export const generateQRSticker = async (qrCodeDataUrl, options = {}) => {
  try {
    const {
      frameType = 1,
      textContent = 'SCAN ME',
      textStyle = {
        bold: true,
        italic: false,
        color: '#FFFFFF',
        gradient: null
      },
      transparentBackground = false,
      qrSize = 300,
      qrSourceSize = null,
      borderWidth = 4,
      padding = 16,
      variant = 'purple' // Legacy support
    } = options;
    
    // Use qrSourceSize if provided, otherwise use qrSize (no scaling)
    const actualQrSourceSize = qrSourceSize || qrSize;

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

    // Calculate dimensions based on frame type
    const qrActualSize = qrSize;
    const totalPadding = padding * 2;
    const totalBorder = borderWidth * 2;
    const labelHeight = 40; // Height for label/bar
    const labelWidth = qrActualSize * 0.8; // Width for side labels
    
    // Calculate sticker dimensions based on frame type
    let stickerWidth, stickerHeight;
    const borderRadius = 8; // Rounded corners for square frames
    
    // Determine if label is on top (3, 4, 6, 9) or bottom (1, 2, 5)
    const topLabelFrames = [3, 4, 6, 9];
    const hasTopLabel = topLabelFrames.includes(frameType);
    
    if (frameType === 10) {
      // None - QR code only, no frame or text
      stickerWidth = qrActualSize;
      stickerHeight = qrActualSize;
    } else if (frameType === 7) {
      // Corner brackets only - minimal padding, no label
      stickerWidth = qrActualSize + totalPadding;
      stickerHeight = qrActualSize + totalPadding;
    } else if (frameType === 8) {
      // Label on right side
      stickerWidth = qrActualSize + totalPadding + totalBorder + labelWidth;
      stickerHeight = qrActualSize + totalPadding + totalBorder;
    } else if (hasTopLabel) {
      // Labels on top - need extra space above QR code
      stickerWidth = qrActualSize + totalPadding + totalBorder;
      stickerHeight = qrActualSize + totalPadding + totalBorder + labelHeight + (frameType === 4 ? labelPadding * 2 : 0);
    } else {
      // Labels on bottom (1, 2, 5)
      stickerWidth = qrActualSize + totalPadding + totalBorder;
      stickerHeight = qrActualSize + totalPadding + totalBorder + labelHeight;
    }
    
    console.log('📐 Sticker dimensions calculated:', {
      frameType,
      qrSize,
      stickerWidth,
      stickerHeight
    });

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

    // Helper function to draw L-shaped corner bracket
    const drawCornerBracket = (x, y, width, height, cornerSize = 20) => {
      ctx.beginPath();
      // Top-left corner
      ctx.moveTo(x, y + cornerSize);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerSize, y);
      // Top-right corner
      ctx.moveTo(x + width - cornerSize, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerSize);
      // Bottom-left corner
      ctx.moveTo(x, y + height - cornerSize);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerSize, y + height);
      // Bottom-right corner
      ctx.moveTo(x + width - cornerSize, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerSize);
      ctx.stroke();
    };

    // Draw frame based on type
    // For top labels (3, 4, 6, 9), move QR code down to make room for label
    // Reuse hasTopLabel from above
    const topLabelOffset = hasTopLabel ? labelHeight + (frameType === 4 ? labelPadding * 2 : 0) : 0;
    
    let qrX, qrY;
    const qrAreaWidth = qrActualSize;
    const qrAreaHeight = qrActualSize;

    if (frameType === 10) {
      // None - QR code only, centered
      qrX = 0;
      qrY = 0;
      // Transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      qrX = borderWidth + padding;
      qrY = borderWidth + padding + topLabelOffset; // Move QR code down if label is on top

      // Draw background (white for QR area) - skip if transparentBackground is true
      if (!transparentBackground) {
        ctx.fillStyle = '#FFFFFF';
        if (frameType === 7 || frameType === 9) {
          // Corner brackets - transparent background
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else {
          // Square frames with rounded corners
          drawRoundedRect(0, 0, stickerWidth, stickerHeight, borderRadius);
          ctx.fill();
        }
      } else {
        // Transparent background - clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Draw frame border
      if (frameType === 7 || frameType === 9) {
        // Corner brackets only
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        drawCornerBracket(qrX, qrY, qrAreaWidth, qrAreaHeight, 15);
      } else {
        // Square frame border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = borderWidth;
        drawRoundedRect(0, 0, stickerWidth, stickerHeight, borderRadius);
        ctx.stroke();
        
        // Draw inner white background for QR area (adjusted for top labels) - skip if transparentBackground is true
        if (!transparentBackground) {
          ctx.fillStyle = '#FFFFFF';
          const whiteRadius = Math.max(0, borderRadius - borderWidth / 2);
          // For top labels, the white background should start below the label
          const whiteBgY = hasTopLabel ? borderWidth + topLabelOffset : borderWidth;
          drawRoundedRect(borderWidth, whiteBgY, qrAreaWidth + totalPadding, qrAreaHeight + totalPadding, whiteRadius);
          ctx.fill();
        }
      }
    }

    // Draw QR code
    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(qrImage, qrX, qrY, qrActualSize, qrActualSize);
    ctx.imageSmoothingEnabled = true;

    // Draw label based on frame type
    const labelPadding = 8;
    const notchSize = 12;
    const arrowSize = 10;
    
    // Get text color/gradient
    const textColor = textStyle.gradient ? null : (textStyle.color || '#FFFFFF');
    let textGradient = null;
    if (textStyle.gradient && textStyle.gradient.length > 0) {
      textGradient = ctx.createLinearGradient(0, 0, stickerWidth, 0);
      textStyle.gradient.forEach((color, index) => {
        textGradient.addColorStop(index / (textStyle.gradient.length - 1), color);
      });
    }

    // Build font string
    let fontWeight = textStyle.bold ? 'bold' : 'normal';
    let fontStyle = textStyle.italic ? 'italic' : 'normal';
    const fontSize = Math.max(16, Math.floor(qrSize * 0.08));
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Set text fill style
    if (textGradient) {
      ctx.fillStyle = textGradient;
    } else {
      ctx.fillStyle = textColor;
    }

    // Draw label based on frame type
    // Skip text drawing for frameType 10 (None)
    if (frameType === 10) {
      // No text or frame, just QR code
      // Already drawn above, nothing more to do
    } else {
    switch (frameType) {
      case 1: {
        // Label attached to bottom with upward notch
        const labelY = qrY + qrAreaHeight + borderWidth;
        const labelX = borderWidth;
        const labelW = qrAreaWidth + totalPadding;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY);
        ctx.lineTo(labelX + labelW / 2 - notchSize / 2, labelY);
        ctx.lineTo(labelX + labelW / 2, labelY - notchSize);
        ctx.lineTo(labelX + labelW / 2 + notchSize / 2, labelY);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX, labelY + labelH);
        ctx.closePath();
        ctx.fill();
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 2: {
        // Label below with upward arrow (speech bubble)
        const labelY = qrY + qrAreaHeight + borderWidth + labelPadding;
        const labelX = borderWidth + padding;
        const labelW = qrAreaWidth;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY);
        ctx.lineTo(labelX + labelW / 2 - arrowSize, labelY);
        ctx.lineTo(labelX + labelW / 2, labelY - arrowSize);
        ctx.lineTo(labelX + labelW / 2 + arrowSize, labelY);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX, labelY + labelH);
        ctx.closePath();
        ctx.fill();
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 3: {
        // Label attached to top with downward notch - positioned above QR code
        const labelY = borderWidth;
        const labelX = borderWidth;
        const labelW = qrAreaWidth + totalPadding;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2 - notchSize / 2, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2, labelY + labelH + notchSize);
        ctx.lineTo(labelX + labelW / 2 + notchSize / 2, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.lineTo(labelX, labelY);
        ctx.closePath();
        ctx.fill();
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 4: {
        // Label above with downward arrow (speech bubble) - positioned above QR code
        const labelY = borderWidth + labelPadding;
        const labelX = borderWidth + padding;
        const labelW = qrAreaWidth;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2 - arrowSize, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2, labelY + labelH + arrowSize);
        ctx.lineTo(labelX + labelW / 2 + arrowSize, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.lineTo(labelX, labelY);
        ctx.closePath();
        ctx.fill();
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 5: {
        // Simple bar below (no notches/arrows)
        const labelY = qrY + qrAreaHeight + borderWidth;
        const labelX = borderWidth;
        const labelW = qrAreaWidth + totalPadding;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.fillRect(labelX, labelY, labelW, labelH);
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 6: {
        // Simple bar above (no notches/arrows) - positioned above QR code
        const labelY = borderWidth;
        const labelX = borderWidth;
        const labelW = qrAreaWidth + totalPadding;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.fillRect(labelX, labelY, labelW, labelH);
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
      
      case 7: {
        // Corner brackets only with decorative handwritten text
        // Text is drawn above QR code area (handwritten style simulation)
        const textY = qrY - 10;
        const textX = stickerWidth / 2;
        
        // Use a more casual font style for handwritten effect
        ctx.font = `${fontStyle} ${fontWeight} ${Math.floor(fontSize * 0.9)}px 'Comic Sans MS', cursive, sans-serif`;
        
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor;
        }
        ctx.fillText(textContent.toLowerCase(), textX, textY);
        
        // Draw decorative arrow
        ctx.strokeStyle = textGradient ? '#000000' : textColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(textX - 20, textY + 5);
        ctx.lineTo(textX + 20, textY + 15);
        ctx.moveTo(textX + 15, textY + 10);
        ctx.lineTo(textX + 20, textY + 15);
        ctx.lineTo(textX + 15, textY + 20);
        ctx.stroke();
        break;
      }
      
      case 8: {
        // Label to the right with left-pointing arrow
        const labelX = qrX + qrAreaWidth + borderWidth;
        const labelY = borderWidth + padding;
        const labelW = labelWidth;
        const labelH = qrAreaHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY);
        ctx.lineTo(labelX + arrowSize, labelY + labelH / 2 - arrowSize);
        ctx.lineTo(labelX, labelY + labelH / 2);
        ctx.lineTo(labelX + arrowSize, labelY + labelH / 2 + arrowSize);
        ctx.lineTo(labelX, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.closePath();
        ctx.fill();
        
        // Draw text (rotated)
        ctx.save();
        ctx.translate(labelX + labelW / 2, labelY + labelH / 2);
        ctx.rotate(Math.PI / 2);
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, 0, 0);
        ctx.restore();
        break;
      }
      
      case 9: {
        // Corner brackets with label above and downward arrow
        const labelY = borderWidth + labelPadding;
        const labelX = borderWidth + padding;
        const labelW = qrAreaWidth;
        const labelH = labelHeight;
        
        // Draw label background
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(labelX, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2 - arrowSize, labelY + labelH);
        ctx.lineTo(labelX + labelW / 2, labelY + labelH + arrowSize);
        ctx.lineTo(labelX + labelW / 2 + arrowSize, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY + labelH);
        ctx.lineTo(labelX + labelW, labelY);
        ctx.lineTo(labelX, labelY);
        ctx.closePath();
        ctx.fill();
        
        // Draw text
        if (textGradient) {
          ctx.fillStyle = textGradient;
        } else {
          ctx.fillStyle = textColor; // Use user-selected color
        }
        ctx.fillText(textContent, labelX + labelW / 2, labelY + labelH / 2);
        break;
      }
    }
    }

    const resultDataUrl = canvas.toDataURL('image/png', 1.0);
    console.log('✅ Sticker generation complete:', { 
      frameType,
      canvasWidth: canvas.width, 
      canvasHeight: canvas.height
    });
    return resultDataUrl;
  } catch (error) {
    console.error('QR sticker generation error:', error);
    throw new Error('Failed to generate QR sticker');
  }
};
