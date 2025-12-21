#!/bin/bash
# Script to prepare project for GitHub push
# Removes sensitive files and ensures only necessary files are included

set -e

echo "🔧 Preparing project for GitHub..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ .gitignore not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .gitignore found${NC}"

# Remove sensitive files
echo -e "${YELLOW}🗑️  Removing sensitive files...${NC}"

# Remove actual env.production (keep .example)
if [ -f "env.production" ] && [ ! -f "env.production.example" ]; then
    echo -e "${YELLOW}⚠️  env.production exists but .example doesn't. Creating example first...${NC}"
    cp env.production env.production.example
    # Remove secrets from example
    sed -i 's/JWT_SECRET=.*/JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production/' env.production.example
    sed -i 's/SESSION_SECRET=.*/SESSION_SECRET=your-super-secure-session-secret-key-change-this-in-production/' env.production.example
    sed -i 's/SERVER_IP=.*/SERVER_IP=your-server-ip/' env.production.example
fi

# Remove database files
echo "  Removing database files..."
find . -name "*.sqlite" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "*.sqlite3" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "*.db" -type f -not -path "./.git/*" -delete 2>/dev/null || true

# Remove log files
echo "  Removing log files..."
find . -name "*.log" -type f -not -path "./.git/*" -not -path "./node_modules/*" -delete 2>/dev/null || true

# Remove Windows metadata
echo "  Removing Windows metadata files..."
find . -name "*.Zone.Identifier" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -not -path "./.git/*" -delete 2>/dev/null || true

# Remove node_modules
echo "  Removing node_modules..."
find . -type d -name "node_modules" -not -path "./.git/*" -exec rm -rf {} + 2>/dev/null || true

# Remove backup files
echo "  Removing backup files..."
find . -name "*.backup" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "*.bak" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "*.backup2" -type f -not -path "./.git/*" -delete 2>/dev/null || true

# Remove temporary files
echo "  Removing temporary files..."
find . -name "*.tmp" -type f -not -path "./.git/*" -delete 2>/dev/null || true
find . -name "*.temp" -type f -not -path "./.git/*" -delete 2>/dev/null || true

# Remove PM2 files
echo "  Removing PM2 files..."
rm -rf .pm2 2>/dev/null || true
rm -f dump.pm2 2>/dev/null || true

# Remove exports and uploads
echo "  Removing user data files..."
rm -rf backend/exports/* 2>/dev/null || true
rm -rf exports/* 2>/dev/null || true
rm -rf uploads/* 2>/dev/null || true
find . -name "*.pfsl" -type f -not -path "./.git/*" -delete 2>/dev/null || true

# Keep export and upload directories but empty
mkdir -p backend/exports
mkdir -p exports
mkdir -p uploads
touch backend/exports/.gitkeep
touch exports/.gitkeep
touch uploads/.gitkeep

# Ensure env.production.example exists
if [ ! -f "env.production.example" ]; then
    echo -e "${YELLOW}⚠️  env.production.example not found. Creating from template...${NC}"
    if [ -f "env.production" ]; then
        cp env.production env.production.example
        # Sanitize secrets
        sed -i 's/JWT_SECRET=.*/JWT_SECRET=your-super-secure-jwt-secret-key-change-this-in-production/' env.production.example
        sed -i 's/SESSION_SECRET=.*/SESSION_SECRET=your-super-secure-session-secret-key-change-this-in-production/' env.production.example
        sed -i 's/SERVER_IP=.*/SERVER_IP=your-server-ip/' env.production.example
    fi
fi

# Verify critical files exist
echo ""
echo -e "${GREEN}📋 Verifying critical files...${NC}"

REQUIRED_FILES=(
    ".gitignore"
    "README.md"
    "env.production.example"
    "package.json"
    "backend/package.json"
    "frontend/package.json"
    "ecosystem.config.js"
)

MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${RED}  ❌ $file (MISSING)${NC}"
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Missing required files!${NC}"
    exit 1
fi

# Check for sensitive data in files
echo ""
echo -e "${YELLOW}🔍 Checking for sensitive data...${NC}"

SENSITIVE_PATTERNS=(
    "JWT_SECRET=.*[^example|change-this]"
    "SESSION_SECRET=.*[^example|change-this]"
    "password.*=.*admin"
    "192\.168\."
    "10\.0\."
)

FOUND_SENSITIVE=false

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -r -E "$pattern" --include="*.js" --include="*.json" --include="*.md" --include="*.sh" . 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "example" | grep -v "change-this" | grep -v "your-" > /dev/null; then
        echo -e "${YELLOW}  ⚠️  Potential sensitive data found matching: $pattern${NC}"
        FOUND_SENSITIVE=true
    fi
done

if [ "$FOUND_SENSITIVE" = true ]; then
    echo -e "${YELLOW}⚠️  Please review files for sensitive data before pushing!${NC}"
else
    echo -e "${GREEN}  ✅ No obvious sensitive data found${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Preparation complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Review .gitignore to ensure all sensitive files are excluded"
echo "3. Check that env.production is NOT tracked (should be in .gitignore)"
echo "4. Add files: git add ."
echo "5. Commit: git commit -m 'Initial commit'"
echo "6. Push: git push origin main"
echo ""
echo "⚠️  IMPORTANT: Verify env.production is NOT in git:"
echo "   git check-ignore env.production"
echo "   (Should output: env.production)"
echo ""


