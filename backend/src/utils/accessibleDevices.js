'use strict';

const { Device, DeviceGroup, UserDeviceAccess, UserDeviceGroupAccess } = require('../models');

const IMEI_CACHE_TTL_MS = 5 * 60 * 1000;
const imeiCache = new Map();

function getCacheKey(user) {
  return String(user.userId || user.id);
}

function getCachedImeis(userId) {
  const entry = imeiCache.get(userId);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    imeiCache.delete(userId);
    return null;
  }
  return entry.imeis;
}

function setCachedImeis(userId, imeis) {
  imeiCache.set(userId, {
    imeis,
    expiresAt: Date.now() + IMEI_CACHE_TTL_MS
  });
}

function clearAccessibleDeviceCache(userId) {
  if (userId) {
    imeiCache.delete(String(userId));
  } else {
    imeiCache.clear();
  }
}

async function resolveAccessibleDeviceImeis(user, permissionsOverride = null) {
  if (!user) {
    return [];
  }

  if (user.role === 'admin') {
    return null;
  }

  const cacheKey = getCacheKey(user);
  const cached = getCachedImeis(cacheKey);
  if (cached) {
    return cached;
  }

  const permissions = permissionsOverride || user.permissions || {};
  const accessibleDeviceImeis = new Set();

  if (permissions.devices && permissions.devices.length > 0) {
    permissions.devices.forEach((imei) => accessibleDeviceImeis.add(imei));
  }

  if (permissions.deviceGroups && permissions.deviceGroups.length > 0) {
    const deviceGroups = await DeviceGroup.findAll({
      where: { id: permissions.deviceGroups },
      include: ['devices']
    });

    for (const group of deviceGroups) {
      if (group.devices) {
        group.devices.forEach((device) => accessibleDeviceImeis.add(device.imei));
      }
    }
  }

  const userDeviceAccess = await UserDeviceAccess.findAll({
    where: {
      userId: user.userId || user.id,
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
    if (access.device) {
      accessibleDeviceImeis.add(access.device.imei);
    }
  }

  const userGroupAccess = await UserDeviceGroupAccess.findAll({
    where: {
      userId: user.userId || user.id,
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
      access.group.devices.forEach((device) => accessibleDeviceImeis.add(device.imei));
    }
  }

  const imeis = Array.from(accessibleDeviceImeis);
  setCachedImeis(cacheKey, imeis);
  return imeis;
}

function canAccessDeviceImei(accessibleImeis, imei) {
  if (accessibleImeis === null) {
    return true;
  }
  if (!imei) {
    return false;
  }
  return accessibleImeis.includes(imei);
}

module.exports = {
  resolveAccessibleDeviceImeis,
  canAccessDeviceImei,
  clearAccessibleDeviceCache
};
