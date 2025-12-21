const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserDeviceGroupAccess = sequelize.define('UserDeviceGroupAccess', {
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
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'device_groups',
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
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'user_device_group_access',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'groupId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['groupId']
      },
      {
        fields: ['isActive']
      }
    ]
  });

  return UserDeviceGroupAccess;
}; 