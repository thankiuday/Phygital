/**
 * Shared .mind (AR target) file generator from image buffer
 * Uses the same MindAR CLI as the upload page: mind-ar-js-cli compile
 * so the binary format is valid for MindAR's addImageTargetsFromBuffer.
 * No JSON fallback - invalid .mind files cause "Extra byte(s)" in the AR viewer.
 */

const path = require('path');
const os = require('os');
const fsPromises = require('fs').promises;
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { uploadToCloudinaryBuffer } = require('../config/cloudinary');

// Quote path for shell (Windows paths can contain spaces; escape quotes for cmd/PowerShell)
const quote = (p) => {
  const escaped = process.platform === 'win32' ? p.replace(/"/g, '""') : p.replace(/"/g, '\\"');
  return `"${escaped}"`;
};

/**
 * Generate .mind file from image buffer (same method as upload page)
 * Uses: npx -y mind-ar-js-cli@latest compile -i <image> -o <output.mind>
 * @param {Buffer} imageBuffer - The image buffer (e.g. composite design)
 * @param {string} userId - User ID for file naming and Cloudinary folder
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
const generateMindTarget = async (imageBuffer, userId) => {
  let tmpDir = null;
  let tmpImagePath = null;
  let outMindPath = null;

  try {
    console.log('🧠 Starting .mind file generation (same as upload page)...');

    tmpDir = path.join(os.tmpdir(), `phygital_mind_${Date.now()}_${uuidv4()}`);
    await fsPromises.mkdir(tmpDir, { recursive: true });
    console.log('📁 Created temp directory:', tmpDir);

    tmpImagePath = path.join(tmpDir, `design_${uuidv4()}.png`);
    await fsPromises.writeFile(tmpImagePath, imageBuffer);
    console.log('💾 Saved temp image:', tmpImagePath);

    outMindPath = path.join(tmpDir, `target_${uuidv4()}.mind`);
    console.log('🎯 Target .mind path:', outMindPath);

    // Same CLI as upload.js: mind-ar-js-cli@latest compile (produces valid binary .mind)
    // Use exec with shell so npx is found on Windows (spawn npx ENOENT otherwise)
    const inputQuoted = quote(tmpImagePath);
    const outputQuoted = quote(outMindPath);
    const mindCommand = `npx -y mind-ar-js-cli@latest compile -i ${inputQuoted} -o ${outputQuoted}`;
    console.log('⚙️ Running MindAR CLI (same as upload page):', mindCommand);

    await new Promise((resolve, reject) => {
      exec(mindCommand, {
        timeout: 300000,
        cwd: tmpDir,
        shell: true,
        env: { ...process.env, NODE_PATH: process.cwd() + path.sep + 'node_modules' }
      }, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ MindAR CLI failed:', err.message);
          if (stderr) console.error('stderr:', stderr);
          if (stdout) console.error('stdout:', stdout);
          return reject(new Error(`MindAR compile failed: ${err.message}. Install with: npx mind-ar-js-cli@latest`));
        }
        console.log('✅ MindAR CLI completed');
        resolve();
      });
    });

    try {
      await fsPromises.access(outMindPath);
    } catch (accessError) {
      throw new Error('MindAR CLI did not produce a .mind file. Ensure mind-ar-js-cli is installed.');
    }

    const mindBuffer = await fsPromises.readFile(outMindPath);
    console.log('📖 Read .mind file, size:', mindBuffer.length, 'bytes');

    const mindFilename = `target_${Date.now()}_${uuidv4()}.mind`;
    const uploadResult = await uploadToCloudinaryBuffer(mindBuffer, userId, 'targets', mindFilename, 'application/octet-stream');
    console.log('✅ .mind file uploaded to Cloudinary:', uploadResult.url);

    return {
      filename: uploadResult.public_id,
      url: uploadResult.url,
      size: mindBuffer.length,
      uploadedAt: new Date(),
      generated: true
    };
  } catch (error) {
    console.error('❌ .mind generation failed:', error);
    throw new Error(`Failed to generate .mind file: ${error.message}`);
  } finally {
    try {
      if (tmpImagePath) await fsPromises.unlink(tmpImagePath).catch(() => {});
      if (outMindPath) await fsPromises.unlink(outMindPath).catch(() => {});
      if (tmpDir) await fsPromises.rmdir(tmpDir).catch(() => {});
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError.message);
    }
  }
};

module.exports = { generateMindTarget };
