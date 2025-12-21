'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the existing table and recreate it with correct UUID field
    await queryInterface.dropTable('user_device_access');
    
    await queryInterface.createTable('user_device_access', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      deviceId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'devices',
          key: 'id'
        }
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
        }
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
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add unique constraint
    await queryInterface.addIndex('user_device_access', ['userId', 'deviceId'], {
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_device_access');
  }
}; 