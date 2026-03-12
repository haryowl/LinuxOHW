// backend/src/services/commandPresets.js

const path = require('path');
const fs = require('fs');

const presetsPath = path.join(__dirname, '..', 'config', 'commandPresets.json');

function loadPresets() {
    try {
        if (!fs.existsSync(presetsPath)) {
            return {};
        }
        const raw = fs.readFileSync(presetsPath, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function getPresetsForType(deviceType) {
    const presets = loadPresets();
    if (!deviceType) {
        return presets.default || [];
    }
    return presets[deviceType] || presets.default || [];
}

module.exports = { getPresetsForType };
