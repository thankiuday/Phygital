#!/bin/bash

###############################################################################
# Phygital VPS Restore Script
# Restores backups created by backup-vps.sh
###############################################################################

set -e

# Configuration
BACKUP_DIR="/var/backups/phygital"
APP_DIR="/var/www/phygital"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Check if backup date provided
if [ -z "$1" ]; then
    echo "=================================="
    echo "🔄 Phygital Restore Script"
    echo "=================================="
    echo ""
    print_info "Available backups:"
    echo ""
    ls -lh "$BACKUP_DIR" | grep "mongodb_" | awk '{print $9}' | sed 's/mongodb_//' | sed 's/.tar.gz//'
    echo ""
    print_error "Usage: $0 <backup_date>"
    print_info "Example: $0 20251028_120000"
    exit 1
fi

BACKUP_DATE="$1"

echo "=================================="
echo "🔄 Phygital Restore Script"
echo "=================================="
echo ""
print_info "Restore started at $(date)"
print_info "Restoring from backup: $BACKUP_DATE"
echo ""

# Verify backup files exist
if [ ! -f "$BACKUP_DIR/mongodb_$BACKUP_DATE.tar.gz" ]; then
    print_error "MongoDB backup not found: $BACKUP_DIR/mongodb_$BACKUP_DATE.tar.gz"
    exit 1
fi

# Confirmation
print_info "This will restore the following:"
echo "  - MongoDB database"
echo "  - Application files (optional)"
echo "  - Configuration files (optional)"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_error "Restore cancelled"
    exit 1
fi

# Stop application
print_step "Stopping application..."
pm2 stop phygital-backend || true
print_success "Application stopped"

# Restore MongoDB
print_step "Restoring MongoDB database..."
TEMP_DIR="/tmp/phygital_restore_$$"
mkdir -p "$TEMP_DIR"

# Extract backup
tar -xzf "$BACKUP_DIR/mongodb_$BACKUP_DATE.tar.gz" -C "$TEMP_DIR"

# Drop existing database (with confirmation)
print_info "Dropping existing database..."
mongosh phygital --eval "db.dropDatabase()" > /dev/null 2>&1

# Restore database
mongorestore --db phygital "$TEMP_DIR/mongodb_$BACKUP_DATE/phygital" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "MongoDB database restored"
else
    print_error "MongoDB restore failed!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Ask about application files
echo ""
read -p "Do you want to restore application files? (yes/no): " RESTORE_APP
if [ "$RESTORE_APP" = "yes" ]; then
    if [ -f "$BACKUP_DIR/app_$BACKUP_DATE.tar.gz" ]; then
        print_step "Restoring application files..."
        
        # Create backup of current files
        print_info "Creating backup of current files..."
        tar -czf "/tmp/phygital_current_$(date +%Y%m%d_%H%M%S).tar.gz" "$APP_DIR" > /dev/null 2>&1
        
        # Extract backup
        tar -xzf "$BACKUP_DIR/app_$BACKUP_DATE.tar.gz" -C /
        print_success "Application files restored"
        
        # Reinstall dependencies
        print_info "Reinstalling dependencies..."
        cd "$APP_DIR/backend" && npm install --production > /dev/null 2>&1
        cd "$APP_DIR/frontend" && npm install > /dev/null 2>&1 && npm run build > /dev/null 2>&1
        print_success "Dependencies reinstalled"
    else
        print_error "Application backup not found"
    fi
fi

# Ask about configuration files
echo ""
read -p "Do you want to restore configuration files? (yes/no): " RESTORE_CONFIG
if [ "$RESTORE_CONFIG" = "yes" ]; then
    if [ -f "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" ]; then
        print_step "Restoring configuration files..."
        
        TEMP_CONFIG="/tmp/phygital_config_$$"
        mkdir -p "$TEMP_CONFIG"
        tar -xzf "$BACKUP_DIR/config_$BACKUP_DATE.tar.gz" -C "$TEMP_CONFIG"
        
        # Restore .env files
        if [ -f "$TEMP_CONFIG/config_$BACKUP_DATE/backend.env" ]; then
            cp "$TEMP_CONFIG/config_$BACKUP_DATE/backend.env" "$APP_DIR/backend/.env"
            print_success "Backend .env restored"
        fi
        
        if [ -f "$TEMP_CONFIG/config_$BACKUP_DATE/frontend.env" ]; then
            cp "$TEMP_CONFIG/config_$BACKUP_DATE/frontend.env" "$APP_DIR/frontend/.env.production"
            print_success "Frontend .env restored"
        fi
        
        if [ -f "$TEMP_CONFIG/config_$BACKUP_DATE/nginx.conf" ]; then
            sudo cp "$TEMP_CONFIG/config_$BACKUP_DATE/nginx.conf" /etc/nginx/sites-available/phygital
            print_success "Nginx configuration restored"
        fi
        
        rm -rf "$TEMP_CONFIG"
    else
        print_error "Configuration backup not found"
    fi
fi

# Restore PM2 configuration
if [ -f "$BACKUP_DIR/pm2_$BACKUP_DATE.dump" ]; then
    print_step "Restoring PM2 configuration..."
    cp "$BACKUP_DIR/pm2_$BACKUP_DATE.dump" "$HOME/.pm2/dump.pm2"
    print_success "PM2 configuration restored"
fi

# Restart services
print_step "Restarting services..."

# Restart Nginx
sudo nginx -t && sudo systemctl reload nginx
print_success "Nginx reloaded"

# Restart backend
cd "$APP_DIR/backend"
pm2 start server.js --name phygital-backend || pm2 restart phygital-backend
pm2 save
print_success "Backend started"

# Wait for services to start
sleep 3

# Verify services
print_step "Verifying services..."

# Check PM2
if pm2 show phygital-backend > /dev/null 2>&1; then
    print_success "Backend is running"
else
    print_error "Backend is not running!"
fi

# Check Nginx
if sudo systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx is not running!"
fi

# Check MongoDB
if sudo systemctl is-active --quiet mongod; then
    print_success "MongoDB is running"
else
    print_error "MongoDB is not running!"
fi

echo ""
echo "=================================="
print_success "Restore completed!"
echo "=================================="
echo ""
print_info "Please verify your application is working correctly:"
echo "  - Check frontend: https://yourdomain.com"
echo "  - Check API: https://api.yourdomain.com/health"
echo "  - Check logs: pm2 logs phygital-backend"
echo ""



