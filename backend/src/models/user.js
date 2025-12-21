const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'manager', 'operator', 'viewer'),
      allowNull: false,
      defaultValue: 'viewer'
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'id'
      },
      comment: 'Reference to custom role (overrides the role enum)'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE
    },
    passwordChangedAt: {
      type: DataTypes.DATE
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        menus: ['dashboard'],
        devices: [],
        deviceGroups: []
      }
    }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          user.password = await bcrypt.hash(user.password, 12);
          user.passwordChangedAt = new Date();
        }
      }
    }
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.prototype.hasPermission = function(permission) {
    if (this.role === 'admin') return true;
    
    const { menus, devices, deviceGroups } = this.permissions;
    
    switch (permission.type) {
      case 'menu':
        return menus.includes(permission.resource);
      case 'device':
        return devices.includes(permission.resource) || 
               deviceGroups.some(group => group.devices.includes(permission.resource));
      case 'deviceGroup':
        return deviceGroups.includes(permission.resource);
      default:
        return false;
    }
  };

  return User;
}; 