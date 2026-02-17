/**
 * OCR Image Preprocessor
 * Enhances business card images before OCR to improve text recognition accuracy.
 * Uses Jimp for grayscale conversion, contrast boost, inversion, and normalization.
 */

const Jimp = require('jimp');

/**
 * Calculate the average brightness of an image (0-255).
 * Samples every 4th pixel for performance.
 */
function averageBrightness(image) {
  let total = 0;
  let count = 0;
  const { data, width, height } = image.bitmap;

  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total += 0.299 * r + 0.587 * g + 0.114 * b;
    count++;
  }

  return count > 0 ? total / count : 128;
}

/**
 * Apply a binary threshold to a grayscale image.
 * Pixels above the threshold become white (255), below become black (0).
 */
function applyThreshold(image, threshold = 128) {
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const gray = this.bitmap.data[idx];
    const val = gray >= threshold ? 255 : 0;
    this.bitmap.data[idx] = val;
    this.bitmap.data[idx + 1] = val;
    this.bitmap.data[idx + 2] = val;
  });
  return image;
}

/**
 * Preprocess an image buffer for optimal OCR results.
 * Pipeline: scale up -> grayscale -> contrast -> detect dark bg & invert -> normalize -> threshold
 *
 * @param {Buffer} buffer - Raw image buffer (PNG/JPG)
 * @returns {Promise<Buffer>} Preprocessed PNG buffer ready for Tesseract
 */
async function preprocessForOCR(buffer) {
  const image = await Jimp.read(buffer);

  // Scale up small images so Tesseract has more pixels to work with
  if (image.bitmap.width < 1000) {
    const scaleFactor = Math.ceil(1000 / image.bitmap.width);
    image.scale(Math.min(scaleFactor, 3));
  }

  // Convert to grayscale to remove color noise
  image.grayscale();

  // Check average brightness before contrast adjustment
  const avgBefore = averageBrightness(image);

  // Boost contrast to make text stand out
  image.contrast(0.6);

  // If the image is predominantly dark (dark background card),
  // invert it so text becomes dark-on-light (Tesseract's preferred format)
  if (avgBefore < 128) {
    image.invert();
  }

  // Normalize the histogram to use full dynamic range
  image.normalize();

  // Apply binary threshold for cleanest possible OCR input
  applyThreshold(image, 140);

  return image.getBufferAsync(Jimp.MIME_PNG);
}

/**
 * Run OCR with two preprocessing variants and pick the best result.
 * Variant 1: Standard preprocessing (as above)
 * Variant 2: Inverted preprocessing (for cards where auto-detection picks wrong direction)
 * Returns the variant that produces more recognized characters.
 *
 * @param {Buffer} buffer - Raw image buffer
 * @param {Object} worker - Tesseract.js worker (already initialized)
 * @returns {Promise<string>} Best OCR text result
 */
async function ocrWithBestVariant(buffer, worker) {
  // Variant 1: standard preprocessing
  const processed1 = await preprocessForOCR(buffer);
  const result1 = await worker.recognize(processed1);
  const text1 = (result1.data.text || '').trim();

  // Variant 2: force-inverted preprocessing
  const image2 = await Jimp.read(buffer);
  if (image2.bitmap.width < 1000) {
    image2.scale(Math.min(Math.ceil(1000 / image2.bitmap.width), 3));
  }
  image2.grayscale();
  image2.contrast(0.6);
  // Always invert regardless of brightness
  const avgBright = averageBrightness(image2);
  if (avgBright >= 128) {
    image2.invert();
  }
  image2.normalize();
  applyThreshold(image2, 140);
  const processed2 = await image2.getBufferAsync(Jimp.MIME_PNG);
  const result2 = await worker.recognize(processed2);
  const text2 = (result2.data.text || '').trim();

  // Pick the variant with more meaningful text (more alphanumeric characters)
  const alpha1 = (text1.match(/[a-zA-Z0-9]/g) || []).length;
  const alpha2 = (text2.match(/[a-zA-Z0-9]/g) || []).length;

  if (alpha2 > alpha1 * 1.2) {
    return text2;
  }
  return text1;
}

module.exports = { preprocessForOCR, ocrWithBestVariant };
