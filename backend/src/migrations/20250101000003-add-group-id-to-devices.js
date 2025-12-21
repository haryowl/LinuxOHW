'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('devices', 'groupId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'device_groups',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('devices', ['groupId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('devices', 'groupId');
  }
}; 