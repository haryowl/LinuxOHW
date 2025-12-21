const express = require('express');
const router = express.Router();
const { UserDeviceGroupAccess, User, DeviceGroup } = require('../models');
const { requireAuth } = require('./auth');
const logger = require('../utils/logger');

// Middleware to check if user is admin or manager
const requireManager = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
};

// Get all user device group access records
router.get('/', requireAuth, requireManager, async (req, res) => {
  try {
    const accessRecords = await UserDeviceGroupAccess.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: DeviceGroup,
          as: 'group',
          attributes: ['id', 'name', 'color', 'description']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(accessRecords);
  } catch (error) {
    logger.error('Error fetching user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access records for a specific user
router.get('/user/:userId', requireAuth, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    const accessRecords = await UserDeviceGroupAccess.findAll({
      where: { 
        userId,
        isActive: true 
      },
      include: [
        {
          model: DeviceGroup,
          as: 'group',
          attributes: ['id', 'name', 'color', 'description']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(accessRecords);
  } catch (error) {
    logger.error('Error fetching user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get access records for a specific device group
router.get('/group/:groupId', requireAuth, requireManager, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    
    const accessRecords = await UserDeviceGroupAccess.findAll({
      where: { 
        groupId,
        isActive: true 
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(accessRecords);
  } catch (error) {
    logger.error('Error fetching device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant access to a device group for a user
router.post('/', requireAuth, requireManager, async (req, res) => {
  try {
    const { userId, groupId, accessLevel, expiresAt, notes } = req.body;

    if (!userId || !groupId) {
      return res.status(400).json({ error: 'User ID and Group ID are required' });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if group exists
    const group = await DeviceGroup.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Device group not found' });
    }

    // Check if access already exists
    const existingAccess = await UserDeviceGroupAccess.findOne({
      where: { userId, groupId, isActive: true }
    });

    if (existingAccess) {
      return res.status(400).json({ error: 'User already has access to this device group' });
    }

    // Create access record
    const accessRecord = await UserDeviceGroupAccess.create({
      userId,
      groupId,
      accessLevel: accessLevel || 'read',
      grantedBy: req.user.userId,
      expiresAt: expiresAt || null,
      notes: notes || null
    });

    // Clear device cache for the user whose access was granted
    const devicesModule = require('./devices');
    devicesModule.clearUserDeviceCache(userId);

    // Return the created record with associations
    const createdRecord = await UserDeviceGroupAccess.findByPk(accessRecord.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: DeviceGroup,
          as: 'group',
          attributes: ['id', 'name', 'color', 'description']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    logger.info('User device group access granted', { 
      userId, 
      groupId, 
      accessLevel, 
      grantedBy: req.user.userId 
    });
    
    res.status(201).json(createdRecord);
  } catch (error) {
    logger.error('Error granting user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update access level for a user's device group access
router.put('/:id', requireAuth, requireManager, async (req, res) => {
  try {
    const accessId = parseInt(req.params.id);
    const { accessLevel, expiresAt, notes } = req.body;

    const accessRecord = await UserDeviceGroupAccess.findByPk(accessId);
    if (!accessRecord) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    // Update the access record
    await accessRecord.update({
      accessLevel: accessLevel || accessRecord.accessLevel,
      expiresAt: expiresAt !== undefined ? expiresAt : accessRecord.expiresAt,
      notes: notes !== undefined ? notes : accessRecord.notes
    });

    // Clear device cache for the user whose access was modified
    const devicesModule = require('./devices');
    devicesModule.clearUserDeviceCache(accessRecord.userId);

    // Return the updated record with associations
    const updatedRecord = await UserDeviceGroupAccess.findByPk(accessId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: DeviceGroup,
          as: 'group',
          attributes: ['id', 'name', 'color', 'description']
        },
        {
          model: User,
          as: 'grantedByUser',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });

    logger.info('User device group access updated', { 
      accessId, 
      updatedBy: req.user.userId 
    });
    
    res.json(updatedRecord);
  } catch (error) {
    logger.error('Error updating user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke access to a device group for a user
router.delete('/:id', requireAuth, requireManager, async (req, res) => {
  try {
    const accessId = parseInt(req.params.id);

    const accessRecord = await UserDeviceGroupAccess.findByPk(accessId);
    if (!accessRecord) {
      return res.status(404).json({ error: 'Access record not found' });
    }

    // Soft delete by setting isActive to false
    await accessRecord.update({ isActive: false });

    // Clear device cache for the user whose access was revoked
    const devicesModule = require('./devices');
    devicesModule.clearUserDeviceCache(accessRecord.userId);

    logger.info('User device group access revoked', { 
      accessId, 
      userId: accessRecord.userId,
      revokedBy: req.user.userId 
    });
    
    res.json({ message: 'Access revoked successfully' });
  } catch (error) {
    logger.error('Error revoking user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk grant access to multiple users for a device group
router.post('/bulk', requireAuth, requireManager, async (req, res) => {
  try {
    const { groupId, userIds, accessLevel, expiresAt, notes } = req.body;

    if (!groupId || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'Group ID and array of User IDs are required' });
    }

    // Check if group exists
    const group = await DeviceGroup.findByPk(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Device group not found' });
    }

    const results = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        // Check if user exists
        const user = await User.findByPk(userId);
        if (!user) {
          errors.push({ userId, error: 'User not found' });
          continue;
        }

        // Check if access already exists
        const existingAccess = await UserDeviceGroupAccess.findOne({
          where: { userId, groupId, isActive: true }
        });

        if (existingAccess) {
          errors.push({ userId, error: 'User already has access to this group' });
          continue;
        }

        // Create access record
        const accessRecord = await UserDeviceGroupAccess.create({
          userId,
          groupId,
          accessLevel: accessLevel || 'read',
          grantedBy: req.user.userId,
          expiresAt: expiresAt || null,
          notes: notes || null
        });

        results.push({ userId, success: true, accessId: accessRecord.id });
      } catch (error) {
        errors.push({ userId, error: error.message });
      }
    }

    // Clear device cache for all users whose access was granted
    const devicesModule = require('./devices');
    for (const result of results) {
      if (result.success) {
        devicesModule.clearUserDeviceCache(result.userId);
      }
    }

    logger.info('Bulk user device group access granted', { 
      groupId, 
      grantedBy: req.user.userId,
      successCount: results.length,
      errorCount: errors.length
    });
    
    res.json({ 
      message: 'Bulk access operation completed',
      results,
      errors
    });
  } catch (error) {
    logger.error('Error in bulk user device group access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 