#!/usr/bin/env node
'use strict';

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'env.production') });

const { sequelize, ...models } = require('../src/models');

const TABLE_RENAMES = [
  ['records', 'Records'],
  ['devices', 'Devices'],
  ['devicecommands', 'DeviceCommands'],
  ['fieldmappings', 'FieldMappings'],
  ['alertrules', 'AlertRules'],
];

const DROP_EMPTY_TABLES = [
  'Records',
  'Devices',
  'DeviceCommands',
  'FieldMappings',
  'AlertRules',
];

const DROP_ARTIFACTS = ['lost_and_found', 'sqlite_stat1'];

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function tableExists(tableName) {
  const [rows] = await sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName
     LIMIT 1`,
    { replacements: { tableName } }
  );
  return rows.length > 0;
}

async function getColumns(tableName) {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :tableName
     ORDER BY ordinal_position`,
    { replacements: { tableName } }
  );
  return rows.map((row) => row.column_name);
}

async function renameColumnsForModel(model) {
  const tableName = model.getTableName();
  if (!(await tableExists(tableName))) {
    console.log(`skip columns: table ${tableName} not found`);
    return;
  }

  const existing = await getColumns(tableName);
  const existingLower = new Map(existing.map((col) => [col.toLowerCase(), col]));
  const attributes = Object.keys(model.rawAttributes);

  for (const attr of attributes) {
    const expected = attr;
    const actual = existingLower.get(expected.toLowerCase());
    if (!actual || actual === expected) {
      continue;
    }

    const sql = `ALTER TABLE ${quoteIdent(tableName)} RENAME COLUMN ${quoteIdent(actual)} TO ${quoteIdent(expected)}`;
    console.log(sql);
    await sequelize.query(sql);
  }
}

async function main() {
  await sequelize.authenticate();
  console.log('Connected to Postgres');

  for (const tableName of DROP_EMPTY_TABLES) {
    if (!(await tableExists(tableName))) {
      continue;
    }
    const [rows] = await sequelize.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(tableName)}`);
    const count = Number(rows[0]?.count || 0);
    if (count === 0) {
      console.log(`DROP empty table ${tableName}`);
      await sequelize.query(`DROP TABLE ${quoteIdent(tableName)} CASCADE`);
    } else {
      console.log(`KEEP ${tableName} (${count} rows)`);
    }
  }

  for (const [from, to] of TABLE_RENAMES) {
    const hasFrom = await tableExists(from);
    const hasTo = await tableExists(to);
    if (!hasFrom) {
      console.log(`skip rename ${from} -> ${to} (source missing)`);
      continue;
    }
    if (hasTo) {
      const [rows] = await sequelize.query(`SELECT COUNT(*)::bigint AS count FROM ${quoteIdent(to)}`);
      const count = Number(rows[0]?.count || 0);
      if (count === 0) {
        console.log(`DROP empty target ${to} before rename`);
        await sequelize.query(`DROP TABLE ${quoteIdent(to)} CASCADE`);
      } else {
        throw new Error(`Cannot rename ${from} -> ${to}; target already has data`);
      }
    }
    console.log(`RENAME TABLE ${from} -> ${to}`);
    await sequelize.query(`ALTER TABLE ${quoteIdent(from)} RENAME TO ${quoteIdent(to)}`);
  }

  for (const tableName of DROP_ARTIFACTS) {
    if (await tableExists(tableName)) {
      console.log(`DROP artifact ${tableName}`);
      await sequelize.query(`DROP TABLE ${quoteIdent(tableName)} CASCADE`);
    }
  }

  const modelList = [
    models.Record,
    models.Device,
    models.DeviceCommand,
    models.User,
    models.Role,
    models.DeviceGroup,
    models.AlertRule,
    models.Alert,
    models.FieldMapping,
    models.UserDeviceAccess,
    models.UserDeviceGroupAccess,
    models.DeviceArchiveStat,
  ].filter(Boolean);

  for (const model of modelList) {
    console.log(`Fix columns for ${model.name} (${model.getTableName()})`);
    await renameColumnsForModel(model);
  }

  const [records] = await sequelize.query('SELECT COUNT(*)::bigint AS count FROM "Records"');
  const [devices] = await sequelize.query('SELECT COUNT(*)::bigint AS count FROM "Devices"');
  const [users] = await sequelize.query('SELECT COUNT(*)::bigint AS count FROM users');
  console.log('Counts:', {
    records: Number(records[0]?.count || 0),
    devices: Number(devices[0]?.count || 0),
    users: Number(users[0]?.count || 0),
  });

  await sequelize.close();
  console.log('SCHEMA_FIX_OK');
}

main().catch(async (error) => {
  console.error('SCHEMA_FIX_FAILED', error);
  try {
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});
