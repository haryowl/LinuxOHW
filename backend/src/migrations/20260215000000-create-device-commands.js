'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('DeviceCommands', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      deviceId: {
        type: Sequelize.UUID,
        allowNull: false
      },
      imei: {
        type: Sequelize.STRING,
        allowNull: false
      },
      deviceNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      commandText: {
        type: Sequelize.STRING,
        allowNull: true
      },
      commandNumber: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('queued', 'sent', 'failed', 'replied'),
        allowNull: false,
        defaultValue: 'queued'
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      retryCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      maxRetries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      lastAttemptAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextAttemptAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rawPayloadHex: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      replyText: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      replyDataHex: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sentAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      repliedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex('DeviceCommands', ['deviceId']);
    await queryInterface.addIndex('DeviceCommands', ['imei']);
    await queryInterface.addIndex('DeviceCommands', ['commandNumber']);
    await queryInterface.addIndex('DeviceCommands', ['status']);
    await queryInterface.addIndex('DeviceCommands', ['sentAt']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('DeviceCommands');
  }
};



