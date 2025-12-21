'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Devices', 'customFields', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: '{}'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Devices', 'customFields');
  }
}; 