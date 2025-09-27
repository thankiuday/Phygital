#!/bin/bash

# Install MindAR CLI tools for .mind file generation
# This script should be run during deployment

echo "🔧 Installing MindAR CLI tools..."

# Try different installation methods
echo "📦 Attempting to install @hiukim/mind-ar-js..."
npm install -g @hiukim/mind-ar-js || echo "❌ Failed to install @hiukim/mind-ar-js"

echo "📦 Attempting to install mindar-cli..."
npm install -g mindar-cli || echo "❌ Failed to install mindar-cli"

echo "📦 Installing local dependencies..."
npm install mind-ar || echo "❌ Failed to install mind-ar locally"

# Test installations
echo "🧪 Testing MindAR installations..."

if command -v mindar-cli &> /dev/null; then
    echo "✅ mindar-cli is available"
    mindar-cli --version || echo "⚠️ mindar-cli version check failed"
else
    echo "❌ mindar-cli not found"
fi

if npx mindar-cli --help &> /dev/null; then
    echo "✅ npx mindar-cli is available"
else
    echo "❌ npx mindar-cli not available"
fi

if npx @hiukim/mind-ar-js-cli --help &> /dev/null; then
    echo "✅ npx @hiukim/mind-ar-js-cli is available"
else
    echo "❌ npx @hiukim/mind-ar-js-cli not available"
fi

echo "🏁 MindAR installation script completed"
echo "ℹ️  Note: If all installations failed, the system will use fallback .mind generation"
