const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserDeviceAccess = sequelize.define('UserDeviceAccess', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'devices',
        key: 'id'
      }
    },
    accessLevel: {
      type: DataTypes.ENUM('read', 'write', 'admin'),
      allowNull: false,
      defaultValue: 'read'
    },
    grantedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'user_device_access',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'deviceId']
      }
    ]
  });

  return UserDeviceAccess;
}; 