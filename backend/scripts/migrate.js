'use strict';

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../src/models');

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.map(t => t.toString()).includes(tableName);
}

async function getTableColumns(queryInterface, tableName) {
  const columns = await queryInterface.describeTable(tableName);
  return Object.keys(columns);
}

async function ensureDeviceCommandsTable(queryInterface) {
  const tableName = 'DeviceCommands';
  const exists = await tableExists(queryInterface, tableName);
  if (!exists) {
    await queryInterface.createTable(tableName, {
      id: {
        type: 'UUID',
        primaryKey: true,
        allowNull: false
      },
      deviceId: {
        type: 'UUID',
        allowNull: false
      },
      imei: {
        type: 'VARCHAR(255)',
        allowNull: false
      },
      deviceNumber: {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 0
      },
      commandText: {
        type: 'VARCHAR(255)',
        allowNull: true
      },
      commandNumber: {
        type: 'INTEGER',
        allowNull: true
      },
      status: {
        type: 'VARCHAR(16)',
        allowNull: false,
        defaultValue: 'queued'
      },
      priority: {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 0
      },
      retryCount: {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 0
      },
      maxRetries: {
        type: 'INTEGER',
        allowNull: false,
        defaultValue: 5
      },
      lastAttemptAt: {
        type: 'DATETIME',
        allowNull: true
      },
      nextAttemptAt: {
        type: 'DATETIME',
        allowNull: true
      },
      rawPayloadHex: {
        type: 'TEXT',
        allowNull: true
      },
      replyText: {
        type: 'TEXT',
        allowNull: true
      },
      replyDataHex: {
        type: 'TEXT',
        allowNull: true
      },
      errorMessage: {
        type: 'TEXT',
        allowNull: true
      },
      sentAt: {
        type: 'DATETIME',
        allowNull: true
      },
      repliedAt: {
        type: 'DATETIME',
        allowNull: true
      },
      createdBy: {
        type: 'INTEGER',
        allowNull: true
      },
      createdAt: {
        type: 'DATETIME',
        allowNull: false
      },
      updatedAt: {
        type: 'DATETIME',
        allowNull: false
      }
    });
    return;
  }

  const columns = await getTableColumns(queryInterface, tableName);
  const addColumn = async (name, definition) => {
    if (!columns.includes(name)) {
      await queryInterface.addColumn(tableName, name, definition);
    }
  };

  await addColumn('priority', { type: 'INTEGER', allowNull: false, defaultValue: 0 });
  await addColumn('retryCount', { type: 'INTEGER', allowNull: false, defaultValue: 0 });
  await addColumn('maxRetries', { type: 'INTEGER', allowNull: false, defaultValue: 5 });
  await addColumn('lastAttemptAt', { type: 'DATETIME', allowNull: true });
  await addColumn('nextAttemptAt', { type: 'DATETIME', allowNull: true });
  await addColumn('rawPayloadHex', { type: 'TEXT', allowNull: true });
  await addColumn('replyText', { type: 'TEXT', allowNull: true });
  await addColumn('replyDataHex', { type: 'TEXT', allowNull: true });
  await addColumn('errorMessage', { type: 'TEXT', allowNull: true });
  await addColumn('sentAt', { type: 'DATETIME', allowNull: true });
  await addColumn('repliedAt', { type: 'DATETIME', allowNull: true });
  await addColumn('createdBy', { type: 'INTEGER', allowNull: true });

  await queryInterface.changeColumn(tableName, 'commandText', {
    type: 'VARCHAR(255)',
    allowNull: true
  });

  await queryInterface.changeColumn(tableName, 'commandNumber', {
    type: 'INTEGER',
    allowNull: true
  });
};

async function run() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    await ensureDeviceCommandsTable(queryInterface);
    console.log('DeviceCommands migration completed');
  } catch (error) {
    console.error('Migration error:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();



