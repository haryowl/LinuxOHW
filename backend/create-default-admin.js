const { User, sequelize } = require('./src/models');

async function createDefaultAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      return;
    }

    // Create default admin user
    const adminUser = await User.create({
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
    console.error('Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

createDefaultAdmin(); 