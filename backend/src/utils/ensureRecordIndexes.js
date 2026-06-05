'use strict';

const logger = require('./logger');

const RECORD_INDEXES = [
  { name: 'records_device_imei_idx', fields: ['deviceImei'] },
  { name: 'records_datetime_idx', fields: ['datetime'] },
  { name: 'records_timestamp_idx', fields: ['timestamp'] },
  { name: 'records_device_datetime_idx', fields: ['deviceImei', 'datetime'] }
];

async function ensureRecordIndexes(sequelize) {
  const queryInterface = sequelize.getQueryInterface();

  for (const index of RECORD_INDEXES) {
    try {
      await queryInterface.addIndex('Records', index.fields, { name: index.name });
      logger.info(`Created index ${index.name} on Records`);
    } catch (error) {
      const message = error?.message || '';
      if (message.includes('already exists') || message.includes('duplicate')) {
        logger.debug(`Index ${index.name} already exists`);
      } else {
        logger.warn(`Could not create index ${index.name}: ${message}`);
      }
    }
  }
}

module.exports = { ensureRecordIndexes };
