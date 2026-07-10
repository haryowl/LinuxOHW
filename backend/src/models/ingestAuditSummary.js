'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IngestAuditSummary = sequelize.define('IngestAuditSummary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    deviceImei: {
      type: DataTypes.STRING(15),
      allowNull: false
    },
    bucketMinute: {
      type: DataTypes.DATE,
      allowNull: false
    },
    packetsParsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    recordsParsed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    recordsSaved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    acksSent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    parseErrors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    saveErrors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'ingest_audit_summaries',
    indexes: [
      {
        unique: true,
        fields: ['deviceImei', 'bucketMinute']
      },
      {
        fields: ['bucketMinute']
      }
    ]
  });

  return IngestAuditSummary;
};
