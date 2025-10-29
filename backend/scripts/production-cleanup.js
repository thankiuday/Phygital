/**
 * PRODUCTION CLEANUP SCRIPT
 * ===========================
 * Comprehensive script to clean all test/development data before production deployment
 * 
 * Features:
 * - Clears MongoDB database (all collections)
 * - Cleans Cloudinary storage (all user files)
 * - Multiple safety confirmations
 * - Environment checks
 * - Detailed logging
 * - Dry-run mode
 * 
 * Usage:
 *   node scripts/production-cleanup.js --dry-run              # Preview what will be deleted
 *   node scripts/production-cleanup.js --confirm              # Actually delete (requires confirmation)
 *   node scripts/production-cleanup.js --db-only --confirm    # Only clear database
 *   node scripts/production-cleanup.js --cloud-only --confirm # Only clear Cloudinary
 */

require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const readline = require('readline');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  confirm: args.includes('--confirm'),
  dbOnly: args.includes('--db-only'),
  cloudOnly: args.includes('--cloud-only'),
  skipConfirm: args.includes('--skip-confirm'), // DANGEROUS: Skip manual confirmation
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Logging helpers
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}${'='.repeat(60)}${colors.reset}\n${colors.magenta}${msg}${colors.reset}\n${colors.magenta}${'='.repeat(60)}${colors.reset}\n`),
};

/**
 * Check if we're in production environment
 */
function checkEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  const mongoUri = process.env.MONGODB_URI || '';
  
  log.section('ENVIRONMENT CHECK');
  console.log(`Environment: ${env}`);
  console.log(`MongoDB URI: ${mongoUri.substring(0, 50)}...`);
  console.log(`Cloudinary Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  
  if (env === 'production' && !flags.skipConfirm) {
    log.error('DANGER: Running in PRODUCTION environment!');
    log.warning('This script is meant for cleaning development/test data.');
    log.warning('Are you ABSOLUTELY sure you want to proceed?');
    return false;
  }
  
  return true;
}

/**
 * Get user confirmation
 */
async function getUserConfirmation(message) {
  if (flags.skipConfirm) {
    log.warning('Skipping manual confirmation (--skip-confirm flag)');
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message} (type 'yes' to confirm): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Clean MongoDB Database
 */
async function cleanDatabase() {
  if (flags.cloudOnly) {
    log.info('Skipping database cleanup (--cloud-only flag)');
    return;
  }
  
  log.section('DATABASE CLEANUP');
  
  try {
    log.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📋 Found ${collections.length} collections:\n`);
    
    let totalDocuments = 0;
    const collectionStats = [];
    
    // Get statistics
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      totalDocuments += count;
      collectionStats.push({ name: collection.name, count });
      console.log(`  📦 ${collection.name}: ${count} documents`);
    }
    
    console.log(`\n📊 Total documents: ${totalDocuments}\n`);
    
    if (flags.dryRun) {
      log.warning('DRY RUN MODE: No data will be deleted');
      return;
    }
    
    if (totalDocuments === 0) {
      log.info('Database is already empty!');
      return;
    }
    
    // Confirmation
    if (!flags.confirm) {
      log.error('Missing --confirm flag. Add it to actually delete data.');
      return;
    }
    
    const confirmed = await getUserConfirmation(
      `⚠️  DELETE ${totalDocuments} documents from ${collections.length} collections?`
    );
    
    if (!confirmed) {
      log.warning('Database cleanup cancelled by user');
      return;
    }
    
    // Delete data
    log.info('Deleting data...\n');
    for (const { name, count } of collectionStats) {
      if (count > 0) {
        console.log(`  🗑️  Clearing "${name}" (${count} documents)...`);
        await db.collection(name).deleteMany({});
        log.success(`  Cleared "${name}"`);
      }
    }
    
    log.success(`\nAll ${totalDocuments} documents deleted from database!`);
    
  } catch (error) {
    log.error(`Database cleanup failed: ${error.message}`);
    throw error;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log.info('Disconnected from MongoDB');
    }
  }
}

/**
 * Clean Cloudinary Storage
 */
async function cleanCloudinary() {
  if (flags.dbOnly) {
    log.info('Skipping Cloudinary cleanup (--db-only flag)');
    return;
  }
  
  log.section('CLOUDINARY CLEANUP');
  
  try {
    log.info('Connecting to Cloudinary...');
    const pingResult = await cloudinary.api.ping();
    log.success('Connected to Cloudinary');
    
    const folder = 'phygital-zone';
    const resourceTypes = ['image', 'video', 'raw'];
    
    let totalFiles = 0;
    const fileStats = [];
    
    // Get statistics
    log.info('Scanning files...\n');
    for (const resourceType of resourceTypes) {
      try {
        const result = await cloudinary.api.resources({
          type: 'upload',
          prefix: folder,
          max_results: 500,
          resource_type: resourceType
        });
        
        const count = result.resources.length;
        totalFiles += count;
        fileStats.push({ type: resourceType, count, resources: result.resources });
        
        console.log(`  📁 ${resourceType}: ${count} files`);
      } catch (error) {
        if (error.error?.message !== 'Empty') {
          throw error;
        }
        console.log(`  📁 ${resourceType}: 0 files`);
      }
    }
    
    console.log(`\n📊 Total files: ${totalFiles}\n`);
    
    if (flags.dryRun) {
      log.warning('DRY RUN MODE: No files will be deleted');
      
      // Show file details in dry-run
      for (const { type, resources } of fileStats) {
        if (resources.length > 0) {
          console.log(`\n${type.toUpperCase()} Files:`);
          resources.slice(0, 5).forEach(r => {
            console.log(`  - ${r.public_id} (${(r.bytes / 1024).toFixed(2)}KB)`);
          });
          if (resources.length > 5) {
            console.log(`  ... and ${resources.length - 5} more`);
          }
        }
      }
      return;
    }
    
    if (totalFiles === 0) {
      log.info('Cloudinary is already empty!');
      return;
    }
    
    // Confirmation
    if (!flags.confirm) {
      log.error('Missing --confirm flag. Add it to actually delete files.');
      return;
    }
    
    const confirmed = await getUserConfirmation(
      `⚠️  DELETE ${totalFiles} files from Cloudinary?`
    );
    
    if (!confirmed) {
      log.warning('Cloudinary cleanup cancelled by user');
      return;
    }
    
    // Delete files
    log.info('Deleting files...\n');
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const { type, resources } of fileStats) {
      if (resources.length > 0) {
        console.log(`\n  🗑️  Deleting ${type} files...`);
        
        for (const resource of resources) {
          try {
            await cloudinary.uploader.destroy(resource.public_id, {
              resource_type: type,
              invalidate: true
            });
            deletedCount++;
            console.log(`    ✓ ${resource.public_id}`);
          } catch (error) {
            failedCount++;
            console.log(`    ✗ ${resource.public_id}: ${error.message}`);
          }
        }
      }
    }
    
    log.success(`\nCloudinary cleanup complete!`);
    console.log(`  ✅ Deleted: ${deletedCount} files`);
    if (failedCount > 0) {
      console.log(`  ❌ Failed: ${failedCount} files`);
    }
    
  } catch (error) {
    log.error(`Cloudinary cleanup failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`\n${colors.magenta}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.magenta}║                                                            ║${colors.reset}`);
  console.log(`${colors.magenta}║          PHYGITAL ZONE - PRODUCTION CLEANUP SCRIPT         ║${colors.reset}`);
  console.log(`${colors.magenta}║                                                            ║${colors.reset}`);
  console.log(`${colors.magenta}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Show mode
  if (flags.dryRun) {
    log.warning('🔍 DRY RUN MODE - No data will be deleted');
  } else if (flags.confirm) {
    log.warning('🔥 DELETE MODE - Data will be permanently deleted!');
  } else {
    log.error('❌ Missing --confirm or --dry-run flag');
    console.log('\nUsage:');
    console.log('  node scripts/production-cleanup.js --dry-run              # Preview');
    console.log('  node scripts/production-cleanup.js --confirm              # Delete all');
    console.log('  node scripts/production-cleanup.js --db-only --confirm    # DB only');
    console.log('  node scripts/production-cleanup.js --cloud-only --confirm # Cloud only');
    process.exit(1);
  }
  
  // Environment check
  if (!checkEnvironment()) {
    const confirmed = await getUserConfirmation(
      '⚠️  Continue in PRODUCTION environment? This is DANGEROUS!'
    );
    if (!confirmed) {
      log.warning('Cleanup cancelled for safety');
      process.exit(0);
    }
  }
  
  try {
    // Clean database
    await cleanDatabase();
    
    // Clean Cloudinary
    await cleanCloudinary();
    
    // Final summary
    log.section('CLEANUP COMPLETE');
    log.success('All cleanup operations completed successfully!');
    
    if (!flags.dryRun) {
      log.success('🎉 Database is now ready for production deployment!');
      console.log('\nNext steps:');
      console.log('  1. Deploy your application');
      console.log('  2. Create your first production user');
      console.log('  3. Test all features');
    }
    
    console.log('\n');
    process.exit(0);
    
  } catch (error) {
    log.section('CLEANUP FAILED');
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

