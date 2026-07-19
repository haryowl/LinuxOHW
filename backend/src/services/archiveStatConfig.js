'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'archive-stat-config.json');
const OUT_TRIGGER_MODES = new Set(['server1', 'server2', 'either']);
const DEFAULT_CONFIG = {
  outTriggerMode: 'either'
};

function normalizeConfig(config = {}) {
  return {
    outTriggerMode: OUT_TRIGGER_MODES.has(config.outTriggerMode)
      ? config.outTriggerMode
      : DEFAULT_CONFIG.outTriggerMode
  };
}

function getArchiveStatConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')));
    }
  } catch (error) {
    logger.warn('Failed to read ArchiveStat config file', { error: error.message });
  }
  return { ...DEFAULT_CONFIG };
}

function updateArchiveStatConfig(updates = {}) {
  if (!OUT_TRIGGER_MODES.has(updates.outTriggerMode)) {
    const error = new Error('outTriggerMode must be server1, server2, or either');
    error.statusCode = 400;
    throw error;
  }

  const next = normalizeConfig({
    ...getArchiveStatConfig(),
    ...updates
  });
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2));
  return next;
}

function shouldQueueOut(serv1Queue, serv2Queue, threshold = 20) {
  const { outTriggerMode } = getArchiveStatConfig();
  if (outTriggerMode === 'server1') {
    return serv1Queue < threshold;
  }
  if (outTriggerMode === 'server2') {
    return serv2Queue < threshold;
  }
  return serv1Queue < threshold || serv2Queue < threshold;
}

module.exports = {
  getArchiveStatConfig,
  updateArchiveStatConfig,
  shouldQueueOut
};
