'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('FieldMappings', 'deviceId', {
      type: Sequelize.UUID,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('FieldMappings', 'deviceId', {
      type: Sequelize.UUID,
      allowNull: false
    });
  }
}; 