#!/bin/bash
# Automated dependency installation script for Ubuntu (WSL)
# Run with: bash scripts/install-dependencies-ubuntu.sh

set -e

echo "🚀 Installing Gali-Parse Dependencies on Ubuntu"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script requires sudo privileges${NC}"
    echo "Please run: sudo bash scripts/install-dependencies-ubuntu.sh"
    exit 1
fi

# Step 1: Update system
echo -e "${GREEN}📦 Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y
echo -e "${GREEN}✅ System updated${NC}"
echo ""

# Step 2: Install Node.js and npm
echo -e "${GREEN}📦 Step 2: Installing Node.js and npm...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 14 ]; then
        echo -e "${GREEN}✅ Node.js $(node --version) already installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js version is too old. Installing Node.js 18.x...${NC}"
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    fi
else
    echo "Installing Node.js 18.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Verify Node.js installation
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
else
    echo -e "${RED}❌ Node.js installation failed${NC}"
    exit 1
fi

# Verify npm installation
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm $(npm --version) installed${NC}"
else
    echo -e "${RED}❌ npm installation failed${NC}"
    exit 1
fi
echo ""

# Step 3: Install build tools
echo -e "${GREEN}📦 Step 3: Installing build tools...${NC}"
apt-get install -y build-essential python3

# Verify build tools
if command -v gcc &> /dev/null; then
    echo -e "${GREEN}✅ GCC installed: $(gcc --version | head -1)${NC}"
else
    echo -e "${RED}❌ GCC installation failed${NC}"
    exit 1
fi

if command -v python3 &> /dev/null; then
    echo -e "${GREEN}✅ Python3 installed: $(python3 --version)${NC}"
else
    echo -e "${RED}❌ Python3 installation failed${NC}"
    exit 1
fi
echo ""

# Step 4: Install PM2
echo -e "${GREEN}📦 Step 4: Installing PM2...${NC}"
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✅ PM2 $(pm2 --version) already installed${NC}"
else
    npm install -g pm2
    if command -v pm2 &> /dev/null; then
        echo -e "${GREEN}✅ PM2 $(pm2 --version) installed${NC}"
    else
        echo -e "${RED}❌ PM2 installation failed${NC}"
        exit 1
    fi
fi
echo ""

# Step 5: Install Nginx (optional)
echo -e "${GREEN}📦 Step 5: Installing Nginx (optional)...${NC}"
read -p "Install Nginx? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nginx &> /dev/null; then
        echo -e "${GREEN}✅ Nginx already installed: $(nginx -v 2>&1)${NC}"
    else
        apt-get install -y nginx
        
        # Try to start Nginx (may fail on WSL)
        if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &> /dev/null; then
            echo -e "${GREEN}✅ Nginx installed and running${NC}"
        else
            # Try manual start for WSL
            service nginx start 2>/dev/null || /usr/sbin/nginx 2>/dev/null || true
            echo -e "${GREEN}✅ Nginx installed${NC}"
            echo -e "${YELLOW}⚠️  Note: On WSL, you may need to start Nginx manually: sudo service nginx start${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⏭️  Skipping Nginx installation${NC}"
fi
echo ""

# Step 6: Install additional useful tools
echo -e "${GREEN}📦 Step 6: Installing additional tools...${NC}"
apt-get install -y git nano curl wget
echo -e "${GREEN}✅ Additional tools installed${NC}"
echo ""

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Installed versions:"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  PM2: $(pm2 --version)"
echo "  GCC: $(gcc --version | head -1 | cut -d' ' -f4)"
echo "  Python3: $(python3 --version)"
if command -v nginx &> /dev/null; then
    echo "  Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
fi
echo ""
echo "Next steps:"
echo "1. Navigate to your project: cd /opt/gali-parse"
echo "2. Install project dependencies:"
echo "   cd backend && npm install --production"
echo "   cd ../frontend && npm install --production && npm run build"
echo "3. Configure environment: nano env.production"
echo "4. Start application: pm2 start ecosystem.config.js"
echo ""




