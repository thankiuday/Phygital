/**
 * Migration Script: Generate URL Codes
 * Generates urlCodes for all existing users and projects that don't have one
 * This is a one-time migration script
 * 
 * Usage: node backend/scripts/generateUrlCodes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { generateUniqueUserCode, generateUniqueProjectCode } = require('../utils/urlCodeGenerator');

async function generateUrlCodes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/phygital';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all users without urlCode
    const usersWithoutCode = await User.find({ 
      $or: [
        { urlCode: { $exists: false } },
        { urlCode: null },
        { urlCode: '' }
      ]
    });

    console.log(`\n📊 Found ${usersWithoutCode.length} users without urlCode`);

    let usersUpdated = 0;
    let projectsUpdated = 0;
    let errors = 0;

    // Generate urlCodes for users
    for (const user of usersWithoutCode) {
      try {
        console.log(`\n🔄 Processing user: ${user.username} (${user._id})`);
        
        // Generate unique urlCode
        const urlCode = await generateUniqueUserCode(User);
        user.urlCode = urlCode;
        await user.save();
        
        console.log(`  ✅ Generated urlCode: ${urlCode}`);
        usersUpdated++;

        // Generate urlCodes for projects without urlCode
        if (user.projects && user.projects.length > 0) {
          let projectNeedsUpdate = false;
          
          for (const project of user.projects) {
            if (!project.urlCode) {
              try {
                const projectUrlCode = await generateUniqueProjectCode(user);
                project.urlCode = projectUrlCode;
                projectNeedsUpdate = true;
                console.log(`  ✅ Generated project urlCode: ${projectUrlCode} for project "${project.name}"`);
                projectsUpdated++;
              } catch (projectError) {
                console.error(`  ❌ Error generating project urlCode for "${project.name}":`, projectError.message);
                errors++;
              }
            }
          }

          // Save user if any projects were updated
          if (projectNeedsUpdate) {
            await user.save();
            console.log(`  💾 Saved user with updated projects`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing user ${user.username}:`, error.message);
        errors++;
      }
    }

    // Also check for projects that might have been missed
    const allUsers = await User.find({ 'projects.0': { $exists: true } });
    for (const user of allUsers) {
      if (user.projects && user.projects.length > 0) {
        let projectNeedsUpdate = false;
        
        for (const project of user.projects) {
          if (!project.urlCode) {
            try {
              const projectUrlCode = await generateUniqueProjectCode(user);
              project.urlCode = projectUrlCode;
              projectNeedsUpdate = true;
              console.log(`  ✅ Generated project urlCode: ${projectUrlCode} for project "${project.name}" (user: ${user.username})`);
              projectsUpdated++;
            } catch (projectError) {
              console.error(`  ❌ Error generating project urlCode for "${project.name}":`, projectError.message);
              errors++;
            }
          }
        }

        if (projectNeedsUpdate) {
          await user.save();
        }
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log(`  ✅ Users updated: ${usersUpdated}`);
    console.log(`  ✅ Projects updated: ${projectsUpdated}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log('='.repeat(60));

    // Close connection
    await mongoose.connection.close();
    console.log('\n✅ Migration completed. Database connection closed.');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  generateUrlCodes()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = generateUrlCodes;

