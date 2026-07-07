'use strict';

const { DataTypes } = require('sequelize');
const logger = require('./logger');

const DEVICE_LOCATION_COLUMNS = [
    { name: 'lastLatitude', type: DataTypes.FLOAT },
    { name: 'lastLongitude', type: DataTypes.FLOAT },
    { name: 'lastLocationAt', type: DataTypes.DATE },
    { name: 'lastSpeed', type: DataTypes.FLOAT },
    { name: 'lastDirection', type: DataTypes.FLOAT },
    { name: 'lastAltitude', type: DataTypes.FLOAT },
    { name: 'lastSatellites', type: DataTypes.INTEGER },
    { name: 'lastHdop', type: DataTypes.FLOAT }
];

async function ensureDeviceLocationColumns(sequelize) {
    const queryInterface = sequelize.getQueryInterface();

    for (const column of DEVICE_LOCATION_COLUMNS) {
        try {
            await queryInterface.addColumn('Devices', column.name, {
                type: column.type,
                allowNull: true
            });
            logger.info(`Added Devices.${column.name}`);
        } catch (error) {
            const message = error?.message || '';
            if (message.includes('duplicate column') || message.includes('already exists')) {
                logger.debug(`Devices.${column.name} already exists`);
            } else {
                logger.warn(`Could not add Devices.${column.name}: ${message}`);
            }
        }
    }
}

module.exports = { ensureDeviceLocationColumns, DEVICE_LOCATION_COLUMNS };
