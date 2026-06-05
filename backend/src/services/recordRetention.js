'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const { Record, sequelize } = require('../models');
const logger = require('../utils/logger');
const { resolveDialect } = require('../config/database');
const { getRetentionConfig, recordPurgeResult } = require('./retentionConfig');

const BATCH_SIZE = 5000;

function isRetentionEnabled() {
  return getRetentionConfig().enabled;
}

function getRetentionDays() {
  return getRetentionConfig().retentionDays;
}

async function purgeOldRecords() {
  const config = getRetentionConfig();
  if (!config.enabled) {
    return { deleted: 0, skipped: true };
  }

  const retentionDays = config.retentionDays;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let totalDeleted = 0;

  logger.info('Starting record retention purge', { retentionDays, cutoff: cutoff.toISOString() });

  while (true) {
    const staleRecords = await Record.findAll({
      where: {
        datetime: { [Op.lt]: cutoff }
      },
      attributes: ['id'],
      limit: BATCH_SIZE,
      raw: true
    });

    if (staleRecords.length === 0) {
      break;
    }

    const deleted = await Record.destroy({
      where: {
        id: { [Op.in]: staleRecords.map((row) => row.id) }
      }
    });

    totalDeleted += deleted;

    if (staleRecords.length < BATCH_SIZE) {
      break;
    }
  }

  if (totalDeleted > 0 && resolveDialect() === 'sqlite') {
    try {
      await sequelize.query('VACUUM');
    } catch (error) {
      logger.debug('VACUUM skipped after retention purge', { error: error.message });
    }
  }

  const result = { deleted: totalDeleted, retentionDays, cutoff: cutoff.toISOString() };
  recordPurgeResult(result);
  logger.info('Record retention purge completed', result);
  return result;
}

function start() {
  cron.schedule('0 3 * * *', () => {
    purgeOldRecords().catch((error) => {
      logger.error('Record retention purge failed:', error);
    });
  }, { timezone: 'UTC' });

  const config = getRetentionConfig();
  logger.info(`Record retention scheduler started (${config.enabled ? 'enabled' : 'disabled'}, ${config.retentionDays} days)`);
}

module.exports = {
  start,
  purgeOldRecords,
  isRetentionEnabled,
  getRetentionDays
};
