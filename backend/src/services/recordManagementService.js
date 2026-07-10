'use strict';

const { Op } = require('sequelize');
const { Record, sequelize } = require('../models');
const { appendTimeRangeFilter, EFFECTIVE_TIME_SQL } = require('../utils/recordTimeQuery');

const DELETE_BATCH_SIZE = 5000;
const GAP_WRAP_THRESHOLD = 60000;

function normalizeImeis(imeis) {
  if (!imeis) return [];
  const list = Array.isArray(imeis) ? imeis : [imeis];
  return [...new Set(list.map((value) => String(value).trim()).filter((value) => /^\d{15}$/.test(value)))];
}

function parseDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid startDate or endDate');
  }
  if (start > end) {
    throw new Error('startDate must be before endDate');
  }
  return { start, end };
}

function buildRecordWhere({ imeis, startDate, endDate }) {
  const { start, end } = parseDateRange(startDate, endDate);
  const normalizedImeis = normalizeImeis(imeis);
  const where = {};
  if (normalizedImeis.length > 0) {
    where.deviceImei = { [Op.in]: normalizedImeis };
  }
  return {
    where: appendTimeRangeFilter(where, start, end),
    start,
    end,
    imeis: normalizedImeis
  };
}

async function countMatchingRecords(filters) {
  const { where, start, end, imeis } = buildRecordWhere(filters);
  const total = await Record.count({ where });
  return { total, startDate: start.toISOString(), endDate: end.toISOString(), imeis };
}

async function deleteMatchingRecords(filters) {
  const { where } = buildRecordWhere(filters);
  let totalDeleted = 0;

  while (true) {
    const rows = await Record.findAll({
      where,
      attributes: ['id'],
      limit: DELETE_BATCH_SIZE,
      raw: true
    });
    if (!rows.length) break;

    const deleted = await Record.destroy({
      where: { id: { [Op.in]: rows.map((row) => row.id) } }
    });
    totalDeleted += deleted;
    if (rows.length < DELETE_BATCH_SIZE) break;
  }

  return { deleted: totalDeleted };
}

function analyzeRecordNumberSequence(recordNumbers, maxGaps = 100) {
  const sorted = [...new Set(recordNumbers.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  if (sorted.length === 0) {
    return {
      withRecordNumber: 0,
      minRecordNumber: null,
      maxRecordNumber: null,
      gapRanges: [],
      missingEstimate: 0
    };
  }

  const gapRanges = [];
  let missingEstimate = 0;

  for (let i = 1; i < sorted.length && gapRanges.length < maxGaps; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    const diff = next - prev;
    if (diff > 1 && diff < GAP_WRAP_THRESHOLD) {
      const missing = diff - 1;
      missingEstimate += missing;
      gapRanges.push({
        from: prev + 1,
        to: next - 1,
        missing
      });
    }
  }

  return {
    withRecordNumber: sorted.length,
    minRecordNumber: sorted[0],
    maxRecordNumber: sorted[sorted.length - 1],
    gapRanges,
    missingEstimate
  };
}

function recordsTableSql() {
  const dialect = sequelize.getDialect();
  const tableName = Record.getTableName();
  return dialect === 'postgres' ? `"${tableName}"` : tableName;
}

async function analyzeRecordGaps(filters, { maxGapsPerDevice = 50, deviceLimit = 100 } = {}) {
  const { start, end, imeis } = buildRecordWhere(filters);
  const dialect = sequelize.getDialect();
  const tableSql = recordsTableSql();
  const timeSql = `${EFFECTIVE_TIME_SQL} BETWEEN :startDate AND :endDate`;
  const countExpr = dialect === 'postgres' ? 'COUNT(*)::bigint' : 'COUNT(*)';
  const recordNumberExpr = dialect === 'postgres' ? '"recordNumber"::int' : 'recordNumber';
  const imeiCol = dialect === 'postgres' ? '"deviceImei"' : 'deviceImei';
  const recordNumberCol = dialect === 'postgres' ? '"recordNumber"' : 'recordNumber';

  let targetImeis = imeis;
  if (!targetImeis.length) {
    const [rows] = await sequelize.query(`
      SELECT DISTINCT ${imeiCol} AS imei
      FROM ${tableSql}
      WHERE ${timeSql}
      ORDER BY ${imeiCol}
      LIMIT :deviceLimit
    `, {
      replacements: { startDate: start, endDate: end, deviceLimit }
    });
    targetImeis = rows.map((row) => row.imei).filter(Boolean);
  }

  const devices = [];
  for (const imei of targetImeis.slice(0, deviceLimit)) {
    const [countRows] = await sequelize.query(`
      SELECT ${countExpr} AS total
      FROM ${tableSql}
      WHERE ${imeiCol} = :imei
        AND ${timeSql}
    `, { replacements: { imei, startDate: start, endDate: end } });

    const [numberRows] = await sequelize.query(`
      SELECT ${recordNumberExpr} AS "recordNumber"
      FROM ${tableSql}
      WHERE ${imeiCol} = :imei
        AND ${recordNumberCol} IS NOT NULL
        AND ${timeSql}
      ORDER BY ${recordNumberCol} ASC
    `, { replacements: { imei, startDate: start, endDate: end } });

    const recordNumbers = numberRows.map((row) => Number(row.recordNumber));
    const sequence = analyzeRecordNumberSequence(recordNumbers, maxGapsPerDevice);

    devices.push({
      imei,
      savedCount: Number(countRows[0]?.total || 0),
      ...sequence
    });
  }

  const summary = {
    deviceCount: devices.length,
    totalSaved: devices.reduce((sum, item) => sum + item.savedCount, 0),
    totalWithRecordNumber: devices.reduce((sum, item) => sum + item.withRecordNumber, 0),
    totalMissingEstimate: devices.reduce((sum, item) => sum + item.missingEstimate, 0),
    devicesWithGaps: devices.filter((item) => item.missingEstimate > 0).length
  };

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    imeis: targetImeis,
    summary,
    devices
  };
}

function buildIntegrityCsv(report, ingestSummary = null) {
  const lines = [
    'imei,saved_count,with_record_number,min_record_number,max_record_number,missing_estimate,gap_ranges,parsed_count,saved_audit_count,parse_loss_estimate'
  ];

  const ingestByImei = new Map((ingestSummary?.devices || []).map((item) => [item.imei, item]));

  for (const device of report.devices) {
    const ingest = ingestByImei.get(device.imei) || {};
    const parsed = ingest.recordsParsed ?? '';
    const savedAudit = ingest.recordsSaved ?? '';
    const parseLoss = parsed !== '' && savedAudit !== '' ? Math.max(0, parsed - savedAudit) : '';
    const gapText = device.gapRanges
      .map((gap) => `${gap.from}-${gap.to}(${gap.missing})`)
      .join(';');

    lines.push([
      device.imei,
      device.savedCount,
      device.withRecordNumber,
      device.minRecordNumber ?? '',
      device.maxRecordNumber ?? '',
      device.missingEstimate,
      `"${gapText}"`,
      parsed,
      savedAudit,
      parseLoss
    ].join(','));
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  countMatchingRecords,
  deleteMatchingRecords,
  analyzeRecordGaps,
  buildIntegrityCsv,
  normalizeImeis
};
