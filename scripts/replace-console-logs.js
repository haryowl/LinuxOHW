#!/usr/bin/env node
/**
 * Script to find and report console.* usage in backend code
 * Run with: node scripts/replace-console-logs.js
 */

const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '../backend/src');
const files = [];

function findFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && entry.name !== 'node_modules') {
            findFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
}

findFiles(backendDir);

const consoleUsage = [];

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
        if (line.match(/console\.(log|error|warn|info|debug)/)) {
            consoleUsage.push({
                file: path.relative(backendDir, file),
                line: index + 1,
                content: line.trim()
            });
        }
    });
}

console.log(`Found ${consoleUsage.length} console.* calls in backend code:\n`);

const byFile = {};
consoleUsage.forEach(usage => {
    if (!byFile[usage.file]) {
        byFile[usage.file] = [];
    }
    byFile[usage.file].push(usage);
});

Object.keys(byFile).sort().forEach(file => {
    console.log(`\n${file}:`);
    byFile[file].forEach(usage => {
        console.log(`  Line ${usage.line}: ${usage.content.substring(0, 80)}`);
    });
});

console.log(`\n\nTotal: ${consoleUsage.length} instances to replace`);






