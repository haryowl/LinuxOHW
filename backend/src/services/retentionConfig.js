'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'data', 'retention-config.json');

const DEFAULT_CONFIG = {
  enabled: false,
  retentionDays: 365,
  lastPurgeAt: null,
  lastPurgeDeleted: 0
};

function readFileConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    }
  } catch (error) {
    logger.warn('Failed to read retention config file', { error: error.message });
  }
  return { ...DEFAULT_CONFIG };
}

function writeFileConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getRetentionConfig() {
  const fileConfig = readFileConfig();
  const envEnabled = process.env.RECORD_RETENTION_ENABLED === 'true';
  const envDays = Number.parseInt(process.env.RECORD_RETENTION_DAYS, 10);

  return {
    enabled: fileConfig.enabled || envEnabled,
    retentionDays: Number.isFinite(fileConfig.retentionDays) && fileConfig.retentionDays > 0
      ? fileConfig.retentionDays
      : (Number.isFinite(envDays) && envDays > 0 ? envDays : 365),
    lastPurgeAt: fileConfig.lastPurgeAt || null,
    lastPurgeDeleted: fileConfig.lastPurgeDeleted || 0,
    source: 'file'
  };
}

function updateRetentionConfig(updates) {
  const current = readFileConfig();
  const next = {
    ...current,
    ...updates
  };

  if (typeof next.enabled !== 'boolean') {
    next.enabled = Boolean(next.enabled);
  }

  const days = Number.parseInt(next.retentionDays, 10);
  next.retentionDays = Number.isFinite(days) && days > 0 ? days : 365;

  writeFileConfig(next);
  return getRetentionConfig();
}

function recordPurgeResult(result) {
  const current = readFileConfig();
  writeFileConfig({
    ...current,
    lastPurgeAt: new Date().toISOString(),
    lastPurgeDeleted: result.deleted || 0
  });
}

module.exports = {
  getRetentionConfig,
  updateRetentionConfig,
  recordPurgeResult
};
