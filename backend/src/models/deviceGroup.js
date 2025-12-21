const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeviceGroup = sequelize.define('DeviceGroup', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    color: {
      type: DataTypes.STRING(7), // Hex color code
      allowNull: false,
      defaultValue: '#1976d2'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'device_groups',
    timestamps: true
  });

  return DeviceGroup;
}; 