// backend/src/routes/data.js
const express = require('express');
const router = express.Router();
const asyncHandler = require('../utils/asyncHandler'); // Import your async error handler
const dataAggregator = require('../services/dataAggregator'); // Import your data service
const { Record, Device, DeviceGroup } = require('../models');
const { Op } = require('sequelize');
const { requireAuth } = require('./auth');
const { checkDeviceAccess, filterDevicesByPermission } = require('../middleware/permissions');
const { getAvailableColumns, columnSets } = require('../utils/columnHelper');
//const { Device, DeviceGroup } = require('../models');

// Get device data (with permission check)
router.get('/:deviceId', requireAuth, checkDeviceAccess, asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const data = await dataAggregator.getDeviceData(deviceId); // Call your data service
    res.json(data);
}));

// Get tracking data for a device (using device datetime for filtering)
router.get('/:deviceId/tracking', requireAuth, checkDeviceAccess, asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
        deviceImei: deviceId,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
    };
    
    if (startDate && endDate) {
        // Use device datetime field for filtering instead of server timestamp
        where.datetime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    // Get available columns for tracking data
    const availableColumns = getAvailableColumns(columnSets.tracking, Record);
    
    const trackingData = await Record.findAll({
        where,
        attributes: availableColumns,
        order: [['datetime', 'ASC']] // Order by device datetime instead of server timestamp
    });
    
    res.json(trackingData);
}));

// Get export data for a device (using device datetime for filtering)
router.get('/:deviceId/export', requireAuth, checkDeviceAccess, asyncHandler(async (req, res) => {
    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;
    
    const where = {
        deviceImei: deviceId
    };
    
    if (startDate && endDate) {
        // Use device datetime field for filtering instead of server timestamp
        where.datetime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    // Get available columns for export data
    const availableColumns = getAvailableColumns(columnSets.export, Record);
    
    const exportData = await Record.findAll({
        where,
        attributes: availableColumns,
        order: [['datetime', 'ASC']] // Order by device datetime instead of server timestamp
    });
    
    res.json(exportData);
}));

// Get tracking data for a device by IMEI (for Multi Tracking)
router.get('/imei/:deviceImei/tracking', requireAuth, asyncHandler(async (req, res) => {
    const { deviceImei } = req.params;
    const { startDate, endDate } = req.query;
    
    console.log('🚀 GET /api/data/imei/:deviceImei/tracking - Device:', deviceImei);
    console.log('👤 User:', req.user.username, 'Role:', req.user.role);
    
    // Check if user has access to this device (read permission only)
    if (req.user.role !== 'admin') {
        console.log('🔍 Checking device access for non-admin user...');
        
        // Check if user has read permission for devices menu
        const hasReadPermission = req.user.permissions?.menus?.devices?.read === true;
        if (!hasReadPermission) {
            console.log('❌ User does not have devices read permission');
            return res.status(403).json({ error: 'Read permission required for device data' });
        }
        
        // Check if user has access to this specific device
        const { Device, UserDeviceAccess, UserDeviceGroupAccess, DeviceGroup } = require('../models');
        
        // Get device by IMEI
        const device = await Device.findOne({ where: { imei: deviceImei } });
        if (!device) {
            console.log('❌ Device not found:', deviceImei);
            return res.status(404).json({ error: 'Device not found' });
        }
        
        // Check direct device access
        const hasDirectAccess = req.user.permissions?.devices?.includes(deviceImei);
        if (hasDirectAccess) {
            console.log('✅ Direct device access confirmed');
        } else {
            // Check UserDeviceAccess table
            const userDeviceAccess = await UserDeviceAccess.findOne({
                where: { 
                    userId: req.user.userId,
                    deviceId: device.id,
                    isActive: true
                }
            });
            
            if (userDeviceAccess) {
                console.log('✅ UserDeviceAccess confirmed');
            } else {
                // Check UserDeviceGroupAccess table
                const userGroupAccess = await UserDeviceGroupAccess.findAll({
                    where: { 
                        userId: req.user.userId,
                        isActive: true
                    },
                    include: [{
                        model: DeviceGroup,
                        as: 'group',
                        include: [{
                            model: Device,
                            as: 'devices',
                            where: { id: device.id }
                        }]
                    }]
                });
                
                if (userGroupAccess.length > 0) {
                    console.log('✅ UserDeviceGroupAccess confirmed');
                } else {
                    console.log('❌ No access to device:', deviceImei);
                    return res.status(403).json({ error: 'Access denied to this device' });
                }
            }
        }
    }
    
    const where = {
        deviceImei: deviceImei,
        latitude: { [Op.ne]: null },
        longitude: { [Op.ne]: null }
    };
    
    if (startDate && endDate) {
        where.datetime = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    
    console.log('📊 Fetching tracking data for device:', deviceImei);
    console.log('📅 Date range:', startDate, 'to', endDate);
    
    const trackingData = await Record.findAll({
        where,
        attributes: [
            'deviceImei',
            'latitude',
            'longitude',
            'datetime',
            'speed',
            'direction',
            'altitude',
            'satellites',
            'hdop'
        ],
        order: [['datetime', 'ASC']]
    });
    
    console.log(`✅ Found ${trackingData.length} tracking points for device ${deviceImei}`);
    res.json(trackingData);
}));

// Get dashboard data (filtered by user permissions)
router.get('/dashboard', requireAuth, filterDevicesByPermission, asyncHandler(async (req, res) => {
    let accessibleDevices = [];
    console.log('🚀 GET /api/data/dashboard - Starting request for user:', req.user.username);
    console.log('👤 User role:', req.user.role);
    console.log('🔍 User permissions:', req.userPermissions);
    // If admin, get all devices
    if (req.user.role === 'admin') {
        const allDevices = await Device.findAll();
        accessibleDevices = allDevices.map(device => device.imei);
    } else {
        // Filter devices based on user permissions
        const { userPermissions } = req;
        
        // Get devices from direct access (both permissions and UserDeviceAccess table)
        const directDeviceImeis = [];
        
        // From permissions.devices
        if (userPermissions.devices && userPermissions.devices.length > 0) {
            directDeviceImeis.push(...userPermissions.devices);
        }
        
        // From UserDeviceAccess table
        const { UserDeviceAccess } = require('../models');
        const userDeviceAccess = await UserDeviceAccess.findAll({
            where: { 
                userId: req.user.userId,
                isActive: true
            },
            include: [
                {
                    model: Device,
                    as: 'device'
                }
            ]
        });
        
        for (const access of userDeviceAccess) {
            if (access.device && !directDeviceImeis.includes(access.device.imei)) {
                directDeviceImeis.push(access.device.imei);
            }
        }
        
        accessibleDevices.push(...directDeviceImeis);
        
        // Get devices from device groups
        if (userPermissions.deviceGroups && userPermissions.deviceGroups.length > 0) {
            const deviceGroups = await DeviceGroup.findAll({
                where: { id: userPermissions.deviceGroups },
                include: ['devices']
            });
            
            for (const group of deviceGroups) {
                if (group.devices) {
                    accessibleDevices.push(...group.devices.map(device => device.imei));
                }
            }
        }
        
        // Remove duplicates
        accessibleDevices = [...new Set(accessibleDevices)];
    }
    
    // Get stats and realtime data for accessible devices only
    const stats = await dataAggregator.getDashboardData(accessibleDevices);
    const realtimeData = await dataAggregator.getRealtimeData(accessibleDevices);
    console.log(`🔍 User has access to ${accessibleDevices.length} devices:`, accessibleDevices);
    console.log('📊 Dashboard data generated for accessible devices only');
    res.json({ stats, realtimeData });
}));

module.exports = router;
