'use strict';

const path = require('path');
const logger = require('../utils/logger');

function resolveDialect() {
  return (process.env.DB_DIALECT || 'sqlite').toLowerCase();
}

function isPostgresDialect(dialect) {
  return dialect === 'postgres' || dialect === 'postgresql';
}

function buildSequelizeOptions() {
  const dialect = resolveDialect();
  const logging = (msg) => logger.debug(msg);

  if (isPostgresDialect(dialect)) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required when DB_DIALECT=postgres');
    }

    return {
      url: databaseUrl,
      options: {
        dialect: 'postgres',
        logging,
        pool: {
          max: Number.parseInt(process.env.DB_POOL_MAX, 10) || 10,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        dialectOptions: process.env.DB_SSL === 'true'
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {}
      }
    };
  }

  const storage = process.env.DB_STORAGE
    || (process.env.NODE_ENV === 'production'
      ? path.join(__dirname, '..', '..', 'data', 'prod.sqlite')
      : path.join(__dirname, '..', '..', 'data', 'dev.sqlite'));

  return {
    url: null,
    options: {
      dialect: 'sqlite',
      storage,
      logging
    }
  };
}

module.exports = {
  buildSequelizeOptions,
  resolveDialect,
  isPostgresDialect
};
