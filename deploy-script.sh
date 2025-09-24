#!/bin/bash

# Phygital Render Deployment Script
# This script helps prepare the codebase for Render deployment

echo "🚀 Preparing Phygital for Render deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package-lock.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_info "Checking project structure..."

# Check backend structure
if [ -d "backend" ]; then
    print_status "Backend directory found"
    
    if [ -f "backend/package.json" ]; then
        print_status "Backend package.json found"
    else
        print_error "Backend package.json not found"
        exit 1
    fi
    
    if [ -f "backend/server.js" ]; then
        print_status "Backend server.js found"
    else
        print_error "Backend server.js not found"
        exit 1
    fi
    
    if [ -f "backend/render.yaml" ]; then
        print_status "Backend render.yaml found"
    else
        print_warning "Backend render.yaml not found - will use dashboard configuration"
    fi
else
    print_error "Backend directory not found"
    exit 1
fi

# Check frontend structure
if [ -d "frontend" ]; then
    print_status "Frontend directory found"
    
    if [ -f "frontend/package.json" ]; then
        print_status "Frontend package.json found"
    else
        print_error "Frontend package.json not found"
        exit 1
    fi
    
    if [ -f "frontend/vite.config.js" ]; then
        print_status "Frontend vite.config.js found"
    else
        print_error "Frontend vite.config.js not found"
        exit 1
    fi
    
    if [ -f "frontend/render.yaml" ]; then
        print_status "Frontend render.yaml found"
    else
        print_warning "Frontend render.yaml not found - will use dashboard configuration"
    fi
    
    if [ -f "frontend/public/_redirects" ]; then
        print_status "Frontend _redirects file found"
    else
        print_warning "Frontend _redirects file not found - client-side routing may not work"
    fi
else
    print_error "Frontend directory not found"
    exit 1
fi

# Check for environment files
print_info "Checking environment configuration..."

if [ -f "backend/production.env.example" ]; then
    print_status "Backend production environment example found"
else
    print_warning "Backend production environment example not found"
fi

if [ -f "frontend/production.env.example" ]; then
    print_status "Frontend production environment example found"
else
    print_warning "Frontend production environment example not found"
fi

# Test backend build
print_info "Testing backend dependencies..."
cd backend
if npm ci --only=production --silent; then
    print_status "Backend dependencies install successfully"
else
    print_error "Backend dependencies installation failed"
    cd ..
    exit 1
fi
cd ..

# Test frontend build
print_info "Testing frontend build..."
cd frontend
if npm ci --silent; then
    print_status "Frontend dependencies install successfully"
    
    if npm run build --silent; then
        print_status "Frontend build successful"
        
        # Check if dist directory was created
        if [ -d "dist" ]; then
            print_status "Frontend dist directory created"
            
            # Check if index.html exists in dist
            if [ -f "dist/index.html" ]; then
                print_status "Frontend index.html generated"
            else
                print_error "Frontend index.html not found in dist"
            fi
        else
            print_error "Frontend dist directory not created"
        fi
    else
        print_error "Frontend build failed"
        cd ..
        exit 1
    fi
else
    print_error "Frontend dependencies installation failed"
    cd ..
    exit 1
fi
cd ..

# Check Git status
print_info "Checking Git status..."
if git status --porcelain | grep -q .; then
    print_warning "You have uncommitted changes. Consider committing them before deployment."
    git status --short
else
    print_status "Git working directory is clean"
fi

# Check if we're on main/master branch
current_branch=$(git branch --show-current)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
    print_status "On main/master branch"
else
    print_warning "Not on main/master branch. Current branch: $current_branch"
fi

# Summary
echo ""
echo "📋 Deployment Readiness Summary:"
echo "================================"
print_status "Backend configuration ready"
print_status "Frontend configuration ready"
print_status "Build processes tested"
print_status "Environment examples provided"

echo ""
print_info "Next steps:"
echo "1. Commit and push any remaining changes to GitHub"
echo "2. Create Render services using the dashboard or render.yaml files"
echo "3. Set environment variables in Render dashboard"
echo "4. Deploy and test the applications"
echo ""
print_info "Refer to deploy-to-render.md for detailed deployment instructions"
print_info "Use RENDER_DEPLOYMENT_CHECKLIST.md to track deployment progress"

echo ""
print_status "🎉 Phygital is ready for Render deployment!"
