#!/bin/bash
# Diagnostic script to check why PM2 process is crashing

echo "=== Gali-Parse Startup Diagnostic ==="
echo ""

echo "1. Checking environment file..."
if [ -f "env.production" ]; then
    echo "   ✓ env.production exists"
    
    # Check for required variables
    if grep -q "JWT_SECRET=" env.production && ! grep -q "JWT_SECRET=.*your-.*change-this" env.production; then
        echo "   ✓ JWT_SECRET is set"
    else
        echo "   ✗ JWT_SECRET is missing or using default value"
    fi
    
    if grep -q "SESSION_SECRET=" env.production && ! grep -q "SESSION_SECRET=.*your-.*change-this" env.production; then
        echo "   ✓ SESSION_SECRET is set"
    else
        echo "   ✗ SESSION_SECRET is missing or using default value"
    fi
else
    echo "   ✗ env.production not found!"
    echo "   Create it: cp env.production.example env.production"
fi
echo ""

echo "2. Checking directories..."
DIRS=("backend/data" "backend/logs" "backend/exports" "backups")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✓ $dir exists"
        if [ -w "$dir" ]; then
            echo "     ✓ writable"
        else
            echo "     ✗ not writable (run: chmod 755 $dir)"
        fi
    else
        echo "   ✗ $dir missing (creating...)"
        mkdir -p "$dir"
        chmod 755 "$dir"
    fi
done
echo ""

echo "3. Checking Node.js and dependencies..."
if command -v node &> /dev/null; then
    echo "   ✓ Node.js: $(node --version)"
else
    echo "   ✗ Node.js not found"
fi

if [ -d "backend/node_modules" ]; then
    echo "   ✓ backend/node_modules exists"
else
    echo "   ✗ backend/node_modules missing (run: cd backend && npm install)"
fi
echo ""

echo "4. Checking ports..."
if lsof -i :8081 &> /dev/null; then
    echo "   ✗ Port 8081 is in use:"
    lsof -i :8081
else
    echo "   ✓ Port 8081 is available"
fi

if lsof -i :8080 &> /dev/null; then
    echo "   ✗ Port 8080 is in use:"
    lsof -i :8080
else
    echo "   ✓ Port 8080 is available"
fi

if lsof -i :3003 &> /dev/null; then
    echo "   ✗ Port 3003 is in use:"
    lsof -i :3003
else
    echo "   ✓ Port 3003 is available"
fi
echo ""

echo "5. Testing environment loading..."
cd backend
node -e "
require('dotenv').config({ path: '../env.production' });
const required = ['JWT_SECRET', 'SESSION_SECRET'];
const missing = required.filter(key => !process.env[key] || 
    process.env[key].includes('your-') || 
    process.env[key].includes('change-this'));
if (missing.length > 0) {
    console.log('   ✗ Missing or invalid:', missing.join(', '));
    process.exit(1);
} else {
    console.log('   ✓ All required environment variables are set');
}
" 2>&1
ENV_TEST=$?
cd ..
echo ""

echo "6. Testing database connection..."
cd backend
node -e "
const { sequelize } = require('./src/models');
sequelize.authenticate()
    .then(() => {
        console.log('   ✓ Database connection successful');
        sequelize.close();
        process.exit(0);
    })
    .catch(err => {
        console.log('   ✗ Database connection failed:', err.message);
        process.exit(1);
    });
" 2>&1
DB_TEST=$?
cd ..
echo ""

echo "=== Summary ==="
if [ $ENV_TEST -eq 0 ] && [ $DB_TEST -eq 0 ]; then
    echo "✓ Environment and database are configured correctly"
    echo ""
    echo "If PM2 still crashes, check logs with:"
    echo "  pm2 logs gali-parse --err --lines 50"
else
    echo "✗ Issues found - fix them before starting PM2"
fi

