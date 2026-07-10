'use strict';

const { DataTypes } = require('sequelize');
const logger = require('./logger');

async function ensureDeviceCommandBroadcastColumn(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  let tableDescription;

  try {
    tableDescription = await queryInterface.describeTable('DeviceCommands');
  } catch (error) {
    logger.warn(`Could not describe DeviceCommands table: ${error.message}`);
    return;
  }

  if (tableDescription.broadcastId) {
    return;
  }

  try {
    await queryInterface.addColumn('DeviceCommands', 'broadcastId', {
      type: DataTypes.UUID,
      allowNull: true
    });
    logger.info('Added broadcastId column to DeviceCommands');
  } catch (error) {
    const message = error?.message || '';
    if (message.includes('already exists') || message.includes('duplicate')) {
      logger.debug('broadcastId column already exists on DeviceCommands');
      return;
    }
    logger.warn(`Could not add broadcastId to DeviceCommands: ${message}`);
  }
}

module.exports = { ensureDeviceCommandBroadcastColumn };
