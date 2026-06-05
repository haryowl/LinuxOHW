#!/bin/bash
# Complete deployment script for Linux server
# Run this script ON THE LINUX SERVER after transferring files

set -e

APP_DIR="/opt/linuxParser2"
APP_USER="${SUDO_USER:-$USER}"

echo "🚀 Gali-Parse Linux Deployment Script"
echo "======================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script requires sudo privileges"
    echo "Please run: sudo $0"
    exit 1
fi

# Check Node.js installation
echo "📦 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
else
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 14 ]; then
        echo "⚠️  Node.js version is too old. Please upgrade to >= 14.18.0"
        exit 1
    fi
    echo "✅ Node.js $(node --version) found"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✅ npm $(npm --version) found"

# Install PM2 if not installed
echo "📦 Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
else
    echo "✅ PM2 found"
fi

# Install build tools if not installed
echo "📦 Checking build tools..."
if ! command -v gcc &> /dev/null; then
    echo "Installing build tools..."
    apt-get update
    apt-get install -y build-essential python3
fi
echo "✅ Build tools available"

# Navigate to application directory
cd "$APP_DIR" || {
    echo "❌ Application directory not found: $APP_DIR"
    echo "Please extract/copy files to $APP_DIR first"
    exit 1
}

# Set permissions
echo "🔐 Setting permissions..."
chmod +x monitor.sh scripts/*.sh 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod -R 755 backend/data backend/exports logs backups 2>/dev/null || true

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --production

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm install --production

# Check if build folder exists
if [ ! -d "build" ] || [ -z "$(ls -A build)" ]; then
    echo "🔨 Building frontend..."
    npm run build
else
    echo "✅ Frontend build folder exists, skipping build"
fi

# Return to app directory
cd "$APP_DIR"

# Validate environment
echo "🔍 Validating environment..."
if [ ! -f "env.production" ]; then
    echo "⚠️  env.production not found. Creating from template..."
    if [ -f "env.production.example" ]; then
        cp env.production.example env.production
    fi
fi

# Check required environment variables
source env.production 2>/dev/null || true
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secure-jwt-secret-key-change-this-in-production" ]; then
    echo "⚠️  WARNING: JWT_SECRET not set or using default value!"
    echo "   Generate with: openssl rand -hex 32"
fi

if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "your-super-secure-session-secret-key-change-this-in-production" ]; then
    echo "⚠️  WARNING: SESSION_SECRET not set or using default value!"
    echo "   Generate with: openssl rand -hex 32"
fi

# Initialize database if needed
echo "🗄️  Checking database..."
if [ ! -f "backend/data/prod.sqlite" ]; then
    echo "Initializing database..."
    cd "$APP_DIR/backend"
    node init-database.js
    cd "$APP_DIR"
fi

# Start with PM2
echo "🚀 Starting application with PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js || pm2 restart gali-parse

# Save PM2 configuration
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Check status: pm2 status"
echo "2. View logs: pm2 logs gali-parse"
echo "3. Setup PM2 startup: pm2 startup"
echo "4. Configure Nginx (if using): ./scripts/process-nginx-template.sh"
echo ""
echo "🌐 Access points:"
echo "   - Web Dashboard: http://$(hostname -I | awk '{print $1}')"
echo "   - Backend API: http://$(hostname -I | awk '{print $1}'):8081/api"
echo "   - Frontend UI: http://$(hostname -I | awk '{print $1}'):8080"
echo "   - TCP Server: $(hostname -I | awk '{print $1}'):3003"






