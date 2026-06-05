const path = require('path');
const fs = require('fs');
const { loadProductionEnv } = require('./src/utils/loadProductionEnv');

const { envPath } = loadProductionEnv();
const { sequelize } = require('./src/models');

async function initializeDatabase() {
  try {
    const storage = sequelize.options.storage;
    const storageDir = path.dirname(storage);

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    console.log('Connecting to database...');
    if (envPath) {
      console.log('Environment file:', envPath);
    }
    console.log('Database file:', storage);

    await sequelize.authenticate();
    console.log('Database connection established.');

    console.log('Initializing database schema...');
    await sequelize.sync({ force: false });

    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('✅ Database schema initialized successfully');
    console.log(`Tables (${tables.length}):`);
    tables.forEach((table) => console.log(`- ${table}`));

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
