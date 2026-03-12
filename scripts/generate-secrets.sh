#!/bin/bash
# Script to generate secure secrets and update env.production

echo "=== Generating Secure Secrets ==="
echo ""

# Check if env.production exists
if [ ! -f "env.production" ]; then
    echo "Error: env.production not found!"
    echo "Create it first: cp env.production.example env.production"
    exit 1
fi

# Backup original file
cp env.production env.production.backup
echo "✓ Backed up env.production to env.production.backup"
echo ""

# Generate JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)
echo "Generated JWT_SECRET: ${JWT_SECRET:0:20}... (hidden)"

# Generate SESSION_SECRET
SESSION_SECRET=$(openssl rand -hex 32)
echo "Generated SESSION_SECRET: ${SESSION_SECRET:0:20}... (hidden)"
echo ""

# Update JWT_SECRET
if grep -q "^JWT_SECRET=" env.production; then
    # Replace existing JWT_SECRET
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" env.production
    else
        # Linux
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" env.production
    fi
    echo "✓ Updated JWT_SECRET in env.production"
else
    # Add new JWT_SECRET
    echo "JWT_SECRET=$JWT_SECRET" >> env.production
    echo "✓ Added JWT_SECRET to env.production"
fi

# Update SESSION_SECRET
if grep -q "^SESSION_SECRET=" env.production; then
    # Replace existing SESSION_SECRET
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" env.production
    else
        # Linux
        sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" env.production
    fi
    echo "✓ Updated SESSION_SECRET in env.production"
else
    # Add new SESSION_SECRET
    echo "SESSION_SECRET=$SESSION_SECRET" >> env.production
    echo "✓ Added SESSION_SECRET to env.production"
fi

echo ""
echo "=== Secrets Generated Successfully ==="
echo ""
echo "Your env.production has been updated with secure secrets."
echo "You can now restart PM2:"
echo "  pm2 restart gali-parse"
echo ""

