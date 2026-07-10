const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const DeviceCommand = sequelize.define('DeviceCommand', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        deviceId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        imei: {
            type: DataTypes.STRING,
            allowNull: false
        },
        deviceNumber: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        commandText: {
            type: DataTypes.STRING,
            allowNull: true
        },
        commandNumber: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('queued', 'sent', 'failed', 'replied'),
            allowNull: false,
            defaultValue: 'queued'
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        retryCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        maxRetries: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5
        },
        lastAttemptAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        nextAttemptAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        rawPayloadHex: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        replyText: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        replyDataHex: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        sentAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        repliedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        broadcastId: {
            type: DataTypes.UUID,
            allowNull: true
        }
    }, {
        tableName: 'DeviceCommands'
    });

    return DeviceCommand;
};



