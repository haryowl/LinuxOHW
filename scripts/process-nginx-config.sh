#!/bin/bash
# Script to process Nginx configuration template with environment variables
# Usage: ./process-nginx-config.sh <input-template> <output-file>

set -e

INPUT_FILE="${1:-nginx.conf.template}"
OUTPUT_FILE="${2:-nginx.conf}"

if [ ! -f "$INPUT_FILE" ]; then
    echo "Error: Template file $INPUT_FILE not found"
    exit 1
fi

# Load environment variables from env.production if it exists
if [ -f "env.production" ]; then
    set -a
    source env.production
    set +a
fi

# Process template using envsubst
envsubst < "$INPUT_FILE" > "$OUTPUT_FILE"

echo "Nginx configuration processed: $OUTPUT_FILE"
echo "Please validate with: nginx -t -c $OUTPUT_FILE"

