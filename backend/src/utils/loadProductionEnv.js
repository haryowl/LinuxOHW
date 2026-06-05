'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load env.production from the repo root before Sequelize models initialize.
 * Must be called before require('./src/models').
 */
function loadProductionEnv() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const envPath = path.join(repoRoot, 'env.production');

  if (!fs.existsSync(envPath)) {
    console.warn(`Warning: ${envPath} not found. Using default database paths.`);
    return { envPath: null, repoRoot };
  }

  require('dotenv').config({ path: envPath });
  return { envPath, repoRoot };
}

module.exports = { loadProductionEnv };
