#!/bin/bash
# Clean up Windows metadata files (_Zone.Identifier)

echo "=== Cleaning Windows Metadata Files ==="
echo ""

# Find and remove all _Zone.Identifier files
find /home/haryow/LinuxOHW -name "*_Zone.Identifier" -type f -print

echo ""
echo "Removing files..."
find /home/haryow/LinuxOHW -name "*_Zone.Identifier" -type f -delete

echo "✓ Cleanup complete"
echo ""

# Count remaining files
REMAINING=$(find /home/haryow/LinuxOHW -name "*_Zone.Identifier" -type f | wc -l)
if [ "$REMAINING" -eq 0 ]; then
    echo "✓ All Windows metadata files removed"
else
    echo "⚠️  $REMAINING files remaining (may need manual cleanup)"
fi
















