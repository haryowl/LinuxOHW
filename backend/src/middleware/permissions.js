const { User, DeviceGroup } = require('../models');
const logger = require('../utils/logger');
const { resolveAccessibleDeviceImeis } = require('../utils/accessibleDevices');

function userHasMenuAccess(user, menuName) {
    if (!user) {
        return false;
    }
    if (user.role === 'admin') {
        return true;
    }

    const permissions = user.permissions;
    if (!permissions) {
        return false;
    }

    const menu = menuName.toLowerCase();

    if (Array.isArray(permissions.menus)) {
        return permissions.menus.includes(menu);
    }

    if (permissions.menus && typeof permissions.menus === 'object') {
        const entry = permissions.menus[menu];
        return Boolean(entry?.read || entry?.write || entry === true);
    }

    if (Array.isArray(permissions)) {
        return permissions.includes(menu);
    }

    return false;
}

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    return next();
}

async function checkDeviceAccess(req, res, next) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (user.role === 'admin') {
            return next();
        }

        const deviceId = req.params.deviceId || req.params.id;
        if (!deviceId) {
            return next();
        }

        const hasWritePermission = user.permissions?.menus?.devices?.write === true;
        if (!hasWritePermission) {
            return res.status(403).json({ error: 'Write permission required for device editing' });
        }

        const { Device } = require('../models');
        const device = await Device.findByPk(deviceId);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        const deviceImei = device.imei;
        const { permissions } = user;
        if (permissions.devices && permissions.devices.includes(deviceImei)) {
            return next();
        }

        const { UserDeviceAccess } = require('../models');
        const userDeviceAccess = await UserDeviceAccess.findOne({
            where: {
                userId: user.userId,
                deviceId: deviceId,
                isActive: true
            }
        });

        if (userDeviceAccess) {
            return next();
        }

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
                    where: { id: deviceId }
                }]
            }]
        });

        if (userGroupAccess.length > 0) {
            return next();
        }

        if (permissions.deviceGroups && permissions.deviceGroups.length > 0) {
            const deviceGroups = await DeviceGroup.findAll({
                where: { id: permissions.deviceGroups },
                include: [{
                    model: Device,
                    as: 'devices',
                    where: { id: deviceId }
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

async function filterDevicesByPermission(req, res, next) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        req.userPermissions = user.permissions || {};

        if (user.role === 'admin') {
            req.accessibleDeviceImeis = null;
            return next();
        }

        req.accessibleDeviceImeis = await resolveAccessibleDeviceImeis(user, req.userPermissions);
        return next();
    } catch (error) {
        logger.error('Permission filter error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

function checkMenuAccess(menuName) {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (!userHasMenuAccess(req.user, menuName)) {
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
    checkMenuAccess,
    requireAdmin,
    userHasMenuAccess
};
