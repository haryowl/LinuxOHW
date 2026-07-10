'use strict';

const logger = require('./logger');

async function ensureIngestAuditTable(sequelize) {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const tableNames = tables.map((name) => name.toString());

  if (tableNames.includes('ingest_audit_summaries')) {
    return;
  }

  await queryInterface.createTable('ingest_audit_summaries', {
    id: {
      type: sequelize.Sequelize.UUID,
      defaultValue: sequelize.Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    deviceImei: {
      type: sequelize.Sequelize.STRING(15),
      allowNull: false
    },
    bucketMinute: {
      type: sequelize.Sequelize.DATE,
      allowNull: false
    },
    packetsParsed: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    recordsParsed: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    recordsSaved: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    acksSent: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    parseErrors: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    saveErrors: {
      type: sequelize.Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    createdAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      type: sequelize.Sequelize.DATE,
      allowNull: false,
      defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('ingest_audit_summaries', ['deviceImei', 'bucketMinute'], {
    unique: true,
    name: 'ingest_audit_summaries_device_bucket_uq'
  });
  await queryInterface.addIndex('ingest_audit_summaries', ['bucketMinute'], {
    name: 'ingest_audit_summaries_bucket_idx'
  });

  logger.info('Created ingest_audit_summaries table');
}

module.exports = { ensureIngestAuditTable };
