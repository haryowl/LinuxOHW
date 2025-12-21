'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await queryInterface.bulkInsert('users', [{
      username: 'admin',
      email: 'admin@ohw.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
      permissions: JSON.stringify({
        menus: ['dashboard', 'devices', 'mapping', 'tracking', 'data', 'alerts', 'settings', 'export', 'demo', 'user-management'],
        devices: [],
        deviceGroups: []
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', { username: 'admin' });
  }
}; 