// Ensure we use production database
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
require('dotenv').config({ path: '../env.production' });

const { User, sequelize } = require('./src/models');

async function createDefaultAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    console.log('Using database:', sequelize.config.storage || sequelize.options.storage);

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.username);
      console.log('  ID:', existingAdmin.id);
      console.log('  Email:', existingAdmin.email);
      console.log('  Role:', existingAdmin.role);
      console.log('  IsActive:', existingAdmin.isActive);
      console.log('');
      console.log('If login is failing, try deleting and recreating:');
      console.log('  node -e "const {User,sequelize}=require(\'./src/models\');(async()=>{await sequelize.authenticate();const u=await User.findOne({where:{username:\'admin\'}});if(u)await u.destroy();await sequelize.close();})();"');
      console.log('  node create-default-admin.js');
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