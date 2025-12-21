const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Role = sequelize.define('Role', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [2, 50]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'System roles cannot be deleted or modified'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        // Menu access permissions
        menus: {
          dashboard: { access: true, read: true, write: false },
          devices: { access: true, read: true, write: false },
          'device-groups': { access: false, read: false, write: false },
          mapping: { access: true, read: true, write: false },
          tracking: { access: true, read: true, write: false },
          data: { access: true, read: true, write: false },
          alerts: { access: true, read: true, write: false },
          settings: { access: false, read: false, write: false },
          'user-management': { access: false, read: false, write: false },
          export: { access: true, read: true, write: false },
          'data-sm': { access: true, read: true, write: false },
          demo: { access: true, read: true, write: false }
        },
        // Module-specific permissions
        modules: {
          devices: { read: true, write: false, delete: false, create: false },
          'device-groups': { read: false, write: false, delete: false, create: false },
          users: { read: false, write: false, delete: false, create: false },
          roles: { read: false, write: false, delete: false, create: false },
          alerts: { read: true, write: false, delete: false, create: false },
          data: { read: true, write: false, delete: false, create: false },
          export: { read: true, write: false, delete: false, create: false }
        },
        // Device access permissions
        deviceAccess: {
          type: 'all', // 'all', 'group', 'specific'
          groups: [], // Array of group IDs
          devices: [] // Array of device IMEIs
        },
        // Special permissions
        special: {
          canManageUsers: false,
          canManageRoles: false,
          canManageSystem: false,
          canExportData: true,
          canViewAnalytics: true
        }
      }
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
    tableName: 'roles',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['isSystem']
      }
    ]
  });

  // Instance methods
  Role.prototype.hasMenuAccess = function(menuName, action = 'access') {
    const menuPermissions = this.permissions.menus[menuName];
    return menuPermissions && menuPermissions[action] === true;
  };

  Role.prototype.hasModulePermission = function(moduleName, action) {
    const modulePermissions = this.permissions.modules[moduleName];
    return modulePermissions && modulePermissions[action] === true;
  };

  Role.prototype.canAccessDevice = function(deviceId, deviceGroups = []) {
    const { deviceAccess } = this.permissions;
    
    if (deviceAccess.type === 'all') return true;
    if (deviceAccess.type === 'specific' && deviceAccess.devices.includes(deviceId)) return true;
    if (deviceAccess.type === 'group' && deviceGroups.some(group => deviceAccess.groups.includes(group))) return true;
    
    return false;
  };

  Role.prototype.hasSpecialPermission = function(permission) {
    return this.permissions.special[permission] === true;
  };

  return Role;
}; 