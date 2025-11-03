/**
 * Script to manually update project with .mind file URL from Cloudinary
 * Use this when .mind file exists in Cloudinary but database wasn't updated
 */

const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixMindTargetUrl() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // USER ID and PROJECT ID - UPDATE THESE
    const userId = '68c7d41c925256c5878cc65e';
    const projectId = '1760029177404';
    
    // .MIND FILE URL from Cloudinary - UPDATE THIS
    const mindFileUrl = 'YOUR_CLOUDINARY_MIND_FILE_URL_HERE';
    
    console.log('🔍 Looking for user:', userId);
    console.log('🔍 Looking for project:', projectId);
    console.log('🔗 .mind file URL:', mindFileUrl);
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.username);
    
    // Find the project
    const project = user.projects?.find(p => p.id === projectId);
    if (!project) {
      console.error('❌ Project not found');
      process.exit(1);
    }
    
    console.log('✅ Project found:', project.name);
    console.log('📁 Current mindTarget:', project.uploadedFiles?.mindTarget?.url || 'null');
    
    // Prepare .mind target data
    const mindTargetData = {
      filename: mindFileUrl.split('/').pop(),
      url: mindFileUrl,
      size: 0, // We don't know the size, set to 0
      uploadedAt: new Date(),
      generated: true
    };
    
    // Find project index
    const projectIndex = user.projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      console.error('❌ Could not find project index');
      process.exit(1);
    }
    
    // Update the project with .mind file URL
    const updateData = {
      [`projects.${projectIndex}.uploadedFiles.mindTarget`]: mindTargetData
    };
    
    console.log('💾 Updating project with .mind file URL...');
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );
    
    const updatedProject = updatedUser.projects.find(p => p.id === projectId);
    
    console.log('✅ Project updated successfully!');
    console.log('🎯 New mindTarget URL:', updatedProject.uploadedFiles?.mindTarget?.url);
    
    console.log('\n🎉 Done! Now try opening AR Experience page again.');
    
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixMindTargetUrl();

































