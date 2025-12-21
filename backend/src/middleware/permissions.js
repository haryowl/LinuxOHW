const { User, DeviceGroup } = require('../models');
const logger = require('../utils/logger');

// Middleware to check if user has access to specific devices
// Middleware to check if user has access to specific devices
async function checkDeviceAccess(req, res, next) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin has access to all devices - NO RESTRICTIONS
        if (user.role === 'admin') {
            return next();
        }

        const deviceId = req.params.deviceId || req.params.id;
        if (!deviceId) {
            return next(); // No specific device requested
        }

        // For non-admin users, check if they have write permission for devices menu
        const hasWritePermission = user.permissions?.menus?.devices?.write === true;
        if (!hasWritePermission) {
            return res.status(403).json({ error: 'Write permission required for device editing' });
        }

        // Get the device to find its IMEI
        const { Device } = require('../models');
        const device = await Device.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const deviceImei = device.imei;

        // Check if user has direct access to this device by IMEI
        const { permissions } = user;
        if (permissions.devices && permissions.devices.includes(deviceImei)) {
            return next();
        }
        
        // Check if user has access through UserDeviceAccess table
        const { UserDeviceAccess } = require('../models');
        const userDeviceAccess = await UserDeviceAccess.findOne({
            where: { 
                userId: user.userId,
                deviceId: deviceId, // Use device ID here, not IMEI
                isActive: true
            }
        });
        
        if (userDeviceAccess) {
            return next();
        }

        // Check if user has access through device groups
        const { UserDeviceGroupAccess } = require('../models');
        const userGroupAccess = await UserDeviceGroupAccess.findAll({
            where: { 
                userId: user.userId,
                isActive: true
            },
            include: [{
                model: DeviceGroup,
                as: 'group',
                include: [{
                    model: Device,
                    as: 'devices',
                    where: { id: deviceId } // Use device ID here
                }]
            }]
        });

        if (userGroupAccess.length > 0) {
            return next();
        }

        // Check if user has access through old device groups
        if (permissions.deviceGroups && permissions.deviceGroups.length > 0) {
            const deviceGroups = await DeviceGroup.findAll({
                where: { id: permissions.deviceGroups },
                include: [{
                    model: Device,
                    as: 'devices',
                    where: { id: deviceId } // Use device ID here
                }]
            });

            if (deviceGroups.length > 0) {
                return next();
            }
        }

        return res.status(403).json({ error: 'Access denied to this device' });
    } catch (error) {
        logger.error('Permission check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Middleware to filter devices based on user permissions
async function filterDevicesByPermission(req, res, next) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin can see all devices
        if (user.role === 'admin') {
            return next();
        }

        // Store user permissions in request for later use
        req.userPermissions = user.permissions;
        return next();
    } catch (error) {
        logger.error('Permission filter error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

// Middleware to check menu access
function checkMenuAccess(menuName) {
    return (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Admin has access to all menus
            if (user.role === 'admin') {
                return next();
            }

            // Check if user has access to this menu
            const { permissions } = user;
            if (!permissions || !permissions.menus) {
                return res.status(403).json({ error: 'No menu permissions' });
            }

            if (!permissions.menus.includes(menuName.toLowerCase())) {
                return res.status(403).json({ error: 'Access denied to this menu' });
            }

            return next();
        } catch (error) {
            logger.error('Menu access check error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
}

module.exports = {
    checkDeviceAccess,
    filterDevicesByPermission,
    checkMenuAccess
}; 