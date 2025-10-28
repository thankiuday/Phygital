#!/bin/bash

###############################################################################
# Phygital VPS Backup Script
# Creates backups of database, uploads, and configuration files
###############################################################################

set -e

# Configuration
BACKUP_DIR="/var/backups/phygital"
APP_DIR="/var/www/phygital"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

echo "=================================="
echo "🔄 Phygital Backup Script"
echo "=================================="
echo ""
print_info "Backup started at $(date)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
print_info "Backing up MongoDB database..."
MONGO_BACKUP_DIR="$BACKUP_DIR/mongodb_$DATE"
mongodump --db phygital --out "$MONGO_BACKUP_DIR" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "MongoDB backup created: $MONGO_BACKUP_DIR"
else
    print_error "MongoDB backup failed!"
fi

# Compress MongoDB backup
print_info "Compressing MongoDB backup..."
tar -czf "$BACKUP_DIR/mongodb_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"
rm -rf "$MONGO_BACKUP_DIR"
print_success "MongoDB backup compressed"

# Backup application files (excluding node_modules)
print_info "Backing up application files..."
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" \
    --exclude="$APP_DIR/*/node_modules" \
    --exclude="$APP_DIR/backend/temp" \
    --exclude="$APP_DIR/*/dist" \
    "$APP_DIR" > /dev/null 2>&1
print_success "Application files backed up"

# Backup environment files
print_info "Backing up configuration files..."
ENV_BACKUP_DIR="$BACKUP_DIR/config_$DATE"
mkdir -p "$ENV_BACKUP_DIR"
cp "$APP_DIR/backend/.env" "$ENV_BACKUP_DIR/backend.env" 2>/dev/null || true
cp "$APP_DIR/frontend/.env.production" "$ENV_BACKUP_DIR/frontend.env" 2>/dev/null || true
cp "/etc/nginx/sites-available/phygital" "$ENV_BACKUP_DIR/nginx.conf" 2>/dev/null || true
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" -C "$BACKUP_DIR" "config_$DATE"
rm -rf "$ENV_BACKUP_DIR"
print_success "Configuration files backed up"

# Backup Nginx configuration
print_info "Backing up Nginx configuration..."
cp /etc/nginx/sites-available/phygital "$BACKUP_DIR/nginx_$DATE.conf" 2>/dev/null || true
print_success "Nginx configuration backed up"

# Backup PM2 process list
print_info "Backing up PM2 configuration..."
pm2 save > /dev/null 2>&1
if [ -f "$HOME/.pm2/dump.pm2" ]; then
    cp "$HOME/.pm2/dump.pm2" "$BACKUP_DIR/pm2_$DATE.dump"
    print_success "PM2 configuration backed up"
fi

# Create a manifest file
print_info "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$DATE.txt" <<EOF
Phygital Backup Manifest
========================
Date: $(date)
Hostname: $(hostname)
User: $USER

Backup Contents:
- MongoDB database: mongodb_$DATE.tar.gz
- Application files: app_$DATE.tar.gz
- Configuration files: config_$DATE.tar.gz
- Nginx config: nginx_$DATE.conf
- PM2 config: pm2_$DATE.dump

Backup Location: $BACKUP_DIR
EOF
print_success "Manifest created"

# Calculate backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
print_info "Total backup size: $TOTAL_SIZE"

# Clean up old backups
print_info "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "mongodb_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "app_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "nginx_*.conf" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "pm2_*.dump" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "manifest_*.txt" -mtime +$RETENTION_DAYS -delete
print_success "Old backups cleaned up"

echo ""
echo "=================================="
print_success "Backup completed successfully!"
echo "=================================="
echo ""
print_info "Backup location: $BACKUP_DIR"
print_info "Latest backups:"
ls -lh "$BACKUP_DIR" | grep "$DATE"
echo ""
print_info "To restore from backup, use: ./restore-vps.sh $DATE"
echo ""

# Optional: Upload to remote storage (uncomment and configure)
# print_info "Uploading to remote storage..."
# aws s3 cp "$BACKUP_DIR/mongodb_$DATE.tar.gz" s3://your-backup-bucket/phygital/
# aws s3 cp "$BACKUP_DIR/app_$DATE.tar.gz" s3://your-backup-bucket/phygital/
# print_success "Backup uploaded to S3"


