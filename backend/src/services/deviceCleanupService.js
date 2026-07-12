'use strict';

const { Op } = require('sequelize');
const {
  sequelize,
  Device,
  Record,
  DeviceCommand,
  Alert,
  FieldMapping,
  UserDeviceAccess,
  DeviceArchiveStat,
  IngestAuditSummary
} = require('../models');
const { normalizeImeis } = require('./recordManagementService');

const RECORD_BATCH_SIZE = 5000;

function requireImeis(imeis) {
  const normalized = normalizeImeis(imeis);
  if (!normalized.length) {
    throw new Error('Select at least one IMEI. Full-device purge is not allowed without an explicit device list.');
  }
  return normalized;
}

async function findDevicesByImeis(imeis, transaction = null) {
  return Device.findAll({
    where: { imei: { [Op.in]: imeis } },
    attributes: ['id', 'imei', 'name'],
    raw: true,
    ...(transaction ? { transaction } : {})
  });
}

async function countRecordsForImeis(imeis) {
  return Record.count({
    where: { deviceImei: { [Op.in]: imeis } }
  });
}

async function deleteRecordsForImeis(imeis, transaction = null) {
  let totalDeleted = 0;
  while (true) {
    const rows = await Record.findAll({
      where: { deviceImei: { [Op.in]: imeis } },
      attributes: ['id'],
      limit: RECORD_BATCH_SIZE,
      raw: true,
      ...(transaction ? { transaction } : {})
    });
    if (!rows.length) break;
    const deleted = await Record.destroy({
      where: { id: { [Op.in]: rows.map((row) => row.id) } },
      ...(transaction ? { transaction } : {})
    });
    totalDeleted += deleted;
    if (rows.length < RECORD_BATCH_SIZE) break;
  }
  return totalDeleted;
}

async function safeCount(model, where) {
  if (!model) return 0;
  try {
    return await model.count({ where });
  } catch (error) {
    return 0;
  }
}

async function destroyWhere(model, where, transaction, label) {
  if (!model) return 0;
  try {
    return await model.destroy({
      where,
      ...(transaction ? { transaction } : {})
    });
  } catch (error) {
    throw new Error(`${label} delete failed: ${error.message}`);
  }
}

/**
 * Preview cleanup for selected IMEIs (no date filter — full device purge scope).
 */
async function previewDeviceCleanup({ imeis }) {
  const normalized = requireImeis(imeis);
  const devices = await findDevicesByImeis(normalized);
  const deviceIds = devices.map((device) => device.id);
  const foundImeis = devices.map((device) => device.imei);
  const missingImeis = normalized.filter((imei) => !foundImeis.includes(imei));

  const [
    records,
    commands,
    alerts,
    mappings,
    userAccess,
    archiveStats,
    ingestAudit
  ] = await Promise.all([
    countRecordsForImeis(normalized),
    safeCount(DeviceCommand, {
      [Op.or]: [
        { imei: { [Op.in]: normalized } },
        ...(deviceIds.length ? [{ deviceId: { [Op.in]: deviceIds } }] : [])
      ]
    }),
    deviceIds.length ? safeCount(Alert, { deviceId: { [Op.in]: deviceIds } }) : 0,
    deviceIds.length ? safeCount(FieldMapping, { deviceId: { [Op.in]: deviceIds } }) : 0,
    deviceIds.length ? safeCount(UserDeviceAccess, { deviceId: { [Op.in]: deviceIds } }) : 0,
    safeCount(DeviceArchiveStat, {
      [Op.or]: [
        { imei: { [Op.in]: normalized } },
        ...(deviceIds.length ? [{ deviceId: { [Op.in]: deviceIds } }] : [])
      ]
    }),
    safeCount(IngestAuditSummary, { deviceImei: { [Op.in]: normalized } })
  ]);

  return {
    imeis: normalized,
    missingImeis,
    devices: devices.map((device) => ({ id: device.id, imei: device.imei, name: device.name })),
    counts: {
      devices: devices.length,
      records,
      commands,
      alerts,
      mappings,
      userAccess,
      archiveStats,
      ingestAudit
    }
  };
}

/**
 * Delete selected related data for IMEIs.
 * Options default to true for a full cleanup when provided from UI.
 */
async function cleanupDevices({
  imeis,
  confirm = false,
  confirmText = '',
  deleteRecords = true,
  deleteCommands = true,
  deleteAudit = true,
  deleteArchiveStats = true,
  deleteAlerts = true,
  deleteMappings = true,
  deleteUserAccess = true,
  deleteDevices = true
}) {
  if (!confirm) {
    throw new Error('confirm: true is required');
  }
  if (String(confirmText).trim().toUpperCase() !== 'DELETE') {
    throw new Error('Type DELETE to confirm device cleanup');
  }

  const normalized = requireImeis(imeis);
  const preview = await previewDeviceCleanup({ imeis: normalized });
  const deviceIds = preview.devices.map((device) => device.id);

  const deleted = {
    records: 0,
    commands: 0,
    alerts: 0,
    mappings: 0,
    userAccess: 0,
    archiveStats: 0,
    ingestAudit: 0,
    devices: 0
  };

  await sequelize.transaction(async (transaction) => {
    if (deleteRecords) {
      deleted.records = await deleteRecordsForImeis(normalized, transaction);
    }

    if (deleteCommands) {
      deleted.commands = await destroyWhere(
        DeviceCommand,
        {
          [Op.or]: [
            { imei: { [Op.in]: normalized } },
            ...(deviceIds.length ? [{ deviceId: { [Op.in]: deviceIds } }] : [])
          ]
        },
        transaction,
        'Commands'
      );
    }

    if (deleteAudit) {
      deleted.ingestAudit = await destroyWhere(
        IngestAuditSummary,
        { deviceImei: { [Op.in]: normalized } },
        transaction,
        'Ingest audit'
      );
    }

    if (deleteArchiveStats) {
      deleted.archiveStats = await destroyWhere(
        DeviceArchiveStat,
        {
          [Op.or]: [
            { imei: { [Op.in]: normalized } },
            ...(deviceIds.length ? [{ deviceId: { [Op.in]: deviceIds } }] : [])
          ]
        },
        transaction,
        'Archive stats'
      );
    }

    if (deviceIds.length) {
      if (deleteAlerts) {
        deleted.alerts = await destroyWhere(
          Alert,
          { deviceId: { [Op.in]: deviceIds } },
          transaction,
          'Alerts'
        );
      }
      if (deleteMappings) {
        deleted.mappings = await destroyWhere(
          FieldMapping,
          { deviceId: { [Op.in]: deviceIds } },
          transaction,
          'Field mappings'
        );
      }
      if (deleteUserAccess) {
        deleted.userAccess = await destroyWhere(
          UserDeviceAccess,
          { deviceId: { [Op.in]: deviceIds } },
          transaction,
          'User access'
        );
      }
      if (deleteDevices) {
        deleted.devices = await Device.destroy({
          where: { id: { [Op.in]: deviceIds } },
          transaction
        });
      }
    }
  });

  let remainingDevices = 0;
  if (deleteDevices) {
    remainingDevices = await Device.count({
      where: { imei: { [Op.in]: normalized } }
    });
    if (remainingDevices > 0) {
      throw new Error(
        `Cleanup reported deleting ${deleted.devices} device row(s), but ${remainingDevices} still exist for the selected IMEI(s). Check foreign-key constraints or reconnecting devices recreating rows.`
      );
    }
  }

  // Clear in-memory device manager entries if present
  try {
    const deviceManager = require('./deviceManager');
    if (typeof deviceManager.clearDeviceCache === 'function') {
      deviceManager.clearDeviceCache();
    }
  } catch (error) {
    // optional
  }

  return {
    message: 'Device cleanup completed',
    imeis: normalized,
    preview,
    deleted,
    remainingDevices
  };
}

module.exports = {
  previewDeviceCleanup,
  cleanupDevices
};
