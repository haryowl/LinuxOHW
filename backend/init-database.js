const { sequelize } = require('./src/models');

async function initializeDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established.');

    console.log('Initializing database schema...');
    
    // Sync all models to create tables
    await sequelize.sync({ force: false });
    
    console.log('✅ Database schema initialized successfully');
    console.log('All tables created:');
    console.log('- users');
    console.log('- devices');
    console.log('- records');
    console.log('- alert_rules');
    console.log('- alerts');
    console.log('- device_groups');
    console.log('- user_device_access');
    console.log('- field_mappings');

  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    throw error;
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Run if called directly
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