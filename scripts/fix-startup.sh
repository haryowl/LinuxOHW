#!/bin/bash
# Script to fix common startup issues

echo "=== Fixing Common Startup Issues ==="
echo ""

# Create required directories
echo "1. Creating required directories..."
mkdir -p backend/data backend/logs backend/exports backups
chmod 755 backend/data backend/logs backend/exports backups
echo "   ✓ Directories created"
echo ""

# Check and create env.production if missing
if [ ! -f "env.production" ]; then
    echo "2. Creating env.production from example..."
    if [ -f "env.production.example" ]; then
        cp env.production.example env.production
        echo "   ✓ env.production created"
        echo "   ⚠️  IMPORTANT: Edit env.production and set:"
        echo "      - JWT_SECRET (generate: openssl rand -hex 32)"
        echo "      - SESSION_SECRET (generate: openssl rand -hex 32)"
        echo "      - SERVER_IP (your server IP)"
    else
        echo "   ✗ env.production.example not found"
    fi
else
    echo "2. env.production already exists"
fi
echo ""

# Generate secrets if missing
echo "3. Checking secrets..."
if [ -f "env.production" ]; then
    if ! grep -q "JWT_SECRET=" env.production || grep -q "JWT_SECRET=.*your-.*change-this" env.production; then
        SECRET=$(openssl rand -hex 32)
        if grep -q "JWT_SECRET=" env.production; then
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$SECRET/" env.production
        else
            echo "JWT_SECRET=$SECRET" >> env.production
        fi
        echo "   ✓ Generated JWT_SECRET"
    fi
    
    if ! grep -q "SESSION_SECRET=" env.production || grep -q "SESSION_SECRET=.*your-.*change-this" env.production; then
        SECRET=$(openssl rand -hex 32)
        if grep -q "SESSION_SECRET=" env.production; then
            sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" env.production
        else
            echo "SESSION_SECRET=$SECRET" >> env.production
        fi
        echo "   ✓ Generated SESSION_SECRET"
    fi
fi
echo ""

# Check if ports are in use
echo "4. Checking ports..."
if lsof -i :3001 &> /dev/null; then
    echo "   ⚠️  Port 3001 is in use. Kill process or change HTTP_PORT in env.production"
    lsof -i :3001
fi

if lsof -i :3003 &> /dev/null; then
    echo "   ⚠️  Port 3003 is in use. Kill process or change TCP_PORT in env.production"
    lsof -i :3003
fi
echo ""

echo "=== Fix Complete ==="
echo "Run: bash scripts/check-startup.sh to verify"
echo ""

