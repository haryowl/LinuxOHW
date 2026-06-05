'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('Records', ['deviceImei'], {
      name: 'records_device_imei_idx'
    });
    await queryInterface.addIndex('Records', ['datetime'], {
      name: 'records_datetime_idx'
    });
    await queryInterface.addIndex('Records', ['timestamp'], {
      name: 'records_timestamp_idx'
    });
    await queryInterface.addIndex('Records', ['deviceImei', 'datetime'], {
      name: 'records_device_datetime_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('Records', 'records_device_datetime_idx');
    await queryInterface.removeIndex('Records', 'records_timestamp_idx');
    await queryInterface.removeIndex('Records', 'records_datetime_idx');
    await queryInterface.removeIndex('Records', 'records_device_imei_idx');
  }
};
