'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add GPS and status columns
    const columns = [
      {
        name: 'latitude',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'longitude',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'speed',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'direction',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'height',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'satellites',
        type: Sequelize.INTEGER,
        allowNull: true
      },
      {
        name: 'status',
        type: Sequelize.STRING,
        allowNull: true
      },
      {
        name: 'supplyVoltage',
        type: Sequelize.FLOAT,
        allowNull: true
      },
      {
        name: 'batteryVoltage',
        type: Sequelize.FLOAT,
        allowNull: true
      }
    ];

    for (const column of columns) {
      await queryInterface.addColumn('Records', column.name, {
        type: column.type,
        allowNull: column.allowNull
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove GPS and status columns
    const columns = [
      'latitude',
      'longitude', 
      'speed',
      'direction',
      'height',
      'satellites',
      'status',
      'supplyVoltage',
      'batteryVoltage'
    ];

    for (const columnName of columns) {
      await queryInterface.removeColumn('Records', columnName);
    }
  }
}; 