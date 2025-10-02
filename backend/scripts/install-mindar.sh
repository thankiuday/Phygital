#!/bin/bash

# Install MindAR CLI tools for .mind file generation
# This script should be run during deployment

set -e  # Exit on any error

echo "🔧 Installing MindAR CLI tools..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Create targets directory if it doesn't exist
mkdir -p backend/public/targets
echo "📁 Created targets directory: backend/public/targets"

# Try different installation methods with better error handling
echo "📦 Attempting to install @hiukim/mind-ar-js..."

if npm install -g @hiukim/mind-ar-js; then
    echo "✅ @hiukim/mind-ar-js installed successfully"
elif npm install -g @hiukim/mind-ar-js --location=global; then
    echo "✅ @hiukim/mind-ar-js installed with --location=global"
else
    echo "⚠️ Failed to install @hiukim/mind-ar-js globally"
    echo "📦 Installing locally as fallback..."
    npm install @hiukim/mind-ar-js || echo "❌ Local installation also failed"
fi

echo "📦 Attempting to install mindar-cli..."
if npm install -g mindar-cli; then
    echo "✅ mindar-cli installed successfully"
else
    echo "⚠️ Failed to install mindar-cli globally"
    echo "📦 Installing locally as fallback..."
    npm install mindar-cli || echo "❌ Local installation also failed"
fi

echo "📦 Installing local dependencies..."
npm install mind-ar || echo "❌ Failed to install mind-ar locally"

# Test installations
echo "🧪 Testing MindAR installations..."

MINDAR_AVAILABLE=false

if command -v mindar-cli &> /dev/null; then
    echo "✅ mindar-cli is available"
    mindar-cli --version || echo "⚠️ mindar-cli version check failed"
    MINDAR_AVAILABLE=true
else
    echo "❌ mindar-cli not found in PATH"
fi

if npx mindar-cli --help &> /dev/null; then
    echo "✅ npx mindar-cli is available"
    MINDAR_AVAILABLE=true
else
    echo "❌ npx mindar-cli not available"
fi

if npx @hiukim/mind-ar-js-cli --help &> /dev/null; then
    echo "✅ npx @hiukim/mind-ar-js-cli is available"
    MINDAR_AVAILABLE=true
else
    echo "❌ npx @hiukim/mind-ar-js-cli not available"
fi

if [ "$MINDAR_AVAILABLE" = true ]; then
    echo "🎉 MindAR CLI tools are ready!"
    echo "📁 Make sure to place your .mind files in: backend/public/targets/"
    echo ""
    echo "Usage examples:"
    echo "  npx @hiukim/mind-ar-js-cli --help"
    echo "  npx @hiukim/mind-ar-js-cli image-target <image-path>"
    exit 0
else
    echo "❌ All MindAR CLI installations failed"
    echo "⚠️  The system will use fallback .mind generation"
    echo "⚠️  Make sure to manually generate .mind files and place them in backend/public/targets/"
    exit 1
fi
