#!/bin/bash

# ETEA Healthcare Portal - Deployment Script for Hetzner VPS
# Run this script on your Hetzner VPS after uploading the project

set -e

echo "🚀 Starting ETEA Healthcare Portal deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="etea-portal"
APP_DIR="/var/www/$APP_NAME"
DOMAIN="your-domain.com"  # Replace with your actual domain

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install NGINX
print_status "Installing NGINX..."
sudo apt install -y nginx

# Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# Copy application files (assuming they're uploaded to ~/etea-portal)
if [ -d "~/etea-portal" ]; then
    print_status "Copying application files..."
    cp -r ~/etea-portal/* $APP_DIR/
else
    print_error "Application files not found in ~/etea-portal. Please upload them first."
    exit 1
fi

# Navigate to app directory
cd $APP_DIR

# Install dependencies
print_status "Installing Node.js dependencies..."
npm ci --production=false

# Create uploads directory
print_status "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Create logs directory
print_status "Creating logs directory..."
mkdir -p logs
chmod 755 logs

# Copy environment file
if [ -f ".env.example" ]; then
    print_status "Setting up environment variables..."
    cp .env.example .env
    print_warning "Please edit $APP_DIR/.env with your actual configuration values"
else
    print_warning ".env.example not found. Please create .env manually."
fi

# Build the application
print_status "Building the application..."
npm run build

# Run database migrations
print_status "Running database migrations..."
npx drizzle-kit migrate

# Setup PM2
print_status "Setting up PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Setup NGINX
print_status "Setting up NGINX..."
sudo cp nginx.conf /etc/nginx/sites-available/$APP_NAME
sudo ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    print_status "NGINX configuration reloaded successfully"
else
    print_error "NGINX configuration test failed"
    exit 1
fi

# Setup SSL certificate (optional - requires domain)
read -p "Do you want to setup SSL certificate for $DOMAIN? (y/n): " setup_ssl
if [[ $setup_ssl =~ ^[Yy]$ ]]; then
    print_status "Setting up SSL certificate..."
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

    if [ $? -eq 0 ]; then
        print_status "SSL certificate setup successfully"
    else
        print_warning "SSL setup failed. You can run 'sudo certbot --nginx' manually later."
    fi
fi

# Setup firewall
print_status "Setting up firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create systemd service for automatic startup
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null <<EOF
[Unit]
Description=ETEA Healthcare Portal
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME

print_status "🎉 Deployment completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with your database URL and other configuration"
echo "2. Update nginx.conf with your actual domain name"
echo "3. Run database migrations if needed: cd $APP_DIR && npx drizzle-kit migrate"
echo "4. Restart services: sudo systemctl restart nginx && pm2 restart $APP_NAME"
echo ""
echo "Application should be available at:"
echo "  - Development: http://your-server-ip:3001"
echo "  - Production: https://$DOMAIN (after SSL setup)"
echo ""
echo "PM2 commands:"
echo "  - Check status: pm2 status"
echo "  - View logs: pm2 logs $APP_NAME"
echo "  - Restart app: pm2 restart $APP_NAME"