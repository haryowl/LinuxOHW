'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_device_access', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      deviceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      accessLevel: {
        type: Sequelize.ENUM('read', 'write', 'admin'),
        allowNull: false,
        defaultValue: 'read'
      },
      grantedBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      grantedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      expiresAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('user_device_access', ['userId']);
    await queryInterface.addIndex('user_device_access', ['deviceId']);
    await queryInterface.addIndex('user_device_access', ['grantedBy']);
    await queryInterface.addIndex('user_device_access', ['isActive']);
    await queryInterface.addIndex('user_device_access', ['accessLevel']);
    
    // Add unique constraint
    await queryInterface.addConstraint('user_device_access', {
      fields: ['userId', 'deviceId'],
      type: 'unique',
      name: 'user_device_access_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_device_access');
  }
}; 