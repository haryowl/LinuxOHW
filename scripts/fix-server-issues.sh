#!/bin/bash
# Comprehensive fix script for server issues

echo "=== Gali-Parse Server Fix Script ==="
echo ""

cd /home/haryow/LinuxOHW

# 1. Create admin user
echo "1. Creating admin user..."
cd backend
if node create-default-admin.js; then
    echo "   ✓ Admin user created"
else
    echo "   ✗ Failed to create admin user (may already exist)"
fi
cd ..
echo ""

# 2. Clean Windows metadata files
echo "2. Cleaning Windows metadata files..."
find . -name "*_Zone.Identifier" -type f -delete 2>/dev/null
ZONE_COUNT=$(find . -name "*_Zone.Identifier" -type f 2>/dev/null | wc -l)
if [ "$ZONE_COUNT" -eq 0 ]; then
    echo "   ✓ All Windows metadata files removed"
else
    echo "   ⚠️  $ZONE_COUNT files remaining"
fi
echo ""

# 3. Check SERVER_IP
echo "3. Checking SERVER_IP configuration..."
if grep -q "SERVER_IP=your-server-ip" env.production; then
    echo "   ⚠️  SERVER_IP still set to placeholder"
    echo "   Please update env.production manually:"
    echo "   SERVER_IP=<your-actual-server-ip>"
else
    echo "   ✓ SERVER_IP is configured"
fi
echo ""

# 4. Verify database tables
echo "4. Checking database..."
cd backend
node -e "
const { sequelize, AlertRule } = require('./src/models');
(async () => {
    try {
        await sequelize.authenticate();
        console.log('   ✓ Database connection OK');
        
        // Try to sync AlertRules table
        try {
            await sequelize.sync({ alter: false });
            const count = await AlertRule.count();
            console.log('   ✓ AlertRules table exists (' + count + ' rules)');
        } catch (err) {
            console.log('   ⚠️  AlertRules table issue (non-fatal):', err.message);
        }
        
        await sequelize.close();
        process.exit(0);
    } catch (err) {
        console.log('   ✗ Database error:', err.message);
        process.exit(1);
    }
})();
" 2>&1 | grep -E "   (✓|✗|⚠️)"
cd ..
echo ""

# 5. Final status
echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. If SERVER_IP needs updating, edit env.production"
echo "2. Restart PM2: pm2 restart gali-parse"
echo "3. Test login with: admin / admin123"
echo ""
















