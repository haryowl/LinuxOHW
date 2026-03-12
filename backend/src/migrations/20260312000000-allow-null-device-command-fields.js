'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('DeviceCommands', 'commandText', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn('DeviceCommands', 'commandNumber', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('DeviceCommands', 'commandText', {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn('DeviceCommands', 'commandNumber', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
