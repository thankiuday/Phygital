#!/bin/bash

###############################################################################
# Setup Cron Jobs for Phygital VPS
# Automates backups, health checks, and SSL renewal
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================="
echo "⏰ Setting up Cron Jobs"
echo "=================================="
echo ""

# Make scripts executable
print_step "Making scripts executable..."
chmod +x "$SCRIPT_DIR/backup-vps.sh"
chmod +x "$SCRIPT_DIR/health-check-vps.sh"
chmod +x "$SCRIPT_DIR/deploy-vps.sh"
print_success "Scripts are now executable"

# Create log directory
print_step "Creating log directory..."
sudo mkdir -p /var/log/phygital
sudo chown $USER:$USER /var/log/phygital
print_success "Log directory created"

# Backup existing crontab
print_step "Backing up existing crontab..."
crontab -l > /tmp/crontab-backup-$(date +%Y%m%d_%H%M%S).txt 2>/dev/null || true
print_success "Crontab backed up"

# Create temporary crontab file
TEMP_CRON=$(mktemp)

# Preserve existing crontab entries (if any)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Add header comment
cat >> "$TEMP_CRON" <<EOF

# ================================
# Phygital VPS Automated Tasks
# Added: $(date)
# ================================

EOF

# Add backup job (daily at 2 AM)
cat >> "$TEMP_CRON" <<EOF
# Daily backup at 2:00 AM
0 2 * * * $SCRIPT_DIR/backup-vps.sh >> /var/log/phygital/backup.log 2>&1

EOF

# Add health check job (every 5 minutes)
cat >> "$TEMP_CRON" <<EOF
# Health check every 5 minutes
*/5 * * * * $SCRIPT_DIR/health-check-vps.sh >> /var/log/phygital/health-check.log 2>&1

EOF

# Add SSL renewal check (daily at 3 AM)
cat >> "$TEMP_CRON" <<EOF
# SSL certificate renewal check daily at 3:00 AM
0 3 * * * /usr/bin/certbot renew --quiet >> /var/log/phygital/ssl-renewal.log 2>&1

EOF

# Add PM2 save (daily at 4 AM)
cat >> "$TEMP_CRON" <<EOF
# Save PM2 process list daily at 4:00 AM
0 4 * * * /usr/bin/pm2 save >> /var/log/phygital/pm2-save.log 2>&1

EOF

# Add log rotation (weekly on Sunday at 5 AM)
cat >> "$TEMP_CRON" <<EOF
# Rotate logs weekly on Sunday at 5:00 AM
0 5 * * 0 find /var/log/phygital -name "*.log" -mtime +30 -delete 2>&1

EOF

# Add system cleanup (monthly)
cat >> "$TEMP_CRON" <<EOF
# System cleanup on 1st of month at 6:00 AM
0 6 1 * * apt-get autoremove -y && apt-get autoclean -y >> /var/log/phygital/cleanup.log 2>&1

EOF

# Install the new crontab
print_step "Installing cron jobs..."
crontab "$TEMP_CRON"
rm "$TEMP_CRON"
print_success "Cron jobs installed"

# Display installed cron jobs
echo ""
print_info "Installed cron jobs:"
echo ""
crontab -l | grep -A 20 "Phygital VPS Automated Tasks"

echo ""
echo "=================================="
print_success "Cron Jobs Setup Complete!"
echo "=================================="
echo ""
print_info "Scheduled tasks:"
echo "  ✓ Daily backup at 2:00 AM"
echo "  ✓ Health check every 5 minutes"
echo "  ✓ SSL renewal check daily at 3:00 AM"
echo "  ✓ PM2 save daily at 4:00 AM"
echo "  ✓ Log rotation weekly on Sunday at 5:00 AM"
echo "  ✓ System cleanup monthly on 1st at 6:00 AM"
echo ""
print_info "Log files location: /var/log/phygital/"
echo ""
print_info "To view cron logs:"
echo "  tail -f /var/log/phygital/backup.log"
echo "  tail -f /var/log/phygital/health-check.log"
echo ""
print_info "To edit cron jobs manually: crontab -e"
print_info "To view current cron jobs: crontab -l"
echo ""



