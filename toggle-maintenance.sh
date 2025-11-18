#!/bin/bash

# Phygital Zone - Maintenance Mode Toggle Script
# Usage: ./toggle-maintenance.sh [on|off|status]

CONFIG_FILE="frontend/src/config/maintenance.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to display header
show_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   Phygital Zone Maintenance Toggle    ║"
    echo "╔════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check current status
check_status() {
    if grep -q "ENABLED: true" "$CONFIG_FILE"; then
        echo -e "${YELLOW}⚠️  Maintenance Mode: ENABLED${NC}"
        return 0
    else
        echo -e "${GREEN}✅ Maintenance Mode: DISABLED${NC}"
        return 1
    fi
}

# Function to enable maintenance mode
enable_maintenance() {
    echo -e "${YELLOW}Enabling maintenance mode...${NC}"
    
    # Backup the config file
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
    
    # Replace ENABLED: false with ENABLED: true
    sed -i 's/ENABLED: false/ENABLED: true/' "$CONFIG_FILE"
    
    if check_status; then
        echo -e "${GREEN}✅ Maintenance mode ENABLED successfully!${NC}"
        echo -e "${BLUE}ℹ️  Don't forget to rebuild and restart your application:${NC}"
        echo "   cd frontend && npm run build"
        echo "   pm2 restart phygital-app"
    else
        echo -e "${RED}❌ Failed to enable maintenance mode${NC}"
        # Restore backup
        mv "$CONFIG_FILE.backup" "$CONFIG_FILE"
        exit 1
    fi
}

# Function to disable maintenance mode
disable_maintenance() {
    echo -e "${YELLOW}Disabling maintenance mode...${NC}"
    
    # Backup the config file
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
    
    # Replace ENABLED: true with ENABLED: false
    sed -i 's/ENABLED: true/ENABLED: false/' "$CONFIG_FILE"
    
    if ! check_status; then
        echo -e "${GREEN}✅ Maintenance mode DISABLED successfully!${NC}"
        echo -e "${BLUE}ℹ️  Don't forget to rebuild and restart your application:${NC}"
        echo "   cd frontend && npm run build"
        echo "   pm2 restart phygital-app"
    else
        echo -e "${RED}❌ Failed to disable maintenance mode${NC}"
        # Restore backup
        mv "$CONFIG_FILE.backup" "$CONFIG_FILE"
        exit 1
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [on|off|status]"
    echo ""
    echo "Commands:"
    echo "  on      - Enable maintenance mode"
    echo "  off     - Disable maintenance mode"
    echo "  status  - Check current maintenance mode status"
    echo ""
    echo "Examples:"
    echo "  $0 on      # Enable maintenance mode"
    echo "  $0 off     # Disable maintenance mode"
    echo "  $0 status  # Check status"
}

# Main script
show_header

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Error: Config file not found at $CONFIG_FILE${NC}"
    exit 1
fi

# Parse command
case "$1" in
    on|enable)
        enable_maintenance
        ;;
    off|disable)
        disable_maintenance
        ;;
    status)
        check_status
        ;;
    *)
        show_usage
        echo ""
        echo "Current status:"
        check_status
        ;;
esac

# Clean up backup if successful
if [ -f "$CONFIG_FILE.backup" ]; then
    rm "$CONFIG_FILE.backup"
fi
























