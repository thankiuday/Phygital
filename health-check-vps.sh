#!/bin/bash

###############################################################################
# Phygital VPS Health Check Script
# Monitors all services and sends alerts if issues detected
###############################################################################

# Configuration
APP_DIR="/var/www/phygital"
LOG_FILE="/var/log/phygital/health-check.log"
ALERT_EMAIL=""  # Set email for alerts (optional)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Status tracking
ISSUES=0
STATUS_MSG=""

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check service status
check_service() {
    local service_name=$1
    local check_command=$2
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name is running"
        log "✓ $service_name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is NOT running"
        log "✗ $service_name is NOT running"
        STATUS_MSG="${STATUS_MSG}\n- $service_name is down"
        ((ISSUES++))
        return 1
    fi
}

# Function to check disk space
check_disk_space() {
    local threshold=90
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$threshold" ]; then
        echo -e "${RED}✗${NC} Disk space critical: ${usage}% used"
        log "✗ Disk space critical: ${usage}% used"
        STATUS_MSG="${STATUS_MSG}\n- Disk space at ${usage}%"
        ((ISSUES++))
        return 1
    else
        echo -e "${GREEN}✓${NC} Disk space OK: ${usage}% used"
        log "✓ Disk space OK: ${usage}% used"
        return 0
    fi
}

# Function to check memory
check_memory() {
    local threshold=90
    local usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100.0}')
    
    if [ "$usage" -gt "$threshold" ]; then
        echo -e "${YELLOW}⚠${NC} Memory usage high: ${usage}%"
        log "⚠ Memory usage high: ${usage}%"
        STATUS_MSG="${STATUS_MSG}\n- Memory usage at ${usage}%"
        return 1
    else
        echo -e "${GREEN}✓${NC} Memory OK: ${usage}% used"
        log "✓ Memory OK: ${usage}% used"
        return 0
    fi
}

# Function to check URL accessibility
check_url() {
    local url=$1
    local name=$2
    
    if curl -sSf "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is accessible"
        log "✓ $name is accessible ($url)"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT accessible"
        log "✗ $name is NOT accessible ($url)"
        STATUS_MSG="${STATUS_MSG}\n- $name is not responding"
        ((ISSUES++))
        return 1
    fi
}

# Function to check SSL certificate expiry
check_ssl_expiry() {
    local domain=$1
    
    if command -v openssl > /dev/null 2>&1; then
        local expiry_date=$(echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        
        if [ -n "$expiry_date" ]; then
            local expiry_epoch=$(date -d "$expiry_date" +%s)
            local current_epoch=$(date +%s)
            local days_until_expiry=$(( ($expiry_epoch - $current_epoch) / 86400 ))
            
            if [ "$days_until_expiry" -lt 30 ]; then
                echo -e "${YELLOW}⚠${NC} SSL certificate expires in $days_until_expiry days"
                log "⚠ SSL certificate expires in $days_until_expiry days"
                STATUS_MSG="${STATUS_MSG}\n- SSL expires in $days_until_expiry days"
            else
                echo -e "${GREEN}✓${NC} SSL certificate valid for $days_until_expiry days"
                log "✓ SSL certificate valid for $days_until_expiry days"
            fi
        fi
    fi
}

# Header
echo ""
echo "=================================="
echo "🏥 Phygital Health Check"
echo "=================================="
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================="
echo ""

log "========== Health Check Started =========="

# 1. Check Nginx
echo "Checking Nginx..."
check_service "Nginx" "sudo systemctl is-active --quiet nginx"

# 2. Check MongoDB
echo "Checking MongoDB..."
check_service "MongoDB" "sudo systemctl is-active --quiet mongod"

# 3. Check PM2 Backend
echo "Checking Backend (PM2)..."
check_service "Backend" "pm2 show phygital-backend"

# 4. Check System Resources
echo ""
echo "Checking System Resources..."
check_disk_space
check_memory

# 5. Check CPU Load
echo "Checking CPU Load..."
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
echo -e "${GREEN}✓${NC} CPU Load: $CPU_LOAD"
log "✓ CPU Load: $CPU_LOAD"

# 6. Check URLs (if domain is configured)
# Uncomment and set your domain
# echo ""
# echo "Checking URL Accessibility..."
# check_url "https://yourdomain.com" "Frontend"
# check_url "https://api.yourdomain.com/health" "Backend API"

# 7. Check SSL Certificate (if domain is configured)
# Uncomment and set your domain
# echo ""
# echo "Checking SSL Certificate..."
# check_ssl_expiry "yourdomain.com"

# 8. Check MongoDB Connection
echo ""
echo "Checking MongoDB Connection..."
if mongosh --quiet --eval "db.adminCommand('ping')" phygital > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} MongoDB connection OK"
    log "✓ MongoDB connection OK"
else
    echo -e "${RED}✗${NC} MongoDB connection FAILED"
    log "✗ MongoDB connection FAILED"
    STATUS_MSG="${STATUS_MSG}\n- MongoDB connection failed"
    ((ISSUES++))
fi

# 9. Check PM2 Process Status
echo ""
echo "PM2 Process List:"
pm2 list | tee -a "$LOG_FILE"

# 10. Recent Errors Check
echo ""
echo "Checking for Recent Errors..."
ERROR_COUNT=$(sudo tail -n 100 /var/log/nginx/error.log 2>/dev/null | grep -c "error" || echo 0)
if [ "$ERROR_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}⚠${NC} Found $ERROR_COUNT errors in Nginx logs"
    log "⚠ Found $ERROR_COUNT errors in Nginx logs"
else
    echo -e "${GREEN}✓${NC} Error count acceptable ($ERROR_COUNT in last 100 lines)"
    log "✓ Error count acceptable"
fi

# Summary
echo ""
echo "=================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All Systems Healthy${NC}"
    log "========== Health Check: PASSED =========="
else
    echo -e "${RED}✗ Issues Detected: $ISSUES${NC}"
    log "========== Health Check: FAILED ($ISSUES issues) =========="
    
    # Send alert email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo -e "Subject: Phygital Health Check Alert\n\nIssues detected:\n$STATUS_MSG" | sendmail "$ALERT_EMAIL"
    fi
fi
echo "=================================="
echo ""

# Disk Usage Summary
echo "Disk Usage:"
df -h / | tail -n 1

echo ""
echo "Memory Usage:"
free -h | grep Mem

echo ""
log "========== Health Check Completed =========="

exit $ISSUES


