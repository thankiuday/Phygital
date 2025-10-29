#!/bin/bash

###############################################################################
# Phygital Quick Deploy Script for Hostinger VPS
# This script will guide you through the complete deployment
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}"
    echo "=================================="
    echo "$1"
    echo "=================================="
    echo -e "${NC}"
}

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

# Welcome message
clear
print_header "Phygital VPS Deployment Wizard"
echo ""
echo "This script will help you deploy Phygital on your Hostinger VPS"
echo ""

# Get user inputs
print_step "Please provide the following information:"
echo ""

read -p "Enter your domain name (e.g., phygital.com): " DOMAIN_NAME
read -p "Enter your email for SSL certificate: " EMAIL_ADDRESS
read -p "MongoDB root password (create a strong password): " MONGO_ROOT_PASS
read -p "MongoDB app user password (create another strong password): " MONGO_APP_PASS
read -p "JWT Secret (press Enter to auto-generate): " JWT_SECRET

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -base64 32)
    print_info "Generated JWT Secret: $JWT_SECRET"
fi

# Confirm
echo ""
print_header "Configuration Summary"
echo "Domain: $DOMAIN_NAME"
echo "API Domain: api.$DOMAIN_NAME"
echo "Email: $EMAIL_ADDRESS"
echo ""
read -p "Is this correct? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    print_error "Deployment cancelled"
    exit 1
fi

# Start deployment
print_header "Starting Deployment"

# 1. System Update
print_step "Step 1: Updating system..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# 2. Install Node.js
print_step "Step 2: Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_info "Node.js already installed: $(node --version)"
fi

# 3. Install required packages
print_step "Step 3: Installing required packages..."
sudo apt install -y build-essential git nginx certbot python3-certbot-nginx
print_success "Packages installed"

# 4. Install MongoDB
print_step "Step 4: Installing MongoDB..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl enable mongod
    sudo systemctl start mongod
    print_success "MongoDB installed"
else
    print_info "MongoDB already installed"
fi

# 5. Configure MongoDB
print_step "Step 5: Configuring MongoDB..."
mongosh <<EOF
use admin
db.createUser({
  user: "admin",
  pwd: "$MONGO_ROOT_PASS",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})
use phygital
db.createUser({
  user: "phygital_user",
  pwd: "$MONGO_APP_PASS",
  roles: ["readWrite"]
})
exit
EOF
print_success "MongoDB configured"

# 6. Install PM2
print_step "Step 6: Installing PM2..."
sudo npm install -g pm2
print_success "PM2 installed"

# 7. Create app directory
print_step "Step 7: Creating application directory..."
sudo mkdir -p /var/www/phygital
sudo chown -R $USER:$USER /var/www/phygital
print_success "Application directory created"

# 8. Clone or copy code
print_step "Step 8: Deploying application code..."
print_info "Please copy your application code to /var/www/phygital"
print_info "You can use: scp -r /path/to/Phygital/* user@server:/var/www/phygital/"
read -p "Press Enter when code is uploaded..."

# 9. Create backend .env
print_step "Step 9: Creating backend environment file..."
cat > /var/www/phygital/backend/.env <<EOF
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://$DOMAIN_NAME

MONGODB_URI=mongodb://phygital_user:$MONGO_APP_PASS@localhost:27017/phygital

JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d

CORS_ORIGINS=https://$DOMAIN_NAME,https://www.$DOMAIN_NAME,https://api.$DOMAIN_NAME
EOF
print_success "Backend .env created"
chmod 600 /var/www/phygital/backend/.env

# 10. Create frontend .env.production
print_step "Step 10: Creating frontend environment file..."
cat > /var/www/phygital/frontend/.env.production <<EOF
VITE_API_URL=https://api.$DOMAIN_NAME
VITE_APP_NAME=Phygital
VITE_APP_URL=https://$DOMAIN_NAME
EOF
print_success "Frontend .env.production created"

# 11. Install dependencies
print_step "Step 11: Installing dependencies..."
cd /var/www/phygital/backend
npm install --production
cd /var/www/phygital/frontend
npm install
npm run build
print_success "Dependencies installed and frontend built"

# 12. Configure Nginx
print_step "Step 12: Configuring Nginx..."
sudo tee /etc/nginx/sites-available/phygital > /dev/null <<EOF
server {
    listen 80;
    server_name api.$DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
        proxy_read_timeout 600;
        send_timeout 600;
    }

    client_max_body_size 100M;
}

server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;

    root /var/www/phygital/frontend/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

sudo ln -sf /etc/nginx/sites-available/phygital /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
print_success "Nginx configured"

# 13. Start backend with PM2
print_step "Step 13: Starting backend application..."
cd /var/www/phygital/backend
pm2 start server.js --name phygital-backend
pm2 save
pm2 startup systemd -u $USER --hp /home/$USER
print_success "Backend started"

# 14. Configure firewall
print_step "Step 14: Configuring firewall..."
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
print_success "Firewall configured"

# 15. Generate SSL certificate
print_step "Step 15: Generating SSL certificate..."
print_info "Make sure your domain DNS is pointing to this server!"
print_info "Server IP: $(curl -s ifconfig.me)"
read -p "Press Enter when DNS is configured..."

sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME -d api.$DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL_ADDRESS --redirect
print_success "SSL certificate generated"

# Completion
print_header "Deployment Complete!"
echo ""
print_success "Your Phygital application is now deployed!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: https://$DOMAIN_NAME"
echo "   API: https://api.$DOMAIN_NAME"
echo ""
echo "📊 Useful Commands:"
echo "   View logs: pm2 logs phygital-backend"
echo "   Restart app: pm2 restart phygital-backend"
echo "   Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "📝 Configuration Files:"
echo "   Backend .env: /var/www/phygital/backend/.env"
echo "   Frontend .env: /var/www/phygital/frontend/.env.production"
echo ""
print_info "Please test your application and verify everything is working!"
echo ""



