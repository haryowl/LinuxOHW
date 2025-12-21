#!/bin/bash
# Script to prepare project for Linux deployment
# Removes Windows-specific files and fixes platform-specific issues

set -e

echo "🔧 Preparing project for Linux deployment..."

# Remove Windows-specific files
echo "📁 Removing Windows-specific files..."
find . -name "*.Zone.Identifier" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null || true

# Remove node_modules (will be reinstalled on Linux)
echo "🗑️  Removing node_modules (will be reinstalled on Linux)..."
if [ -d "backend/node_modules" ]; then
    echo "  Removing backend/node_modules..."
    rm -rf backend/node_modules
fi
if [ -d "frontend/node_modules" ]; then
    echo "  Removing frontend/node_modules..."
    rm -rf frontend/node_modules
fi
if [ -d "mobile-frontend/node_modules" ]; then
    echo "  Removing mobile-frontend/node_modules..."
    rm -rf mobile-frontend/node_modules
fi
if [ -d "node_modules" ]; then
    echo "  Removing root node_modules..."
    rm -rf node_modules
fi

# Make shell scripts executable
echo "🔐 Setting script permissions..."
chmod +x monitor.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# Create .deploymentignore file
echo "📝 Creating .deploymentignore..."
cat > .deploymentignore << EOF
# Files to exclude when deploying
node_modules/
**/node_modules/
*.log
logs/
backups/
*.Zone.Identifier
.DS_Store
Thumbs.db
*.tmp
.env.local
.env.development
EOF

echo "✅ Preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and edit env.production with your server settings"
echo "2. Transfer files to Linux server (excluding node_modules)"
echo "3. On Linux server:"
echo "   - Install Node.js and PM2"
echo "   - Run: cd backend && npm install --production"
echo "   - Run: cd frontend && npm install && npm run build"
echo "   - Run: pm2 start ecosystem.config.js"






