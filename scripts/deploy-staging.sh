#!/bin/bash

set -euo pipefail

# ETEA Healthcare Portal - Staging Deployment Script

echo "🚀 Starting ETEA Healthcare Portal staging deployment..."

# Configuration
APP_NAME="etea-portal-staging"
APP_DIR="C:/staging/etea-portal"
DOMAIN="localhost"
PORT=5003

echo "Step 1: Building the application..."
npm run build
echo "Exit code for build: $?"

echo "Step 2: Creating staging directory..."
mkdir -p "$APP_DIR"

echo "Step 3: Copying application files..."
# Note: Using PowerShell copy for Windows compatibility
powershell -Command "Copy-Item -Recurse .\* '$APP_DIR/' -Force -Exclude node_modules,.git,dist"

cd "$APP_DIR"

echo "Step 4: Installing dependencies..."
npm ci
echo "Exit code for npm ci: $?"

echo "Step 5: Running migrations..."
npx drizzle-kit migrate
echo "Exit code for migrate: $?"

echo "Step 6: Starting with PM2..."
pm2 delete $APP_NAME 2>/dev/null || true
PORT=$PORT pm2 start ecosystem.config.cjs --env staging
echo "Exit code for PM2 start: $?"

echo "Staging deployment completed successfully!"
echo "App running on http://localhost:$PORT"