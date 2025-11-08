/**
 * Cloudinary Connection Test Script
 * Use this to test your Cloudinary credentials before starting the server
 * 
 * Usage: node test-cloudinary-connection.js
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

console.log('\n🔍 CLOUDINARY CONNECTION TEST\n');
console.log('====================================');

// Display credentials (masked for security)
console.log('📋 Loaded Credentials:');
console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || '❌ NOT SET');
console.log('  API Key:', process.env.CLOUDINARY_API_KEY || '❌ NOT SET');
console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? 
  process.env.CLOUDINARY_API_SECRET.substring(0, 5) + '***' + 
  process.env.CLOUDINARY_API_SECRET.substring(process.env.CLOUDINARY_API_SECRET.length - 3) : 
  '❌ NOT SET');
console.log('====================================\n');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test connection
console.log('🔄 Testing connection to Cloudinary...\n');

cloudinary.api.ping()
  .then(result => {
    console.log('✅ SUCCESS! Cloudinary connection works!');
    console.log('\n📊 Connection Details:');
    console.log('  Status:', result.status || 'OK');
    console.log('  Response:', JSON.stringify(result, null, 2));
    console.log('\n✅ Your credentials are correct!');
    console.log('✅ You can now start your backend server.');
    console.log('\nRun: npm start\n');
    process.exit(0);
  })
  .catch(error => {
    console.log('❌ FAILED! Cloudinary connection error\n');
    
    // Parse error
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    const httpCode = error?.error?.http_code || error?.http_code || 'N/A';
    
    console.log('📋 Error Details:');
    console.log('  Message:', errorMessage);
    console.log('  HTTP Code:', httpCode);
    console.log('  Full Error:', JSON.stringify(error, null, 2));
    
    console.log('\n🔧 Troubleshooting:');
    
    if (errorMessage.includes('api_secret mismatch')) {
      console.log('  ⚠️  API SECRET MISMATCH');
      console.log('  → Your API Secret is incorrect');
      console.log('  → Go to: https://cloudinary.com/console');
      console.log('  → Settings → Access Keys');
      console.log('  → Click "Reveal" on the API Secret for key:', process.env.CLOUDINARY_API_KEY);
      console.log('  → Copy the EXACT secret to your backend/.env file');
    } else if (errorMessage.includes('Invalid cloud_name')) {
      console.log('  ⚠️  INVALID CLOUD NAME');
      console.log('  → Your cloud name might be wrong');
      console.log('  → Check: https://cloudinary.com/console');
    } else if (httpCode === 401) {
      console.log('  ⚠️  AUTHENTICATION FAILED (401)');
      console.log('  → API Key or API Secret is wrong');
      console.log('  → Make sure you\'re using a matching key/secret pair');
      console.log('  → Pro accounts: Check if the API key has Admin permissions');
    } else {
      console.log('  ⚠️  UNKNOWN ERROR');
      console.log('  → Check your internet connection');
      console.log('  → Contact Cloudinary support: https://support.cloudinary.com');
    }
    
    console.log('\n❌ Fix the error above and run this test again.\n');
    process.exit(1);
  });


















