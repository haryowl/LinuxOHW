// Force create admin user in production database
process.env.NODE_ENV = 'production';
require('dotenv').config({ path: '../env.production' });

const { User, sequelize } = require('./src/models');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');
    console.log('Database:', sequelize.config.storage || sequelize.options.storage);
    console.log('');

    // Delete existing admin if exists
    const existing = await User.findOne({ where: { username: 'admin' } });
    if (existing) {
      await existing.destroy();
      console.log('✓ Deleted existing admin user');
    }

    // Create new admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      permissions: {
        menus: ['dashboard', 'devices', 'mapping', 'tracking', 'settings', 'alerts', 'data', 'export', 'demo', 'user-management'],
        devices: [],
        deviceGroups: []
      }
    });

    console.log('✓ Admin user created successfully');
    console.log('');
    console.log('Login credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Email: admin@example.com');
    console.log('');

    // Verify it was created
    const verify = await User.findOne({ where: { username: 'admin' } });
    if (verify) {
      console.log('✓ Verification: Admin user found in database');
      console.log('  ID:', verify.id);
      console.log('  IsActive:', verify.isActive);
      console.log('  Role:', verify.role);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

createAdmin();
















