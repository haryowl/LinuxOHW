'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing input voltage columns (4-6)
    for (let i = 4; i <= 6; i++) {
      await queryInterface.addColumn('Records', `inputVoltage${i}`, {
        type: Sequelize.FLOAT,
        allowNull: true
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove input voltage columns (4-6)
    for (let i = 4; i <= 6; i++) {
      await queryInterface.removeColumn('Records', `inputVoltage${i}`);
    }
  }
}; 