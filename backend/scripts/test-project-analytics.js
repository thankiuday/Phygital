/**
 * Test script to manually update project analytics
 * This will help verify the analytics system is working
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Analytics = require('../models/Analytics');

async function testProjectAnalytics() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Your user ID and project ID
    const userId = '68c7d41c925256c5878cc65e';
    const projectId = '1760088947810';

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`👤 User found: ${user.username}`);
    console.log(`📊 Projects: ${user.projects.length}`);

    // Find the project
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      console.log('❌ Project not found');
      console.log('Available projects:', user.projects.map(p => ({ id: p.id, name: p.name })));
      return;
    }

    console.log(`✅ Project found: ${project.name}`);
    console.log('Current analytics:', project.analytics);

    // Test tracking an analytics event
    console.log('\n🧪 Testing analytics tracking...');
    await Analytics.trackEvent(userId, 'arExperienceStart', {
      userAgent: 'Test Script',
      ipAddress: '127.0.0.1'
    }, projectId);

    console.log('✅ Analytics event tracked');

    // Reload user to see updated analytics
    const updatedUser = await User.findById(userId);
    const updatedProject = updatedUser.projects.find(p => p.id === projectId);
    
    console.log('\n📈 Updated project analytics:', updatedProject.analytics);
    console.log('📈 Global user analytics:', updatedUser.analytics);

    // Check Analytics collection
    const analyticsEvents = await Analytics.find({ userId, projectId }).limit(5);
    console.log(`\n📝 Analytics events for this project: ${analyticsEvents.length}`);
    analyticsEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventType} - ${event.timestamp}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testProjectAnalytics();


