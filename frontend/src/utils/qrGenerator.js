/**
 * QR Code Generator Utility
 * Generates QR codes with optional icon overlays (similar to Bitly)
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
    const QRCode = await import('qrcode');
    const {
      iconUrl,
      size = 300,
      iconSize = 0.15, // 15% of QR code size
      darkColor = '#000000',
      lightColor = '#FFFFFF',
      errorCorrectionLevel = 'H' // High error correction for better icon overlay support
    } = options;

    // Generate base QR code
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: errorCorrectionLevel
    });

    // If no icon, return base QR code
    if (!iconUrl) {
      return qrCodeDataUrl;
    }

    // Create canvas to overlay icon
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    // Draw QR code on canvas
    const qrImage = new Image();
    await new Promise((resolve, reject) => {
      qrImage.onload = () => {
        ctx.drawImage(qrImage, 0, 0, size, size);
        resolve();
      };
      qrImage.onerror = reject;
      qrImage.src = qrCodeDataUrl;
    });

    // Load and overlay icon
    const iconImage = new Image();
    iconImage.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      iconImage.onload = () => {
        // Calculate icon dimensions (centered)
        const iconWidth = size * iconSize;
        const iconHeight = size * iconSize;
        const iconX = (size - iconWidth) / 2;
        const iconY = (size - iconHeight) / 2;

        // Draw white background for icon (to ensure QR code readability)
        const padding = iconWidth * 0.1; // 10% padding
        ctx.fillStyle = lightColor;
        ctx.fillRect(
          iconX - padding,
          iconY - padding,
          iconWidth + padding * 2,
          iconHeight + padding * 2
        );

        // Draw icon
        ctx.drawImage(iconImage, iconX, iconY, iconWidth, iconHeight);
        resolve();
      };
      iconImage.onerror = reject;
      iconImage.src = iconUrl;
    });

    // Return canvas as data URL
    return canvas.toDataURL('image/png');
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





