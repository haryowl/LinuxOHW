// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { Record, Device, DeviceGroup } = require('../models');
const { Op } = require('sequelize');
const { requireAuth } = require('./auth');
const { filterDevicesByPermission } = require('../middleware/permissions');

// Get dashboard statistics - WITH USER PERMISSIONS
router.get('/stats', requireAuth, filterDevicesByPermission, async (req, res) => {
    try {
        const requestStart = Date.now();
        console.log('🚀 GET /api/dashboard/stats - Starting request for user:', req.user.username);
        
        // Get accessible devices for this user
        let accessibleDeviceImeis = [];
        
        if (req.user.role === 'admin') {
            console.log('👑 Admin user - getting all device stats');
            const allDevices = await Device.findAll({ attributes: ['imei'] });
            accessibleDeviceImeis = allDevices.map(device => device.imei);
        } else {
            console.log('👤 Non-admin user - filtering stats by permissions');
            
            // Get devices from permissions
            if (req.userPermissions.devices && req.userPermissions.devices.length > 0) {
                accessibleDeviceImeis.push(...req.userPermissions.devices);
            }
            
            // Get devices from device groups
            if (req.userPermissions.deviceGroups && req.userPermissions.deviceGroups.length > 0) {
                const deviceGroups = await DeviceGroup.findAll({
                    where: { id: req.userPermissions.deviceGroups },
                    include: ['devices']
                });
                
                for (const group of deviceGroups) {
                    if (group.devices) {
                        accessibleDeviceImeis.push(...group.devices.map(device => device.imei));
                    }
                }
            }
            
            // Get devices from UserDeviceAccess table
            const { UserDeviceAccess } = require('../models');
            const userDeviceAccess = await UserDeviceAccess.findAll({
                where: { 
                    userId: req.user.userId,
                    isActive: true
                },
                include: [
                    {
                        model: Device,
                        as: 'device',
                        attributes: ['imei']
                    }
                ]
            });
            
            for (const access of userDeviceAccess) {
                if (access.device && !accessibleDeviceImeis.includes(access.device.imei)) {
                    accessibleDeviceImeis.push(access.device.imei);
                }
            }
            
            // Get devices from UserDeviceGroupAccess table
            const { UserDeviceGroupAccess } = require('../models');
            const userGroupAccess = await UserDeviceGroupAccess.findAll({
                where: { 
                    userId: req.user.userId,
                    isActive: true
                },
                include: [
                    {
                        model: DeviceGroup,
                        as: 'group',
                        include: ['devices']
                    }
                ]
            });
            
            for (const access of userGroupAccess) {
                if (access.group && access.group.devices) {
                    for (const device of access.group.devices) {
                        if (!accessibleDeviceImeis.includes(device.imei)) {
                            accessibleDeviceImeis.push(device.imei);
                        }
                    }
                }
            }
            
            // Remove duplicates
            accessibleDeviceImeis = [...new Set(accessibleDeviceImeis)];
        }
        
        console.log(`🔍 User has access to ${accessibleDeviceImeis.length} devices`);
        
        // Build where conditions for accessible devices
        const deviceFilter = accessibleDeviceImeis.length > 0 ? {
            deviceImei: { [Op.in]: accessibleDeviceImeis }
        } : { deviceImei: { [Op.in]: [] } }; // No devices accessible
        
        const imeiFilter = accessibleDeviceImeis.length > 0 ? {
            imei: { [Op.in]: accessibleDeviceImeis }
        } : { imei: { [Op.in]: [] } }; // No devices accessible
        
        // Get basic stats with optimized queries - FILTERED BY USER PERMISSIONS
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        // Parallel queries for better performance - ALL FILTERED BY ACCESSIBLE DEVICES
        const [
            totalDevices,
            totalRecords,
            recentRecords,
            activeDevices
        ] = await Promise.all([
            // Total accessible devices
            Device.count({ where: imeiFilter }),
            
            // Total records from accessible devices
            Record.count({ where: deviceFilter }),
            
            // Recent records (last hour) from accessible devices
            Record.count({
                where: {
                    ...deviceFilter,
                    datetime: { [Op.gte]: oneHourAgo }
                }
            }),
            
            // Active devices (devices with records in last hour) from accessible devices
            Record.count({
                where: {
                    ...deviceFilter,
                    datetime: { [Op.gte]: oneHourAgo }
                },
                distinct: true,
                col: 'deviceImei'
            })
        ]);
        
        const totalTime = Date.now() - requestStart;
        console.log(`✅ Dashboard stats completed in ${totalTime}ms - User: ${req.user.username}`);
        console.log(`📊 Stats: ${totalDevices} devices, ${totalRecords} records, ${activeDevices} active`);
        
        const stats = {
            totalDevices,
            totalRecords,
            recentRecords,
            activeDevices,
            lastUpdate: now
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch dashboard stats',
            details: error.message 
        });
    }
});

module.exports = router;