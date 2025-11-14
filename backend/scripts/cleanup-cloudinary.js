/**
 * Cloudinary Cleanup Script
 * Lists and optionally deletes all files for a specific user from Cloudinary
 * 
 * Usage:
 *   node scripts/cleanup-cloudinary.js --list                    # List all files
 *   node scripts/cleanup-cloudinary.js --user=USER_ID --list     # List user files
 *   node scripts/cleanup-cloudinary.js --user=USER_ID --delete   # Delete user files
 *   node scripts/cleanup-cloudinary.js --all --delete            # Delete ALL phygital files (DANGEROUS!)
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  list: args.includes('--list'),
  delete: args.includes('--delete'),
  all: args.includes('--all'),
  userId: args.find(arg => arg.startsWith('--user='))?.split('=')[1],
  folder: args.find(arg => arg.startsWith('--folder='))?.split('=')[1] || 'phygital-zone'
};

console.log('\n🧹 CLOUDINARY CLEANUP TOOL\n');
console.log('====================================');
console.log('Flags:', flags);
console.log('====================================\n');

/**
 * Get all resources from a Cloudinary folder
 */
async function listResources(folder, resourceType = 'image', nextCursor = null) {
  try {
    const options = {
      type: 'upload',
      prefix: folder,
      max_results: 500,
      resource_type: resourceType
    };
    
    if (nextCursor) {
      options.next_cursor = nextCursor;
    }
    
    const result = await cloudinary.api.resources(options);
    return result;
  } catch (error) {
    if (error.error && error.error.message === 'Empty') {
      return { resources: [] };
    }
    throw error;
  }
}

/**
 * List all files in Cloudinary phygital-zone folder
 */
async function listAllFiles() {
  console.log('📋 Listing all Cloudinary files...\n');
  
  const resourceTypes = ['image', 'video', 'raw'];
  const allFiles = [];
  
  for (const resourceType of resourceTypes) {
    console.log(`\n🔍 Checking ${resourceType} files...`);
    
    let nextCursor = null;
    let totalCount = 0;
    
    do {
      try {
        const result = await listResources(flags.folder, resourceType, nextCursor);
        const resources = result.resources || [];
        totalCount += resources.length;
        
        resources.forEach(resource => {
          const fileInfo = {
            public_id: resource.public_id,
            type: resourceType,
            format: resource.format,
            size: resource.bytes,
            created_at: resource.created_at,
            url: resource.secure_url
          };
          
          allFiles.push(fileInfo);
          
          // Extract user ID from public_id if possible
          const match = resource.public_id.match(/users\/([^\/]+)/);
          const userId = match ? match[1] : 'unknown';
          
          console.log(`  📄 [${resourceType}] ${resource.public_id}`);
          console.log(`     User: ${userId}, Size: ${(resource.bytes / 1024).toFixed(2)}KB, Created: ${resource.created_at}`);
        });
        
        nextCursor = result.next_cursor;
      } catch (error) {
        console.error(`❌ Error listing ${resourceType} files:`, error.message);
        break;
      }
    } while (nextCursor);
    
    console.log(`  ✅ Found ${totalCount} ${resourceType} files`);
  }
  
  console.log(`\n📊 Total files found: ${allFiles.length}`);
  return allFiles;
}

/**
 * Delete files for a specific user
 */
async function deleteUserFiles(userId) {
  console.log(`\n🗑️  Deleting files for user: ${userId}...\n`);
  
  const resourceTypes = ['image', 'video', 'raw'];
  let totalDeleted = 0;
  let totalFailed = 0;
  
  for (const resourceType of resourceTypes) {
    console.log(`\n🔍 Processing ${resourceType} files...`);
    
    let nextCursor = null;
    
    do {
      try {
        const result = await listResources(flags.folder, resourceType, nextCursor);
        const resources = result.resources || [];
        
        for (const resource of resources) {
          // Check if this file belongs to the user
          const userFolder = `phygital-zone/users/${userId}`;
          
          if (resource.public_id.includes(userFolder)) {
            try {
              console.log(`  🗑️  Deleting: ${resource.public_id}`);
              
              const deleteResult = await cloudinary.uploader.destroy(resource.public_id, {
                resource_type: resourceType,
                invalidate: true
              });
              
              if (deleteResult.result === 'ok') {
                console.log(`  ✅ Deleted successfully`);
                totalDeleted++;
              } else {
                console.log(`  ⚠️  Unexpected result: ${deleteResult.result}`);
                totalFailed++;
              }
            } catch (deleteError) {
              console.error(`  ❌ Delete failed: ${deleteError.message}`);
              totalFailed++;
            }
          }
        }
        
        nextCursor = result.next_cursor;
      } catch (error) {
        console.error(`❌ Error processing ${resourceType} files:`, error.message);
        break;
      }
    } while (nextCursor);
  }
  
  console.log(`\n📊 Deletion Summary:`);
  console.log(`  ✅ Successfully deleted: ${totalDeleted}`);
  console.log(`  ❌ Failed to delete: ${totalFailed}`);
}

/**
 * Delete ALL phygital-zone files (dangerous!)
 */
async function deleteAllFiles() {
  console.log('\n⚠️  WARNING: This will delete ALL phygital-zone files!\n');
  console.log('Waiting 5 seconds... Press Ctrl+C to cancel\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const resourceTypes = ['image', 'video', 'raw'];
  let totalDeleted = 0;
  let totalFailed = 0;
  
  for (const resourceType of resourceTypes) {
    console.log(`\n🔍 Deleting all ${resourceType} files...`);
    
    let nextCursor = null;
    
    do {
      try {
        const result = await listResources(flags.folder, resourceType, nextCursor);
        const resources = result.resources || [];
        
        for (const resource of resources) {
          try {
            console.log(`  🗑️  Deleting: ${resource.public_id}`);
            
            const deleteResult = await cloudinary.uploader.destroy(resource.public_id, {
              resource_type: resourceType,
              invalidate: true
            });
            
            if (deleteResult.result === 'ok' || deleteResult.result === 'not found') {
              console.log(`  ✅ Deleted`);
              totalDeleted++;
            } else {
              console.log(`  ⚠️  Result: ${deleteResult.result}`);
              totalFailed++;
            }
          } catch (deleteError) {
            console.error(`  ❌ Failed: ${deleteError.message}`);
            totalFailed++;
          }
        }
        
        nextCursor = result.next_cursor;
      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        break;
      }
    } while (nextCursor);
  }
  
  console.log(`\n📊 Deletion Summary:`);
  console.log(`  ✅ Successfully deleted: ${totalDeleted}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    // Test Cloudinary connection first
    console.log('🔗 Testing Cloudinary connection...\n');
    const pingResult = await cloudinary.api.ping();
    console.log('✅ Connected to Cloudinary:', pingResult);
    console.log('====================================\n');
    
    if (flags.list) {
      // List mode
      const files = await listAllFiles();
      
      if (flags.userId) {
        const userFolder = `phygital-zone/users/${flags.userId}`;
        const userFiles = files.filter(f => f.public_id.includes(userFolder));
        
        console.log(`\n\n📋 Files for user ${flags.userId}:`);
        console.log(`Found ${userFiles.length} files\n`);
        
        userFiles.forEach(file => {
          console.log(`  [${file.type}] ${file.public_id}`);
          console.log(`     ${(file.size / 1024).toFixed(2)}KB - ${file.created_at}\n`);
        });
      }
    } else if (flags.delete) {
      // Delete mode
      if (flags.all) {
        await deleteAllFiles();
      } else if (flags.userId) {
        await deleteUserFiles(flags.userId);
      } else {
        console.log('❌ Please specify --user=USER_ID or --all');
        process.exit(1);
      }
    } else {
      console.log('❌ Please specify --list or --delete');
      console.log('\nUsage examples:');
      console.log('  node scripts/cleanup-cloudinary.js --list');
      console.log('  node scripts/cleanup-cloudinary.js --user=6900c0e05c6c22c5829e14d1 --list');
      console.log('  node scripts/cleanup-cloudinary.js --user=6900c0e05c6c22c5829e14d1 --delete');
      process.exit(1);
    }
    
    console.log('\n✅ Done!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the script
main();






















