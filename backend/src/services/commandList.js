// backend/src/services/commandList.js

const fs = require('fs');
const path = require('path');

function parseLine(line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    const dashIndex = trimmed.indexOf(' - ');
    if (dashIndex !== -1) {
        return {
            name: trimmed.slice(0, dashIndex).trim(),
            description: trimmed.slice(dashIndex + 3).trim()
        };
    }

    return {
        name: trimmed,
        description: ''
    };
}

function getCommandList() {
    const listPath = path.join(__dirname, '..', '..', '..', 'command-list.txt');
    if (!fs.existsSync(listPath)) {
        return [];
    }

    const content = fs.readFileSync(listPath, 'utf8');
    return content
        .split(/\r?\n/)
        .map(parseLine)
        .filter(Boolean);
}

module.exports = { getCommandList };
