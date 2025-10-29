#!/bin/bash

###############################################################################
# Phygital VPS Initial Setup Script
# For Ubuntu 22.04 on Hostinger VPS
###############################################################################

set -e  # Exit on any error

echo "🚀 Starting Phygital VPS Setup..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root or with sudo"
   exit 1
fi

print_info "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated"

# Install Node.js
print_info "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
print_success "Node.js $(node --version) installed"
print_success "npm $(npm --version) installed"

# Install build essentials
print_info "Installing build essentials..."
apt install -y build-essential git curl wget
print_success "Build tools installed"

# Install Nginx
print_info "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx
print_success "Nginx installed and started"

# Install Certbot for SSL
print_info "Installing Certbot..."
apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

# Install MongoDB
print_info "Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org
systemctl enable mongod
systemctl start mongod
print_success "MongoDB installed and started"

# Install PM2
print_info "Installing PM2..."
npm install -g pm2
print_success "PM2 installed"

# Setup firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
print_success "Firewall configured"

# Install Fail2Ban for security
print_info "Installing Fail2Ban..."
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
print_success "Fail2Ban installed"

# Create application directory
print_info "Creating application directory..."
mkdir -p /var/www/phygital
print_success "Application directory created at /var/www/phygital"

# Create deployment user (optional but recommended)
print_info "Creating deployment user..."
if id "phygital" &>/dev/null; then
    print_info "User 'phygital' already exists, skipping..."
else
    adduser --disabled-password --gecos "" phygital
    usermod -aG sudo phygital
    print_success "User 'phygital' created"
fi

# Set ownership
chown -R phygital:phygital /var/www/phygital

echo ""
echo "=================================="
print_success "VPS Setup Complete!"
echo "=================================="
echo ""
echo "📝 Next Steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Upload your application code to /var/www/phygital"
echo "3. Configure environment variables"
echo "4. Setup Nginx configuration"
echo "5. Generate SSL certificate with Certbot"
echo "6. Start your application with PM2"
echo ""
echo "📖 See HOSTINGER_VPS_DEPLOYMENT.md for detailed instructions"
echo ""
print_info "Server IP: $(curl -s ifconfig.me)"
print_info "Node.js: $(node --version)"
print_info "npm: $(npm --version)"
print_info "MongoDB: $(mongod --version | head -n 1)"
echo ""



