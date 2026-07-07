// backend/src/models/device.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Device = sequelize.define('Device', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        imei: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        hardwareVersion: {
            type: DataTypes.STRING
        },
        firmwareVersion: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'offline'),
            defaultValue: 'inactive'
        },
        lastSeen: {
            type: DataTypes.DATE
        },
        lastLatitude: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        lastLongitude: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        lastLocationAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        lastSpeed: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        lastDirection: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        lastAltitude: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        lastSatellites: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        lastHdop: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        groupId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'device_groups',
                key: 'id'
            }
        },
        customFields: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: '{}',
            get() {
                const value = this.getDataValue('customFields');
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value);
                    } catch (e) {
                        return {};
                    }
                }
                return value || {};
            },
            set(value) {
                if (typeof value === 'object') {
                    this.setDataValue('customFields', JSON.stringify(value));
                } else {
                    this.setDataValue('customFields', value);
                }
            }
        }
    });

    return Device;
};
