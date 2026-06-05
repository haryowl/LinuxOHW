'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Parser: Json2csvParser } = require('json2csv');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { Record } = require('../models');
const { resolveAccessibleDeviceImeis } = require('../utils/accessibleDevices');
const logger = require('../utils/logger');

const EXPORT_MAX_ROWS = Number.parseInt(process.env.EXPORT_MAX_ROWS, 10) || 50000;
const EXPORT_ALL_FIELDS = [
  'id', 'deviceImei', 'timestamp', 'datetime', 'recordNumber',
  'latitude', 'longitude', 'speed', 'direction', 'altitude', 'course', 'satellites', 'hdop',
  'status', 'supplyVoltage', 'batteryVoltage',
  'input0', 'input1', 'input2', 'input3',
  'inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3', 'inputVoltage4', 'inputVoltage5', 'inputVoltage6',
  'userData0', 'userData1', 'userData2', 'userData3', 'userData4', 'userData5', 'userData6', 'userData7',
  'modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5', 'modbus6', 'modbus7',
  'modbus8', 'modbus9', 'modbus10', 'modbus11', 'modbus12', 'modbus13', 'modbus14', 'modbus15'
];

function buildMergeKey(record) {
  const deviceImei = record.deviceImei || '';
  const keyParts = [deviceImei];
  if (record.recordNumber !== null && record.recordNumber !== undefined) {
    keyParts.push(`r:${record.recordNumber}`);
  }
  if (record.datetime) {
    const ts = new Date(record.datetime).getTime();
    keyParts.push(`d:${Number.isNaN(ts) ? record.datetime : ts}`);
  }
  if (record.milliseconds !== null && record.milliseconds !== undefined) {
    keyParts.push(`ms:${record.milliseconds}`);
  }
  if (record.id !== null && record.id !== undefined) {
    keyParts.push(`i:${record.id}`);
  }
  return keyParts.join('|');
}

function mergeRecords(records) {
  const merged = new Map();
  for (const item of records) {
    const row = typeof item.toJSON === 'function' ? item.toJSON() : item;
    const key = buildMergeKey(row);
    if (!merged.has(key)) {
      merged.set(key, { ...row });
      continue;
    }
    const existing = merged.get(key);
    for (const [field, value] of Object.entries(row)) {
      if ((existing[field] === null || existing[field] === undefined) && value !== null && value !== undefined) {
        existing[field] = value;
      }
    }
  }
  return Array.from(merged.values());
}

async function buildExportWhere(req, { startDate, endDate, imeis }) {
  const where = {};

  if (startDate && endDate) {
    where.datetime = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  if (imeis && imeis.length > 0) {
    if (req.user.role === 'admin') {
      where.deviceImei = { [Op.in]: imeis };
    } else {
      const accessibleImeis = await resolveAccessibleDeviceImeis(req.user) || [];
      const filteredImeis = imeis.filter((imei) => accessibleImeis.includes(imei));
      where.deviceImei = { [Op.in]: filteredImeis };
    }
  } else if (req.user.role !== 'admin') {
    const accessibleImeis = await resolveAccessibleDeviceImeis(req.user) || [];
    where.deviceImei = { [Op.in]: accessibleImeis.length > 0 ? accessibleImeis : [] };
  }

  return where;
}

async function fetchExportRows(where, onProgress) {
  const records = await Record.findAll({
    where,
    attributes: EXPORT_ALL_FIELDS,
    order: [['datetime', 'DESC']],
    limit: EXPORT_MAX_ROWS
  });

  if (onProgress) {
    onProgress(60);
  }

  return {
    rows: mergeRecords(records),
    truncated: records.length === EXPORT_MAX_ROWS
  };
}

async function writeExportFile({ format, fields, rows, outputPath }) {
  const selectedData = rows.map((row) => {
    const filtered = {};
    fields.forEach((field) => {
      filtered[field] = row[field];
    });
    return filtered;
  });

  if (format === 'csv') {
    const parser = new Json2csvParser({ fields });
    fs.writeFileSync(outputPath, parser.parse(selectedData), 'utf8');
    return { mimeType: 'text/csv', extension: 'csv' };
  }

  if (format === 'excel') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Records');
    worksheet.columns = fields.map((field) => ({ header: field, key: field }));
    selectedData.forEach((row) => worksheet.addRow(row));
    await workbook.xlsx.writeFile(outputPath);
    return { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' };
  }

  fs.writeFileSync(outputPath, JSON.stringify(selectedData, null, 2), 'utf8');
  return { mimeType: 'application/json', extension: 'json' };
}

const jobs = new Map();
const JOBS_DIR = path.join(__dirname, '..', '..', 'exports', 'jobs');

function ensureJobsDir() {
  if (!fs.existsSync(JOBS_DIR)) {
    fs.mkdirSync(JOBS_DIR, { recursive: true });
  }
}

function sanitizeJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    completedAt: job.completedAt || null,
    error: job.error || null,
    truncated: job.truncated || false,
    rowCount: job.rowCount || 0,
    format: job.format,
    downloadReady: job.status === 'completed' && Boolean(job.filePath)
  };
}

function createExportJob(req, params) {
  ensureJobsDir();
  const id = crypto.randomBytes(12).toString('hex');
  const job = {
    id,
    userId: req.user.userId,
    status: 'queued',
    progress: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    filePath: null,
    truncated: false,
    rowCount: 0,
    format: params.format || 'csv',
    mimeType: null,
    extension: null
  };

  jobs.set(id, job);

  setImmediate(async () => {
    job.status = 'running';
    job.progress = 10;

    try {
      const where = await buildExportWhere(req, params);
      job.progress = 25;
      const { rows, truncated } = await fetchExportRows(where, (p) => {
        job.progress = p;
      });

      job.rowCount = rows.length;
      job.truncated = truncated;
      job.progress = 80;

      const extension = params.format === 'excel' ? 'xlsx' : (params.format || 'csv');
      const filePath = path.join(JOBS_DIR, `${id}.${extension}`);
      const writeResult = await writeExportFile({
        format: params.format || 'csv',
        fields: params.fields,
        rows,
        outputPath: filePath
      });

      job.filePath = filePath;
      job.mimeType = writeResult.mimeType;
      job.extension = writeResult.extension;
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
    } catch (error) {
      logger.error('Background export job failed', { jobId: id, error: error.message });
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date().toISOString();
    }
  });

  return sanitizeJob(job);
}

function getExportJob(jobId, userId, isAdmin) {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }
  if (!isAdmin && job.userId !== userId) {
    return null;
  }
  return job;
}

function getExportJobStatus(jobId, userId, isAdmin) {
  const job = getExportJob(jobId, userId, isAdmin);
  return job ? sanitizeJob(job) : null;
}

module.exports = {
  createExportJob,
  getExportJob,
  getExportJobStatus,
  buildExportWhere,
  fetchExportRows,
  writeExportFile,
  mergeRecords,
  EXPORT_MAX_ROWS
};
