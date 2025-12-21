#!/bin/bash
# Script to process nginx.conf template with environment variables
# Usage: ./scripts/process-nginx-template.sh

# Source environment variables
if [ -f "env.production" ]; then
    export $(cat env.production | grep -v '^#' | xargs)
fi

# Check if envsubst is available
if ! command -v envsubst &> /dev/null; then
    echo "Error: envsubst is not installed"
    echo "Install it with: sudo apt-get install gettext-base (Ubuntu/Debian)"
    echo "or: brew install gettext (macOS)"
    exit 1
fi

# Process template
if [ -f "nginx.conf.template" ]; then
    envsubst < nginx.conf.template > nginx.conf
    echo "Generated nginx.conf from template"
else
    echo "Warning: nginx.conf.template not found"
    echo "Creating template from nginx.conf..."
    
    # Create template by replacing values with variables
    sed -e 's/${HTTP_PORT:-3001}/\${HTTP_PORT:-3001}/g' \
        -e 's/${SERVER_DOMAIN:-localhost}/\${SERVER_DOMAIN:-localhost}/g' \
        -e 's/${SERVER_IP:-127.0.0.1}/\${SERVER_IP:-127.0.0.1}/g' \
        -e 's/${FRONTEND_BUILD_PATH:-/opt/gali-parse/frontend/build}/\${FRONTEND_BUILD_PATH:-/opt/gali-parse/frontend/build}/g' \
        -e 's/${MOBILE_FRONTEND_BUILD_PATH:-/opt/gali-parse/mobile-frontend/build}/\${MOBILE_FRONTEND_BUILD_PATH:-/opt/gali-parse/mobile-frontend/build}/g' \
        -e 's/${MAX_FILE_SIZE:-10M}/\${MAX_FILE_SIZE:-10M}/g' \
        nginx.conf > nginx.conf.template
    
    echo "Created nginx.conf.template"
    echo "Now you can edit the template and regenerate nginx.conf with this script"
fi

# Validate nginx config
if command -v nginx &> /dev/null; then
    nginx -t -c "$(pwd)/nginx.conf" 2>&1 | head -5
fi






