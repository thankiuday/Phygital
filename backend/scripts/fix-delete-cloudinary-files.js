/**
 * Fix Cloudinary File Deletion
 * Manually delete specific files that the automatic deletion missed
 * 
 * Usage: node scripts/fix-delete-cloudinary-files.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('\n🗑️  CLOUDINARY FILE DELETION FIX\n');
console.log('====================================\n');

/**
 * Files that failed to delete (from your logs)
 */
const filesToDelete = [
  {
    name: 'Composite Image',
    // Try multiple variations of the public_id
    publicIds: [
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/composite-image/composite-1761730878773-xtkohaa2k',
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/composite-image/composite-1761730878773-xtkohaa2k.png',
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/composite-image/composite-1761730878773-xtkohaa2k.jpg',
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/composite-image/composite-1761730878773-xtkohaa2k.jpeg'
    ],
    resourceType: 'image'
  },
  {
    name: 'Mind Target File',
    publicIds: [
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/targets/target-1761730903396',
      'phygital-zone/users/6900c0e05c6c22c5829e14d1/targets/target-1761730903396.mind'
    ],
    resourceType: 'raw'
  }
];

/**
 * Try to delete a file with multiple public_id variations
 */
async function tryDeleteFile(fileInfo) {
  console.log(`\n🗑️  Attempting to delete: ${fileInfo.name}`);
  console.log(`   Resource Type: ${fileInfo.resourceType}\n`);
  
  for (const publicId of fileInfo.publicIds) {
    try {
      console.log(`   Trying: ${publicId}`);
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: fileInfo.resourceType,
        invalidate: true
      });
      
      console.log(`   Result: ${result.result}`);
      
      if (result.result === 'ok') {
        console.log(`   ✅ Successfully deleted!`);
        return true;
      } else if (result.result === 'not found') {
        console.log(`   ⚠️  Not found with this public_id`);
        // Continue trying other variations
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`   ❌ Could not delete with any public_id variation`);
  return false;
}

/**
 * List all files in a folder to find the correct public_id
 */
async function listFilesInFolder(userId, folder, resourceType) {
  try {
    console.log(`\n📋 Listing ${resourceType} files in folder: phygital-zone/users/${userId}/${folder}...\n`);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: `phygital-zone/users/${userId}/${folder}`,
      resource_type: resourceType,
      max_results: 100
    });
    
    if (result.resources && result.resources.length > 0) {
      console.log(`   Found ${result.resources.length} file(s):\n`);
      
      result.resources.forEach(resource => {
        console.log(`   📄 ${resource.public_id}`);
        console.log(`      Format: ${resource.format || 'N/A'}`);
        console.log(`      Size: ${(resource.bytes / 1024).toFixed(2)}KB`);
        console.log(`      Created: ${resource.created_at}\n`);
      });
      
      return result.resources;
    } else {
      console.log(`   No files found in this folder.`);
      return [];
    }
  } catch (error) {
    if (error.error && error.error.message === 'Empty') {
      console.log(`   Folder is empty or doesn't exist.`);
      return [];
    }
    console.error(`   ❌ Error listing files: ${error.message}`);
    return [];
  }
}

/**
 * Delete files by searching the folder first
 */
async function deleteFilesBySearch(userId) {
  console.log('\n🔍 METHOD 2: Search and Delete\n');
  console.log('====================================\n');
  
  // Search for composite images
  console.log('🖼️  Searching for composite images...');
  const compositeFiles = await listFilesInFolder(userId, 'composite-image', 'image');
  
  for (const file of compositeFiles) {
    try {
      console.log(`   🗑️  Deleting: ${file.public_id}`);
      const result = await cloudinary.uploader.destroy(file.public_id, {
        resource_type: 'image',
        invalidate: true
      });
      console.log(`   Result: ${result.result} ${result.result === 'ok' ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Search for mind target files
  console.log('\n🎯 Searching for mind target files...');
  const mindFiles = await listFilesInFolder(userId, 'targets', 'raw');
  
  for (const file of mindFiles) {
    try {
      console.log(`   🗑️  Deleting: ${file.public_id}`);
      const result = await cloudinary.uploader.destroy(file.public_id, {
        resource_type: 'raw',
        invalidate: true
      });
      console.log(`   Result: ${result.result} ${result.result === 'ok' ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test connection
    console.log('🔗 Testing Cloudinary connection...\n');
    const pingResult = await cloudinary.api.ping();
    console.log('✅ Connected to Cloudinary\n');
    console.log('====================================\n');
    
    // Method 1: Try deleting with known public_ids
    console.log('🗑️  METHOD 1: Try Known Public IDs\n');
    console.log('====================================');
    
    let successCount = 0;
    for (const fileInfo of filesToDelete) {
      const deleted = await tryDeleteFile(fileInfo);
      if (deleted) successCount++;
    }
    
    console.log(`\n📊 Method 1 Results: ${successCount}/${filesToDelete.length} files deleted\n`);
    
    // Method 2: Search folders and delete what we find
    const userId = '6900c0e05c6c22c5829e14d1'; // Your user ID
    await deleteFilesBySearch(userId);
    
    console.log('\n✅ Done! Check your Cloudinary dashboard to verify.\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
main();



























