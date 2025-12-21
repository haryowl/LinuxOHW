const express = require('express');
const router = express.Router();
const { User, Device, DeviceGroup, UserDeviceAccess, sequelize } = require('../models');
const { Op } = require('sequelize');
const { requireAuth } = require('./auth');
const logger = require('../utils/logger');

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is admin or manager
const requireManager = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
};

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: UserDeviceAccess,
          as: 'deviceAccess',
          include: [
            {
              model: Device,
              as: 'device',
              attributes: ['id', 'imei', 'name', 'description', 'groupId'],
              include: [
                {
                  model: DeviceGroup,
                  as: 'group',
                  attributes: ['id', 'name', 'color']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user must change password
    const mustChangePassword = !user.passwordChangedAt;
    const userData = user.toJSON();
    userData.mustChangePassword = mustChangePassword;
    
    res.json(userData);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password endpoint (for users who must change password or want to change it)
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }
    
    // Enhanced password validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    const strengthChecks = {
      length: newPassword.length >= 8,
      uppercase: hasUpperCase,
      lowercase: hasLowerCase,
      numbers: hasNumbers,
      special: hasSpecialChar
    };
    
    // Require at least 3 out of 5 strength criteria
    const strengthScore = Object.values(strengthChecks).filter(Boolean).length;
    if (strengthScore < 3) {
      return res.status(400).json({ 
        error: 'Password must meet at least 3 of the following: 8+ characters, uppercase letter, lowercase letter, number, special character',
        requirements: strengthChecks
      });
    }
    
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // If user must change password, current password is not required
    // Otherwise, verify current password
    const mustChangePassword = !user.passwordChangedAt;
    if (!mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      
      const isValidPassword = await user.comparePassword(currentPassword);
      if (!isValidPassword) {
        logger.warn('Password change failed - invalid current password', { userId: user.id });
        return res.status(401).json({ error: 'Invalid current password' });
      }
    }
    
    // Update password (will trigger beforeUpdate hook to hash it)
    await user.update({ password: newPassword });
    
    logger.info('Password changed successfully', { userId: user.id, username: user.username });
    
    res.json({ message: 'Password changed successfully', mustChangePassword: false });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      permissions
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'viewer',
      permissions: permissions || {
        menus: ['dashboard'],
        devices: [],
        deviceGroups: []
      }
    });

    // Return user without password
    const userData = user.toJSON();
    delete userData.password;

    logger.info('User created successfully', { username: user.username, createdBy: req.user.userId });
    res.status(201).json(userData);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin or self)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const isSelf = req.user.userId === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = { ...req.body };
    
    // Only admins can change role and permissions
    if (!isAdmin) {
      delete updateData.role;
      delete updateData.permissions;
    }

    // Filter out empty strings and undefined values to avoid validation errors
    const filteredUpdateData = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined && value !== null && value !== '') {
        filteredUpdateData[key] = value;
      }
    }

    // Only update if there are fields to update
    if (Object.keys(filteredUpdateData).length > 0) {
      await user.update(filteredUpdateData);
    }

    // Return user without password
    const userData = user.toJSON();
    delete userData.password;

    logger.info('User updated successfully', { userId, updatedBy: req.user.userId });
    res.json(userData);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting self
    if (req.user.userId === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserDeviceAccess,
          as: 'deviceAccess'
        },
        {
          model: DeviceGroup,
          as: 'createdGroups',
          include: [
            {
              model: Device,
              as: 'devices'
            }
          ]
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Start a transaction to ensure data consistency
    const transaction = await sequelize.transaction();

    try {
      // Get all models
      const { FieldMapping, Record, Device, Alert, AlertRule } = require('../models');
      
      // 1. Delete all UserDeviceAccess records where this user is the user or grantedBy
      await UserDeviceAccess.destroy({
        where: { 
                  [Op.or]: [
          { userId },
          { grantedBy: userId }
        ]
        },
        transaction
      });

      // 2. Delete all device groups created by this user and their related data
      const userGroups = await DeviceGroup.findAll({
        where: { createdBy: userId },
        include: [
          {
            model: Device,
            as: 'devices'
          }
        ],
        transaction
      });

      for (const group of userGroups) {
        if (group.devices && group.devices.length > 0) {
          for (const device of group.devices) {
            // Delete all records for this device
            await Record.destroy({ 
              where: { deviceImei: device.imei }, 
              transaction 
            });
            
            // Delete all field mappings for this device
            await FieldMapping.destroy({ 
              where: { deviceId: device.id }, 
              transaction 
            });
            
            // Delete all alerts for this device
            await Alert.destroy({ 
              where: { deviceId: device.imei }, 
              transaction 
            });
            
            // Delete all user device access for this device
            await UserDeviceAccess.destroy({ 
              where: { deviceId: device.id }, 
              transaction 
            });
            
            // Delete the device itself
            await Device.destroy({ 
              where: { id: device.id }, 
              transaction 
            });
          }
        }
        
        // Delete the device group
        await DeviceGroup.destroy({ 
          where: { id: group.id }, 
          transaction 
        });
      }

      // 3. Delete any remaining device access records for this user
      await UserDeviceAccess.destroy({
        where: { userId },
        transaction
      });

      // 4. Delete any remaining device access records granted by this user
      await UserDeviceAccess.destroy({
        where: { grantedBy: userId },
        transaction
      });

      // 5. Finally delete the user
      await user.destroy({ transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      logger.info('User deleted successfully', { userId, deletedBy: req.user.userId });
      res.json({ message: 'User deleted successfully' });
    } catch (transactionError) {
      // Rollback the transaction on error
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get user's accessible devices
router.get('/:id/devices', requireAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const isSelf = req.user.userId === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findByPk(userId, {
      include: [
        {
          model: UserDeviceAccess,
          as: 'deviceAccess',
          where: { isActive: true },
          include: [
            {
              model: Device,
              as: 'device'
            }
          ]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.deviceAccess);
  } catch (error) {
    logger.error('Error fetching user devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant device access to user (admin/manager only)
router.post('/:id/devices', requireAuth, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { deviceId, accessLevel, expiresAt } = req.body;

    if (!deviceId || !accessLevel) {
      return res.status(400).json({ error: 'Device ID and access level are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const device = await Device.findByPk(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Check if access already exists
    const existingAccess = await UserDeviceAccess.findOne({
      where: { userId, deviceId }
    });

    if (existingAccess) {
      // Update existing access
      await existingAccess.update({
        accessLevel,
        expiresAt,
        isActive: true
      });
    } else {
      // Create new access
      await UserDeviceAccess.create({
        userId,
        deviceId,
        accessLevel,
        grantedBy: req.user.userId,
        expiresAt
      });
    }

    // Update user permissions to include the device
    const currentPermissions = user.permissions || { menus: [], devices: [], deviceGroups: [] };
    if (!currentPermissions.devices.includes(device.imei)) {
      currentPermissions.devices.push(device.imei);
      await user.update({ permissions: currentPermissions });
    }

    logger.info('Device access granted', { userId, deviceId, grantedBy: req.user.userId });
    res.json({ message: 'Device access granted successfully' });
  } catch (error) {
    logger.error('Error granting device access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke device access (admin/manager only)
router.delete('/:id/devices/:deviceId', requireAuth, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const deviceId = parseInt(req.params.deviceId);

    const access = await UserDeviceAccess.findOne({
      where: { userId, deviceId }
    });

    if (!access) {
      return res.status(404).json({ error: 'Device access not found' });
    }

    await access.update({ isActive: false });
    
    // Update user permissions to remove the device
    const currentPermissions = user.permissions || { menus: [], devices: [], deviceGroups: [] };
    const device = await Device.findByPk(deviceId);
    if (device && currentPermissions.devices.includes(device.imei)) {
      currentPermissions.devices = currentPermissions.devices.filter(d => d !== device.imei);
      await user.update({ permissions: currentPermissions });
    }
    
    logger.info('Device access revoked', { userId, deviceId, revokedBy: req.user.userId });
    res.json({ message: 'Device access revoked successfully' });
  } catch (error) {
    logger.error('Error revoking device access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant device group access to user (admin/manager only)
router.post('/:id/device-groups', requireAuth, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { groupId, accessLevel, expiresAt } = req.body;

    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const group = await DeviceGroup.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Device group not found' });
    }

    // Get all devices in the group
    const devices = await Device.findAll({
      where: { groupId }
    });

    if (devices.length === 0) {
      return res.status(400).json({ error: 'Device group has no devices' });
    }

    // Grant access to all devices in the group
    const accessPromises = devices.map(async device => {
      // Check if access already exists
      const existingAccess = await UserDeviceAccess.findOne({
        where: { userId, deviceId: device.id }
      });

      if (existingAccess) {
        // Update existing access
        return existingAccess.update({
          accessLevel: accessLevel || 'read',
          expiresAt: expiresAt || null,
          isActive: true
        });
      } else {
        // Create new access
        return UserDeviceAccess.create({
          userId,
          deviceId: device.id,
          accessLevel: accessLevel || 'read',
          expiresAt: expiresAt || null,
          grantedBy: req.user.userId
        });
      }
    });

    await Promise.all(accessPromises);

    // Update user permissions to include the device group
    const currentPermissions = user.permissions || { menus: [], devices: [], deviceGroups: [] };
    if (!currentPermissions.deviceGroups.includes(groupId)) {
      currentPermissions.deviceGroups.push(groupId);
      await user.update({ permissions: currentPermissions });
    }

    logger.info('Device group access granted successfully', { 
      userId, 
      groupId, 
      deviceCount: devices.length, 
      grantedBy: req.user.userId 
    });
    
    res.json({ 
      message: `Access granted to ${devices.length} devices in group "${group.name}"`,
      deviceCount: devices.length
    });
  } catch (error) {
    logger.error('Error granting device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke device group access (admin/manager only)
router.delete('/:id/device-groups/:groupId', requireAuth, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const groupId = parseInt(req.params.groupId);

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const group = await DeviceGroup.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Device group not found' });
    }

    // Get all devices in the group
    const devices = await Device.findAll({
      where: { groupId }
    });

    // Revoke access to all devices in the group
    const accessPromises = devices.map(async device => {
      const access = await UserDeviceAccess.findOne({
        where: { userId, deviceId: device.id }
      });

      if (access) {
        return access.update({ isActive: false });
      }
    });

    await Promise.all(accessPromises);

    // Update user permissions to remove the device group
    const currentPermissions = user.permissions || { menus: [], devices: [], deviceGroups: [] };
    if (currentPermissions.deviceGroups.includes(groupId)) {
      currentPermissions.deviceGroups = currentPermissions.deviceGroups.filter(g => g !== groupId);
      await user.update({ permissions: currentPermissions });
    }

    logger.info('Device group access revoked successfully', { 
      userId, 
      groupId, 
      deviceCount: devices.length, 
      revokedBy: req.user.userId 
    });
    
    res.json({ 
      message: `Access revoked from ${devices.length} devices in group "${group.name}"`,
      deviceCount: devices.length
    });
  } catch (error) {
    logger.error('Error revoking device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 