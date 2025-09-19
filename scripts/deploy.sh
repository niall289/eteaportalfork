#!/bin/bash

# ETEA Portal Deployment Script
# Idempotent deployment for production

set -e

echo "🚀 Starting ETEA Portal deployment..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Pull latest changes
print_success "Pulling latest changes from git..."
git pull origin main

# Install server dependencies
print_success "Installing server dependencies..."
cd server
npm ci --omit=dev
print_success "Building server..."
npm run build
print_success "Running database migrations..."
npx drizzle-kit migrate
cd ..

# Install client dependencies and build
print_success "Installing client dependencies..."
cd client
npm ci --omit=dev
print_success "Building client..."
npm run build
cd ..

# Create web directory if not exists
sudo mkdir -p /var/www/portal

# Copy built client to web directory
print_success "Copying client build to /var/www/portal..."
sudo cp -r client/dist/* /var/www/portal/

# Reload PM2 app
print_success "Starting or reloading PM2 app..."
pm2 startOrReload ecosystem.config.cjs

# Test and reload nginx
print_success "Testing and reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

print_success "Deployment completed successfully!"
echo "Application should be running at your configured domain"