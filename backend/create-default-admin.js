const { loadProductionEnv } = require('./src/utils/loadProductionEnv');

loadProductionEnv();
const { User, sequelize } = require('./src/models');

async function createDefaultAdmin() {
  try {
    const storage = sequelize.options.storage;

    await sequelize.authenticate();
    console.log('Database connection established.');
    console.log('Using database:', storage);

    await sequelize.sync();

    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      console.log('  ID:', existingAdmin.id);
      console.log('  Email:', existingAdmin.email);
      console.log('  Role:', existingAdmin.role);
      console.log('  IsActive:', existingAdmin.isActive);
      return;
    }

    await User.create({
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

    console.log('Default admin user created successfully:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('Email: admin@example.com');

  } catch (error) {
    console.error('Error creating admin user:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

createDefaultAdmin();
