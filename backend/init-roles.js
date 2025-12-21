const { sequelize } = require('./src/models');
const { Role, User } = require('./src/models');

async function initializeRoles() {
  try {
    await sequelize.authenticate();
    console.log('🔧 Initializing roles...');
    
    // Get admin user
    const adminUser = await User.findOne({ where: { username: 'admin' } });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run create-default-admin.js first.');
      return;
    }

    // Default roles configuration
    const defaultRoles = [
      {
        name: 'Administrator',
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: {
          menus: {
            dashboard: { access: true, read: true, write: true },
            devices: { access: true, read: true, write: true },
            'device-groups': { access: true, read: true, write: true },
            mapping: { access: true, read: true, write: true },
            tracking: { access: true, read: true, write: true },
            data: { access: true, read: true, write: true },
            alerts: { access: true, read: true, write: true },
            settings: { access: true, read: true, write: true },
            'user-management': { access: true, read: true, write: true },
            export: { access: true, read: true, write: true },
            'data-sm': { access: true, read: true, write: true },
            demo: { access: true, read: true, write: true }
          },
          modules: {
            devices: { read: true, write: true, delete: true, create: true },
            'device-groups': { read: true, write: true, delete: true, create: true },
            users: { read: true, write: true, delete: true, create: true },
            roles: { read: true, write: true, delete: true, create: true },
            alerts: { read: true, write: true, delete: true, create: true },
            data: { read: true, write: true, delete: true, create: true },
            export: { read: true, write: true, delete: true, create: true }
          },
          deviceAccess: {
            type: 'all',
            groups: [],
            devices: []
          },
          special: {
            canManageUsers: true,
            canManageRoles: true,
            canManageSystem: true,
            canExportData: true,
            canViewAnalytics: true
          }
        }
      },
      {
        name: 'Manager',
        description: 'Management access with device and user management capabilities',
        isSystem: true,
        permissions: {
          menus: {
            dashboard: { access: true, read: true, write: false },
            devices: { access: true, read: true, write: true },
            'device-groups': { access: true, read: true, write: true },
            mapping: { access: true, read: true, write: true },
            tracking: { access: true, read: true, write: false },
            data: { access: true, read: true, write: false },
            alerts: { access: true, read: true, write: true },
            settings: { access: false, read: false, write: false },
            'user-management': { access: true, read: true, write: true },
            export: { access: true, read: true, write: true },
            'data-sm': { access: true, read: true, write: true },
            demo: { access: true, read: true, write: false }
          },
          modules: {
            devices: { read: true, write: true, delete: false, create: true },
            'device-groups': { read: true, write: true, delete: false, create: true },
            users: { read: true, write: true, delete: false, create: true },
            roles: { read: true, write: false, delete: false, create: false },
            alerts: { read: true, write: true, delete: false, create: true },
            data: { read: true, write: false, delete: false, create: false },
            export: { read: true, write: true, delete: false, create: true }
          },
          deviceAccess: {
            type: 'all',
            groups: [],
            devices: []
          },
          special: {
            canManageUsers: true,
            canManageRoles: false,
            canManageSystem: false,
            canExportData: true,
            canViewAnalytics: true
          }
        }
      },
      {
        name: 'Operator',
        description: 'Operational access for daily device monitoring and data viewing',
        isSystem: true,
        permissions: {
          menus: {
            dashboard: { access: true, read: true, write: false },
            devices: { access: true, read: true, write: false },
            'device-groups': { access: true, read: true, write: false },
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
          modules: {
            devices: { read: true, write: false, delete: false, create: false },
            'device-groups': { read: true, write: false, delete: false, create: false },
            users: { read: false, write: false, delete: false, create: false },
            roles: { read: false, write: false, delete: false, create: false },
            alerts: { read: true, write: false, delete: false, create: false },
            data: { read: true, write: false, delete: false, create: false },
            export: { read: true, write: false, delete: false, create: false }
          },
          deviceAccess: {
            type: 'all',
            groups: [],
            devices: []
          },
          special: {
            canManageUsers: false,
            canManageRoles: false,
            canManageSystem: false,
            canExportData: true,
            canViewAnalytics: true
          }
        }
      },
      {
        name: 'Viewer',
        description: 'Read-only access for viewing data and reports',
        isSystem: true,
        permissions: {
          menus: {
            dashboard: { access: true, read: true, write: false },
            devices: { access: true, read: true, write: false },
            'device-groups': { access: true, read: true, write: false },
            mapping: { access: false, read: false, write: false },
            tracking: { access: true, read: true, write: false },
            data: { access: true, read: true, write: false },
            alerts: { access: true, read: true, write: false },
            settings: { access: false, read: false, write: false },
            'user-management': { access: false, read: false, write: false },
            export: { access: true, read: true, write: false },
            'data-sm': { access: true, read: true, write: false },
            demo: { access: true, read: true, write: false }
          },
          modules: {
            devices: { read: true, write: false, delete: false, create: false },
            'device-groups': { read: true, write: false, delete: false, create: false },
            users: { read: false, write: false, delete: false, create: false },
            roles: { read: false, write: false, delete: false, create: false },
            alerts: { read: true, write: false, delete: false, create: false },
            data: { read: true, write: false, delete: false, create: false },
            export: { read: true, write: false, delete: false, create: false }
          },
          deviceAccess: {
            type: 'all',
            groups: [],
            devices: []
          },
          special: {
            canManageUsers: false,
            canManageRoles: false,
            canManageSystem: false,
            canExportData: true,
            canViewAnalytics: true
          }
        }
      }
    ];

    // Create roles
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ where: { name: roleData.name } });
      if (!existingRole) {
        await Role.create({
          ...roleData,
          createdBy: adminUser.id
        });
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`ℹ️ Role already exists: ${roleData.name}`);
      }
    }

    console.log('🎉 Roles initialization completed!');
    console.log('');
    console.log('📋 Available roles:');
    const roles = await Role.findAll({ order: [['name', 'ASC']] });
    roles.forEach(role => {
      console.log(`  - ${role.name} (${role.isSystem ? 'System' : 'Custom'})`);
    });
    
  } catch (error) {
    console.error('❌ Error initializing roles:', error);
  } finally {
    await sequelize.close();
  }
}

initializeRoles(); 