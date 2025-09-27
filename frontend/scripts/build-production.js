#!/usr/bin/env node

/**
 * Production Build Script for Phygital Frontend
 * Ensures all necessary files are copied to the build output
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting production build...');

// Step 1: Run Vite build
console.log('📦 Building with Vite...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Vite build completed');
} catch (error) {
  console.error('❌ Vite build failed:', error.message);
  process.exit(1);
}

// Step 2: Ensure critical files are in dist
const distDir = path.join(__dirname, '..', 'dist');
const publicDir = path.join(__dirname, '..', 'public');

const criticalFiles = [
  'sw.js',
  'manifest.json',
  'vite.svg'
];

console.log('📋 Checking critical files...');

criticalFiles.forEach(file => {
  const srcPath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(srcPath)) {
    if (!fs.existsSync(destPath)) {
      console.log(`📄 Copying ${file} to dist...`);
      fs.copyFileSync(srcPath, destPath);
    }
    console.log(`✅ ${file} is available in dist`);
  } else {
    console.warn(`⚠️ ${file} not found in public directory`);
  }
});

// Step 3: Verify build output
console.log('🔍 Verifying build output...');

const requiredFiles = [
  'index.html',
  'sw.js',
  'manifest.json'
];

const missingFiles = requiredFiles.filter(file => 
  !fs.existsSync(path.join(distDir, file))
);

if (missingFiles.length > 0) {
  console.error('❌ Missing required files in build output:', missingFiles);
  process.exit(1);
}

// Step 4: Update service worker cache version
const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  let swContent = fs.readFileSync(swPath, 'utf8');
  const version = `v${Date.now()}`;
  swContent = swContent.replace(/phygital-ar-v[\d.]+/g, `phygital-ar-${version}`);
  fs.writeFileSync(swPath, swContent);
  console.log(`✅ Updated service worker cache version to ${version}`);
}

console.log('🎉 Production build completed successfully!');
console.log('📁 Build output directory:', distDir);
console.log('🌐 Ready for deployment');
