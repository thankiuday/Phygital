/**
 * Printable Card Layouts
 * Generates business card images (1050x600px = 3.5x2" at 300 DPI) using Jimp.
 * Five layout options: Classic, Centered, Modern, Split, Minimal.
 */

const Jimp = require('jimp');
const QRCode = require('qrcode');

const CARD_WIDTH = 1050;
const CARD_HEIGHT = 600;
const PADDING = 60;

/**
 * Convert hex color to Jimp integer color
 */
function hexToJimpColor(hex, alpha = 255) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Jimp.rgbaToInt(r, g, b, alpha);
}

/**
 * Draw a filled rectangle on a Jimp image
 */
function drawRect(image, x, y, w, h, color) {
  const c = typeof color === 'number' ? color : hexToJimpColor(color);
  for (let px = x; px < x + w && px < image.bitmap.width; px++) {
    for (let py = y; py < y + h && py < image.bitmap.height; py++) {
      image.setPixelColor(c, px, py);
    }
  }
  return image;
}

/**
 * Load a Jimp font closest to the requested size.
 * Jimp has limited built-in fonts, so we use the closest match.
 */
async function loadFont(size, color = 'BLACK') {
  if (size >= 48) return Jimp.loadFont(Jimp[`FONT_SANS_64_${color}`]);
  if (size >= 24) return Jimp.loadFont(Jimp[`FONT_SANS_32_${color}`]);
  if (size >= 12) return Jimp.loadFont(Jimp[`FONT_SANS_16_${color}`]);
  return Jimp.loadFont(Jimp[`FONT_SANS_14_${color}`]);
}

/**
 * Determine if a color is light or dark to pick font color
 */
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

/**
 * Generate a QR code as a Jimp image
 */
async function generateQRImage(url, size = 200) {
  const qrBuffer = await QRCode.toBuffer(url, {
    width: size,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  return Jimp.read(qrBuffer);
}

/**
 * Load profile photo as Jimp image, resized and circular-cropped
 */
async function loadProfilePhoto(photoUrl, size = 120) {
  try {
    if (!photoUrl) return null;
    const photo = await Jimp.read(photoUrl);
    photo.cover(size, size);
    // Create circular mask
    const mask = new Jimp(size, size, 0x00000000);
    const center = size / 2;
    const radius = center;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
        if (dist <= radius) {
          mask.setPixelColor(0xFFFFFFFF, x, y);
        }
      }
    }
    photo.mask(mask, 0, 0);
    return photo;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────
// FRONT LAYOUTS
// ────────────────────────────────────────────────────────

/**
 * Classic layout — left-aligned name/title, right contact info
 */
async function classicFront(cardData, colors) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const textColor = colors.text || '#1F2937';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  // Accent bar on left
  drawRect(image, 0, 0, 8, CARD_HEIGHT, primaryColor);

  // Load fonts
  const fontLg = await loadFont(48, fontColor);
  const fontMd = await loadFont(24, fontColor);
  const fontSm = await loadFont(12, fontColor);

  // Profile photo
  const photo = await loadProfilePhoto(cardData.profile?.photo, 100);
  if (photo) {
    image.composite(photo, PADDING + 20, PADDING);
  }

  // Name
  const nameX = photo ? PADDING + 140 : PADDING + 20;
  image.print(fontLg, nameX, PADDING, {
    text: cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - nameX - PADDING, 80);

  // Title
  image.print(fontMd, nameX, PADDING + 70, {
    text: cardData.profile?.title || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - nameX - PADDING, 40);

  // Company
  image.print(fontSm, nameX, PADDING + 110, {
    text: cardData.profile?.company || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - nameX - PADDING, 30);

  // Divider line
  drawRect(image, PADDING + 20, CARD_HEIGHT - 200, CARD_WIDTH - 2 * PADDING - 40, 2, primaryColor);

  // Contact info at bottom
  const contactY = CARD_HEIGHT - 180;
  const contactItems = [];
  if (cardData.contact?.phone) contactItems.push(`Phone: ${cardData.contact.phone}`);
  if (cardData.contact?.email) contactItems.push(`Email: ${cardData.contact.email}`);
  if (cardData.contact?.website) contactItems.push(`Web: ${cardData.contact.website}`);

  for (let i = 0; i < contactItems.length; i++) {
    image.print(fontSm, PADDING + 20, contactY + i * 35, {
      text: contactItems[i],
      alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
    }, CARD_WIDTH - 2 * PADDING, 30);
  }

  return image;
}

/**
 * Centered layout — everything centered
 */
async function centeredFront(cardData, colors) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  // Top accent strip
  drawRect(image, 0, 0, CARD_WIDTH, 6, primaryColor);

  const fontLg = await loadFont(48, fontColor);
  const fontMd = await loadFont(24, fontColor);
  const fontSm = await loadFont(12, fontColor);

  // Profile photo centered
  const photo = await loadProfilePhoto(cardData.profile?.photo, 100);
  if (photo) {
    image.composite(photo, (CARD_WIDTH - 100) / 2, 40);
  }

  const nameY = photo ? 160 : 80;

  // Name centered
  image.print(fontLg, 0, nameY, {
    text: cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 80);

  // Title
  image.print(fontMd, 0, nameY + 70, {
    text: cardData.profile?.title || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 40);

  // Company
  image.print(fontSm, 0, nameY + 110, {
    text: cardData.profile?.company || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 30);

  // Bottom divider
  drawRect(image, CARD_WIDTH / 4, CARD_HEIGHT - 150, CARD_WIDTH / 2, 2, primaryColor);

  // Contact centered at bottom
  const contactParts = [];
  if (cardData.contact?.phone) contactParts.push(cardData.contact.phone);
  if (cardData.contact?.email) contactParts.push(cardData.contact.email);
  const contactLine = contactParts.join('  |  ');

  image.print(fontSm, 0, CARD_HEIGHT - 130, {
    text: contactLine,
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 30);

  if (cardData.contact?.website) {
    image.print(fontSm, 0, CARD_HEIGHT - 90, {
      text: cardData.contact.website,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, CARD_WIDTH, 30);
  }

  return image;
}

/**
 * Modern layout — large name top, accent bar, details bottom
 */
async function modernFront(cardData, colors) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';
  const accentFontColor = isLightColor(primaryColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  const fontLg = await loadFont(48, fontColor);
  const fontMd = await loadFont(24, accentFontColor);
  const fontSm = await loadFont(12, fontColor);

  // Large name at top
  image.print(fontLg, PADDING, PADDING, {
    text: cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - 2 * PADDING, 80);

  // Accent bar in middle
  const barY = 200;
  const barH = 60;
  drawRect(image, 0, barY, CARD_WIDTH, barH, primaryColor);

  // Title on accent bar
  image.print(fontMd, PADDING, barY + 14, {
    text: `${cardData.profile?.title || ''}${cardData.profile?.company ? '  —  ' + cardData.profile.company : ''}`,
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - 2 * PADDING, 40);

  // Photo on right side
  const photo = await loadProfilePhoto(cardData.profile?.photo, 110);
  if (photo) {
    image.composite(photo, CARD_WIDTH - PADDING - 110, barY + barH + 30);
  }

  // Contact info below bar
  const contactY = barY + barH + 40;
  const contactItems = [];
  if (cardData.contact?.phone) contactItems.push(cardData.contact.phone);
  if (cardData.contact?.email) contactItems.push(cardData.contact.email);
  if (cardData.contact?.website) contactItems.push(cardData.contact.website);

  for (let i = 0; i < contactItems.length; i++) {
    image.print(fontSm, PADDING, contactY + i * 35, {
      text: contactItems[i],
      alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
    }, CARD_WIDTH - 2 * PADDING - 140, 30);
  }

  return image;
}

/**
 * Split layout — two-column with colored divider
 */
async function splitFront(cardData, colors) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';
  const leftFontColor = isLightColor(primaryColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  // Left column with primary color
  const leftWidth = Math.floor(CARD_WIDTH * 0.38);
  drawRect(image, 0, 0, leftWidth, CARD_HEIGHT, primaryColor);

  const fontLg = await loadFont(48, leftFontColor);
  const fontMd = await loadFont(24, leftFontColor);
  const fontSmLeft = await loadFont(12, leftFontColor);
  const fontSmRight = await loadFont(12, fontColor);

  // Photo on left
  const photo = await loadProfilePhoto(cardData.profile?.photo, 100);
  if (photo) {
    image.composite(photo, (leftWidth - 100) / 2, 50);
  }

  // Name on left
  image.print(fontMd, 20, photo ? 170 : 80, {
    text: cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, leftWidth - 40, 60);

  // Title on left
  image.print(fontSmLeft, 20, photo ? 230 : 140, {
    text: cardData.profile?.title || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, leftWidth - 40, 30);

  // Right column — contact info
  const rightX = leftWidth + 40;
  const rightWidth = CARD_WIDTH - leftWidth - 60;
  const fontMdRight = await loadFont(24, fontColor);

  // Company name
  image.print(fontMdRight, rightX, PADDING, {
    text: cardData.profile?.company || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, rightWidth, 40);

  drawRect(image, rightX, PADDING + 50, 80, 3, primaryColor);

  // Contact details
  const contactY = PADDING + 80;
  const items = [];
  if (cardData.contact?.phone) items.push(`Phone: ${cardData.contact.phone}`);
  if (cardData.contact?.email) items.push(`Email: ${cardData.contact.email}`);
  if (cardData.contact?.website) items.push(`Web: ${cardData.contact.website}`);

  for (let i = 0; i < items.length; i++) {
    image.print(fontSmRight, rightX, contactY + i * 40, {
      text: items[i],
      alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
    }, rightWidth, 30);
  }

  return image;
}

/**
 * Minimal layout — maximum whitespace, subtle typography
 */
async function minimalFront(cardData, colors) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  const fontLg = await loadFont(48, fontColor);
  const fontMd = await loadFont(24, fontColor);
  const fontSm = await loadFont(12, fontColor);

  // Thin top accent line
  drawRect(image, PADDING, PADDING, CARD_WIDTH - 2 * PADDING, 2, primaryColor);

  // Name
  image.print(fontLg, PADDING, PADDING + 30, {
    text: cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - 2 * PADDING, 80);

  // Title + Company
  const subtitle = [cardData.profile?.title, cardData.profile?.company].filter(Boolean).join(' — ');
  image.print(fontSm, PADDING, PADDING + 100, {
    text: subtitle,
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - 2 * PADDING, 30);

  // Bottom thin accent line
  drawRect(image, PADDING, CARD_HEIGHT - PADDING - 80, CARD_WIDTH - 2 * PADDING, 1, primaryColor);

  // Contact at very bottom
  const contactParts = [];
  if (cardData.contact?.email) contactParts.push(cardData.contact.email);
  if (cardData.contact?.phone) contactParts.push(cardData.contact.phone);
  if (cardData.contact?.website) contactParts.push(cardData.contact.website);
  const contactLine = contactParts.join('   ');

  image.print(fontSm, PADDING, CARD_HEIGHT - PADDING - 60, {
    text: contactLine,
    alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT
  }, CARD_WIDTH - 2 * PADDING, 30);

  return image;
}

// ────────────────────────────────────────────────────────
// BACK LAYOUT (shared across all styles)
// ────────────────────────────────────────────────────────

/**
 * Generate the back side of the card with QR code
 */
async function generateBack(cardData, colors, publicUrl) {
  const bgColor = colors.background || '#FFFFFF';
  const primaryColor = colors.primary || '#1E40AF';
  const fontColor = isLightColor(bgColor) ? 'BLACK' : 'WHITE';

  const image = new Jimp(CARD_WIDTH, CARD_HEIGHT, hexToJimpColor(bgColor));

  // Accent strip at top
  drawRect(image, 0, 0, CARD_WIDTH, 8, primaryColor);

  const fontMd = await loadFont(24, fontColor);
  const fontSm = await loadFont(12, fontColor);

  // QR code centered
  if (publicUrl) {
    try {
      const qr = await generateQRImage(publicUrl, 240);
      image.composite(qr, (CARD_WIDTH - 240) / 2, 80);
    } catch (qrErr) {
      console.error('QR generation error:', qrErr.message);
    }
  }

  // Company name below QR
  image.print(fontMd, 0, 350, {
    text: cardData.profile?.company || cardData.profile?.name || '',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 40);

  // Scan instruction
  image.print(fontSm, 0, 400, {
    text: 'Scan to view my digital card',
    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
  }, CARD_WIDTH, 30);

  // URL text at bottom
  if (publicUrl) {
    image.print(fontSm, 0, CARD_HEIGHT - 60, {
      text: publicUrl,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, CARD_WIDTH, 30);
  }

  // Bottom accent strip
  drawRect(image, 0, CARD_HEIGHT - 8, CARD_WIDTH, 8, primaryColor);

  return image;
}

// Layout registry
const FRONT_LAYOUTS = {
  classic: classicFront,
  centered: centeredFront,
  modern: modernFront,
  split: splitFront,
  minimal: minimalFront
};

/**
 * Generate a printable card image (front or back)
 * @param {string} layoutId - Layout name
 * @param {string} side - 'front' or 'back'
 * @param {Object} cardData - Business card data
 * @param {Object} colors - Color palette { primary, secondary, accent, background, text }
 * @param {string} publicUrl - Public URL for QR code on back
 * @returns {Buffer} PNG image buffer
 */
async function generatePrintableCard(layoutId, side, cardData, colors, publicUrl) {
  let image;

  if (side === 'back') {
    image = await generateBack(cardData, colors, publicUrl);
  } else {
    const layoutFn = FRONT_LAYOUTS[layoutId] || FRONT_LAYOUTS.classic;
    image = await layoutFn(cardData, colors);
  }

  return image.getBufferAsync(Jimp.MIME_PNG);
}

/**
 * Get list of available layout IDs
 */
function getAvailableLayouts() {
  return [
    { id: 'classic', name: 'Classic', description: 'Left-aligned name, right contact info' },
    { id: 'centered', name: 'Centered', description: 'Everything centered, clean hierarchy' },
    { id: 'modern', name: 'Modern', description: 'Large name at top, accent bar, details below' },
    { id: 'split', name: 'Split', description: 'Two-column with colored divider' },
    { id: 'minimal', name: 'Minimal', description: 'Maximum whitespace, subtle typography' }
  ];
}

module.exports = { generatePrintableCard, getAvailableLayouts, CARD_WIDTH, CARD_HEIGHT };
