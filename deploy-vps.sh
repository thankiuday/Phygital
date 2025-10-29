#!/bin/bash

###############################################################################
# Phygital Application Deployment Script
# For production deployment on Hostinger VPS
###############################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/phygital"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
PM2_APP_NAME="phygital-backend"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Error handler
error_exit() {
    print_error "$1"
    exit 1
}

echo ""
echo "=================================="
echo "🚀 Phygital Deployment Script"
echo "=================================="
echo ""

# Check if running in correct directory
if [ ! -d "$APP_DIR" ]; then
    error_exit "Application directory not found: $APP_DIR"
fi

cd "$APP_DIR" || error_exit "Cannot change to $APP_DIR"

# 1. Pull latest code
print_step "Step 1: Pulling latest code from repository..."
if [ -d ".git" ]; then
    git pull origin master || error_exit "Git pull failed"
    print_success "Code updated from repository"
else
    print_info "Not a git repository, skipping git pull"
fi

# 2. Update backend
print_step "Step 2: Updating backend..."
cd "$BACKEND_DIR" || error_exit "Cannot change to $BACKEND_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    error_exit "Backend .env file not found! Please create it from production-vps.env.example"
fi

# Install dependencies
print_info "Installing backend dependencies..."
npm install --production || error_exit "Backend npm install failed"
print_success "Backend dependencies installed"

# 3. Update frontend
print_step "Step 3: Building frontend..."
cd "$FRONTEND_DIR" || error_exit "Cannot change to $FRONTEND_DIR"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_info "Creating .env.production from example..."
    if [ -f "production-vps.env.example" ]; then
        cp production-vps.env.example .env.production
        print_info "Please edit .env.production with your actual values"
    fi
fi

# Install dependencies and build
print_info "Installing frontend dependencies..."
npm install || error_exit "Frontend npm install failed"
print_success "Frontend dependencies installed"

print_info "Building frontend for production..."
npm run build || error_exit "Frontend build failed"
print_success "Frontend built successfully"

# 4. Restart backend with PM2
print_step "Step 4: Restarting backend service..."
cd "$BACKEND_DIR" || error_exit "Cannot change to $BACKEND_DIR"

# Check if PM2 process exists
if pm2 show "$PM2_APP_NAME" > /dev/null 2>&1; then
    print_info "Restarting existing PM2 process..."
    pm2 restart "$PM2_APP_NAME" || error_exit "PM2 restart failed"
    print_success "Backend restarted"
else
    print_info "Starting new PM2 process..."
    pm2 start server.js --name "$PM2_APP_NAME" || error_exit "PM2 start failed"
    pm2 save || error_exit "PM2 save failed"
    print_success "Backend started"
fi

# 5. Reload Nginx
print_step "Step 5: Reloading Nginx..."
sudo systemctl reload nginx || error_exit "Nginx reload failed"
print_success "Nginx reloaded"

# 6. Verify deployment
print_step "Step 6: Verifying deployment..."

# Check PM2 status
if pm2 show "$PM2_APP_NAME" > /dev/null 2>&1; then
    print_success "Backend is running"
else
    error_exit "Backend is not running!"
fi

# Check Nginx status
if sudo systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    error_exit "Nginx is not running!"
fi

# Check if frontend dist exists
if [ -d "$FRONTEND_DIR/dist" ] && [ -f "$FRONTEND_DIR/dist/index.html" ]; then
    print_success "Frontend build exists"
else
    error_exit "Frontend build not found!"
fi

echo ""
echo "=================================="
print_success "Deployment Completed Successfully!"
echo "=================================="
echo ""
print_info "Application Status:"
pm2 list
echo ""
print_info "Backend Logs: pm2 logs $PM2_APP_NAME"
print_info "Nginx Logs: sudo tail -f /var/log/nginx/error.log"
echo ""
print_info "Your application should now be live at:"
echo "  Frontend: https://yourdomain.com"
echo "  API: https://api.yourdomain.com"
echo ""



