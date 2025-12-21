const { sequelize } = require('./src/models');
const { DeviceGroup, User } = require('./src/models');

async function initializeDeviceGroups() {
  try {
    console.log('🔧 Initializing device groups...');
    
    // Sync the database to ensure all tables exist
    await sequelize.sync({ force: false });
    console.log('✅ Database schema synced');
    
    // Check if we have any users (need at least one to create groups)
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('⚠️  No users found. Please create a user first before creating device groups.');
      return;
    }
    
    // Get the first admin user (or any user if no admin exists)
    const adminUser = await User.findOne({
      where: { role: 'admin' },
      order: [['id', 'ASC']]
    }) || await User.findOne({
      order: [['id', 'ASC']]
    });
    
    if (!adminUser) {
      console.log('⚠️  No users found. Please create a user first.');
      return;
    }
    
    console.log(`👤 Using user: ${adminUser.username} (ID: ${adminUser.id})`);
    
    // Check if default groups already exist
    const existingGroups = await DeviceGroup.findAll({
      where: { isActive: true }
    });
    
    if (existingGroups.length > 0) {
      console.log(`✅ Found ${existingGroups.length} existing device groups`);
      existingGroups.forEach(group => {
        console.log(`   - ${group.name} (${group.devices?.length || 0} devices)`);
      });
      return;
    }
    
    // Create some default device groups
    const defaultGroups = [
      {
        name: 'Fleet Vehicles',
        description: 'Company fleet vehicles and trucks',
        color: '#2196f3',
        createdBy: adminUser.id
      },
      {
        name: 'Personal Devices',
        description: 'Personal tracking devices',
        color: '#4caf50',
        createdBy: adminUser.id
      },
      {
        name: 'Test Devices',
        description: 'Development and testing devices',
        color: '#ff9800',
        createdBy: adminUser.id
      },
      {
        name: 'Warehouse Equipment',
        description: 'Warehouse and logistics equipment',
        color: '#9c27b0',
        createdBy: adminUser.id
      }
    ];
    
    console.log('📝 Creating default device groups...');
    
    for (const groupData of defaultGroups) {
      try {
        const group = await DeviceGroup.create(groupData);
        console.log(`✅ Created group: ${group.name}`);
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`⚠️  Group "${groupData.name}" already exists`);
        } else {
          console.error(`❌ Error creating group "${groupData.name}":`, error.message);
        }
      }
    }
    
    console.log('🎉 Device groups initialization completed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Access the Device Groups page in the web interface');
    console.log('   2. Assign devices to groups as needed');
    console.log('   3. Create additional groups for your specific needs');
    
  } catch (error) {
    console.error('❌ Error initializing device groups:', error);
    process.exit(1);
  }
}

// Run the initialization if this script is executed directly
if (require.main === module) {
  initializeDeviceGroups()
    .then(() => {
      console.log('✅ Device groups initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Device groups initialization failed:', error);
      process.exit(1);
    });
}

module.exports = initializeDeviceGroups; 