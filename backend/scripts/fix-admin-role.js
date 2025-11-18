/**
 * Fix Admin Role Script
 * Ensures the admin user has the correct role set in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function fixAdminRole() {
  try {
    // Connect to MongoDB
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get admin email from environment
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@phygital.zone';
    
    // Find admin user
    console.log(`🔍 Looking for admin user: ${adminEmail}`);
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('❌ Admin user not found. Please login first to create the admin account.');
      process.exit(1);
    }
    
    console.log('✅ Found admin user');
    console.log('   Current role:', adminUser.role);
    console.log('   Current isActive:', adminUser.isActive);
    
    // Update role and status
    let updated = false;
    
    if (adminUser.role !== 'admin') {
      console.log('🔧 Updating role from', adminUser.role, 'to admin');
      adminUser.role = 'admin';
      updated = true;
    }
    
    if (!adminUser.isActive) {
      console.log('🔧 Activating admin account');
      adminUser.isActive = true;
      updated = true;
    }
    
    if (updated) {
      await adminUser.save();
      console.log('✅ Admin user updated successfully!');
      console.log('   New role:', adminUser.role);
      console.log('   New isActive:', adminUser.isActive);
    } else {
      console.log('✅ Admin user already has correct role and status');
    }
    
    // Verify the update
    const verifyUser = await User.findOne({ email: adminEmail });
    console.log('\n📋 Verification:');
    console.log('   Role:', verifyUser.role);
    console.log('   IsActive:', verifyUser.isActive);
    console.log('   Email:', verifyUser.email);
    console.log('   Username:', verifyUser.username);
    
    console.log('\n✅ Fix complete! Please try logging in again.');
    
  } catch (error) {
    console.error('❌ Error fixing admin role:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
fixAdminRole();











