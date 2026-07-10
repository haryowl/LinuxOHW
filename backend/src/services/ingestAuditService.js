'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const FLUSH_INTERVAL_MS = 10000;
const UNKNOWN_IMEI = '000000000000000';

class IngestAuditService {
  constructor() {
    this.buffer = new Map();
    this.flushTimer = null;
    this.retentionJob = null;
    this.model = null;
    this.sequelize = null;
  }

  isEnabled() {
    return process.env.INGEST_AUDIT_ENABLED === 'true';
  }

  getRetentionDays() {
    const days = Number.parseInt(process.env.INGEST_AUDIT_RETENTION_DAYS, 10);
    return Number.isFinite(days) && days > 0 ? days : 90;
  }

  start() {
    if (!this.isEnabled()) {
      logger.info('Ingest audit summary disabled (set INGEST_AUDIT_ENABLED=true to enable)');
      return;
    }

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.warn('Ingest audit flush failed', { error: error.message });
      });
    }, FLUSH_INTERVAL_MS);

    this.retentionJob = cron.schedule('15 4 * * *', () => {
      this.purgeOldSummaries().catch((error) => {
        logger.warn('Ingest audit retention purge failed', { error: error.message });
      });
    }, { timezone: 'UTC' });

    logger.info(`Ingest audit summary enabled (flush ${FLUSH_INTERVAL_MS}ms, retention ${this.getRetentionDays()} days)`);
  }

  stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.retentionJob) {
      this.retentionJob.stop();
      this.retentionJob = null;
    }
  }

  bindModel(model, sequelize) {
    this.model = model;
    this.sequelize = sequelize;
  }

  normalizeImei(imei) {
    if (typeof imei === 'string' && /^\d{15}$/.test(imei)) {
      return imei;
    }
    return UNKNOWN_IMEI;
  }

  bucketMinute(date = new Date()) {
    const d = new Date(date);
    d.setSeconds(0, 0);
    return d;
  }

  bucketKey(imei, date = new Date()) {
    return `${imei}|${this.bucketMinute(date).toISOString()}`;
  }

  getOrCreateBucket(imei, date = new Date()) {
    const normalized = this.normalizeImei(imei);
    const key = this.bucketKey(normalized, date);
    if (!this.buffer.has(key)) {
      this.buffer.set(key, {
        deviceImei: normalized,
        bucketMinute: this.bucketMinute(date),
        packetsParsed: 0,
        recordsParsed: 0,
        recordsSaved: 0,
        acksSent: 0,
        parseErrors: 0,
        saveErrors: 0
      });
    }
    return this.buffer.get(key);
  }

  trackPacketParsed(imei, recordsParsed = 0) {
    if (!this.isEnabled()) return;
    try {
      const bucket = this.getOrCreateBucket(imei);
      bucket.packetsParsed += 1;
      bucket.recordsParsed += Math.max(0, Number(recordsParsed) || 0);
    } catch (error) {
      logger.debug('Ingest audit trackPacketParsed skipped', { error: error.message });
    }
  }

  trackRecordsSaved(imei, count = 1) {
    if (!this.isEnabled()) return;
    try {
      const bucket = this.getOrCreateBucket(imei);
      bucket.recordsSaved += Math.max(0, Number(count) || 0);
    } catch (error) {
      logger.debug('Ingest audit trackRecordsSaved skipped', { error: error.message });
    }
  }

  trackAck(imei) {
    if (!this.isEnabled()) return;
    try {
      const bucket = this.getOrCreateBucket(imei);
      bucket.acksSent += 1;
    } catch (error) {
      logger.debug('Ingest audit trackAck skipped', { error: error.message });
    }
  }

  trackParseError(imei) {
    if (!this.isEnabled()) return;
    try {
      const bucket = this.getOrCreateBucket(imei);
      bucket.parseErrors += 1;
    } catch (error) {
      logger.debug('Ingest audit trackParseError skipped', { error: error.message });
    }
  }

  trackSaveError(imei, count = 1) {
    if (!this.isEnabled()) return;
    try {
      const bucket = this.getOrCreateBucket(imei);
      bucket.saveErrors += Math.max(0, Number(count) || 0);
    } catch (error) {
      logger.debug('Ingest audit trackSaveError skipped', { error: error.message });
    }
  }

  async flush() {
    if (!this.isEnabled() || !this.model || this.buffer.size === 0) {
      return { flushed: 0 };
    }

    const entries = Array.from(this.buffer.values());
    this.buffer.clear();

    const dialect = this.sequelize?.getDialect?.() || 'postgres';
    let flushed = 0;

    for (const entry of entries) {
      try {
        if (dialect === 'postgres') {
          await this.sequelize.query(`
            INSERT INTO ingest_audit_summaries
              (id, "deviceImei", "bucketMinute", "packetsParsed", "recordsParsed", "recordsSaved", "acksSent", "parseErrors", "saveErrors", "createdAt", "updatedAt")
            VALUES
              (gen_random_uuid(), :deviceImei, :bucketMinute, :packetsParsed, :recordsParsed, :recordsSaved, :acksSent, :parseErrors, :saveErrors, NOW(), NOW())
            ON CONFLICT ("deviceImei", "bucketMinute") DO UPDATE SET
              "packetsParsed" = ingest_audit_summaries."packetsParsed" + EXCLUDED."packetsParsed",
              "recordsParsed" = ingest_audit_summaries."recordsParsed" + EXCLUDED."recordsParsed",
              "recordsSaved" = ingest_audit_summaries."recordsSaved" + EXCLUDED."recordsSaved",
              "acksSent" = ingest_audit_summaries."acksSent" + EXCLUDED."acksSent",
              "parseErrors" = ingest_audit_summaries."parseErrors" + EXCLUDED."parseErrors",
              "saveErrors" = ingest_audit_summaries."saveErrors" + EXCLUDED."saveErrors",
              "updatedAt" = NOW()
          `, { replacements: entry });
        } else {
          const existing = await this.model.findOne({
            where: {
              deviceImei: entry.deviceImei,
              bucketMinute: entry.bucketMinute
            }
          });
          if (existing) {
            await existing.update({
              packetsParsed: existing.packetsParsed + entry.packetsParsed,
              recordsParsed: existing.recordsParsed + entry.recordsParsed,
              recordsSaved: existing.recordsSaved + entry.recordsSaved,
              acksSent: existing.acksSent + entry.acksSent,
              parseErrors: existing.parseErrors + entry.parseErrors,
              saveErrors: existing.saveErrors + entry.saveErrors
            });
          } else {
            await this.model.create(entry);
          }
        }
        flushed += 1;
      } catch (error) {
        logger.warn('Ingest audit row flush failed', {
          imei: entry.deviceImei,
          error: error.message
        });
      }
    }

    return { flushed };
  }

  async purgeOldSummaries() {
    if (!this.model) return { deleted: 0 };
    const cutoff = new Date(Date.now() - this.getRetentionDays() * 24 * 60 * 60 * 1000);
    const deleted = await this.model.destroy({
      where: {
        bucketMinute: { [Op.lt]: cutoff }
      }
    });
    if (deleted > 0) {
      logger.info('Ingest audit retention purge completed', { deleted, cutoff: cutoff.toISOString() });
    }
    return { deleted, cutoff: cutoff.toISOString() };
  }

  async getSummary({ imeis = [], startDate, endDate }) {
    if (!this.model) {
      return { enabled: this.isEnabled(), devices: [], summary: null };
    }

    await this.flush();

    const start = new Date(startDate);
    const end = new Date(endDate);
    const where = {
      bucketMinute: { [Op.between]: [start, end] }
    };
    if (Array.isArray(imeis) && imeis.length > 0) {
      where.deviceImei = { [Op.in]: imeis };
    }

    const rows = await this.model.findAll({
      where,
      order: [['deviceImei', 'ASC'], ['bucketMinute', 'ASC']]
    });

    const byImei = new Map();
    for (const row of rows) {
      if (!byImei.has(row.deviceImei)) {
        byImei.set(row.deviceImei, {
          imei: row.deviceImei,
          packetsParsed: 0,
          recordsParsed: 0,
          recordsSaved: 0,
          acksSent: 0,
          parseErrors: 0,
          saveErrors: 0
        });
      }
      const item = byImei.get(row.deviceImei);
      item.packetsParsed += row.packetsParsed;
      item.recordsParsed += row.recordsParsed;
      item.recordsSaved += row.recordsSaved;
      item.acksSent += row.acksSent;
      item.parseErrors += row.parseErrors;
      item.saveErrors += row.saveErrors;
    }

    const devices = Array.from(byImei.values()).map((item) => ({
      ...item,
      parseLossEstimate: Math.max(0, item.recordsParsed - item.recordsSaved)
    }));

    const summary = devices.reduce((acc, item) => ({
      packetsParsed: acc.packetsParsed + item.packetsParsed,
      recordsParsed: acc.recordsParsed + item.recordsParsed,
      recordsSaved: acc.recordsSaved + item.recordsSaved,
      acksSent: acc.acksSent + item.acksSent,
      parseErrors: acc.parseErrors + item.parseErrors,
      saveErrors: acc.saveErrors + item.saveErrors,
      parseLossEstimate: acc.parseLossEstimate + item.parseLossEstimate
    }), {
      packetsParsed: 0,
      recordsParsed: 0,
      recordsSaved: 0,
      acksSent: 0,
      parseErrors: 0,
      saveErrors: 0,
      parseLossEstimate: 0
    });

    return {
      enabled: this.isEnabled(),
      retentionDays: this.getRetentionDays(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary,
      devices
    };
  }

  getStatus() {
    return {
      enabled: this.isEnabled(),
      retentionDays: this.getRetentionDays(),
      bufferedBuckets: this.buffer.size,
      flushIntervalMs: FLUSH_INTERVAL_MS
    };
  }
}

module.exports = new IngestAuditService();
