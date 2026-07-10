#!/usr/bin/env node
'use strict';

/**
 * Remove duplicate Records rows so the dedup unique index can be created.
 * Keeps the lowest id per (deviceImei, datetime, recordNumber).
 *
 * Usage:
 *   cd backend
 *   node scripts/dedupeRecordsForIndex.js --dry-run
 *   node scripts/dedupeRecordsForIndex.js
 */

const { loadProductionEnv } = require('../src/utils/loadProductionEnv');
const { buildSequelizeOptions, isPostgresDialect, resolveDialect } = require('../src/config/database');

loadProductionEnv();

const dryRun = process.argv.includes('--dry-run');
const batchSize = parseInt(process.env.DEDUPE_BATCH_SIZE, 10) || 10000;

async function countDuplicateGroups(sequelize, dialect) {
  const sql = isPostgresDialect(dialect)
    ? `SELECT COUNT(*)::bigint AS duplicates FROM (
         SELECT "deviceImei", "datetime", "recordNumber", COUNT(*) AS cnt
         FROM "Records"
         WHERE "datetime" IS NOT NULL AND "recordNumber" IS NOT NULL
         GROUP BY "deviceImei", "datetime", "recordNumber"
         HAVING COUNT(*) > 1
       ) d`
    : `SELECT COUNT(*) AS duplicates FROM (
         SELECT deviceImei, datetime, recordNumber, COUNT(*) AS cnt
         FROM Records
         WHERE datetime IS NOT NULL AND recordNumber IS NOT NULL
         GROUP BY deviceImei, datetime, recordNumber
         HAVING COUNT(*) > 1
       )`;

  const [rows] = await sequelize.query(sql);
  return Number(rows[0]?.duplicates || 0);
}

async function deleteDuplicateBatch(sequelize, dialect) {
  if (isPostgresDialect(dialect)) {
    const sql = `
      DELETE FROM "Records"
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY "deviceImei", "datetime", "recordNumber"
                   ORDER BY id ASC
                 ) AS rn
          FROM "Records"
          WHERE "datetime" IS NOT NULL AND "recordNumber" IS NOT NULL
        ) ranked
        WHERE rn > 1
        LIMIT ${batchSize}
      )`;
    const [, metadata] = await sequelize.query(sql);
    return metadata?.rowCount ?? 0;
  }

  const sql = `
    DELETE FROM Records
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY deviceImei, datetime, recordNumber
                 ORDER BY id ASC
               ) AS rn
        FROM Records
        WHERE datetime IS NOT NULL AND recordNumber IS NOT NULL
      )
      WHERE rn > 1
      LIMIT ${batchSize}
    )`;
  const [, metadata] = await sequelize.query(sql);
  return metadata?.changes ?? metadata?.rowCount ?? 0;
}

async function main() {
  const dialect = resolveDialect();
  const { Sequelize } = require('sequelize');
  const dbConfig = buildSequelizeOptions();
  const sequelize = dbConfig.url
    ? new Sequelize(dbConfig.url, dbConfig.options)
    : new Sequelize(dbConfig.options);

  try {
    await sequelize.authenticate();
    const initialGroups = await countDuplicateGroups(sequelize, dialect);
    console.log(`Duplicate groups before cleanup: ${initialGroups}`);

    if (initialGroups === 0) {
      console.log('No duplicates — nothing to do.');
      return;
    }

    if (dryRun) {
      console.log('Dry run — no rows deleted.');
      return;
    }

    let totalDeleted = 0;
    let batch = 0;
    while (true) {
      batch += 1;
      const deleted = await deleteDuplicateBatch(sequelize, dialect);
      totalDeleted += deleted;
      console.log(`Batch ${batch}: deleted ${deleted} rows (total ${totalDeleted})`);
      if (deleted === 0) {
        break;
      }
    }

    const remaining = await countDuplicateGroups(sequelize, dialect);
    console.log(`Duplicate groups after cleanup: ${remaining}`);
    console.log(`Total rows deleted: ${totalDeleted}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
