// backend/src/services/dataAggregator.js

const { Record, Device } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getAvailableColumns, columnSets } = require('../utils/columnHelper');

class DataAggregator {
    async getDeviceData(deviceId) {
        try {
            // Get available columns for device data
            const availableColumns = getAvailableColumns(columnSets.deviceData, Record);
            
            const records = await Record.findAll({
                where: {
                    deviceImei: deviceId
                },
                order: [['timestamp', 'DESC']],
                limit: 100,
                attributes: availableColumns
            });

            return records;
        } catch (error) {
            logger.error('Error getting device data:', error);
            throw error;
        }
    }

    async getRealtimeData(deviceIds = null) {
        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

            const where = {
                timestamp: {
                    [Op.gte]: fiveMinutesAgo
                }
            };

            // Filter by device IDs if provided
            if (deviceIds && deviceIds.length > 0) {
                where.deviceImei = {
                    [Op.in]: deviceIds
                };
            }

            const recentRecords = await Record.findAll({
                where,
                order: [['timestamp', 'DESC']],
                limit: 50,
                include: [{
                    model: Device,
                    as: 'device',
                    attributes: ['imei', 'name', 'status']
                }]
            });

            return recentRecords;
        } catch (error) {
            logger.error('Error getting realtime data:', error);
            throw error;
        }
    }

    async getDeviceStatistics(deviceId, timeRange) {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate - timeRange);

            const data = await Record.findAll({
                where: {
                    deviceImei: deviceId,
                    timestamp: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                order: [['timestamp', 'ASC']]
            });

            return this.calculateStatistics(data);
        } catch (error) {
            logger.error('Error getting device statistics:', error);
            throw error;
        }
    }

    async getDashboardData(deviceIds = null, range = '24h', customStart = null, customEnd = null) {
        try {
            const now = new Date();
            const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

            // Base where conditions
            const deviceWhere = {};
            const recordWhere = {};

            // Filter by device IDs if provided
            if (deviceIds && deviceIds.length > 0) {
                deviceWhere.imei = {
                    [Op.in]: deviceIds
                };
                recordWhere.deviceImei = {
                    [Op.in]: deviceIds
                };
            }

            // Helper to build record where for time range
            const buildRecordWhere = (base, start, end) => {
                const where = { ...base };
                if (start && end) {
                    where.timestamp = { [Op.between]: [start, end] };
                }
                return where;
            };

            // All time stats
            const allTimeStats = {
                totalDevices: await Device.count({ where: deviceWhere }),
                totalRecords: await Record.count({ where: recordWhere }),
            };

            // Last 24h stats
            const last24hStats = {
                totalDevices: allTimeStats.totalDevices, // Devices list doesn't change
                totalRecords: await Record.count({ where: buildRecordWhere(recordWhere, dayAgo, now) }),
            };

            // Custom range stats (if requested)
            let customStats = null;
            if (range === 'custom' && customStart && customEnd) {
                customStats = {
                    totalDevices: allTimeStats.totalDevices,
                    totalRecords: await Record.count({ where: buildRecordWhere(recordWhere, customStart, customEnd) }),
                };
            }

            // Active devices (last 24h)
            const activeDevices = await Device.count({
                where: {
                    ...deviceWhere,
                    status: 'active',
                    lastSeen: {
                        [Op.gt]: dayAgo
                    }
                }
            });

            return {
                allTime: {
                    ...allTimeStats,
                    activeDevices,
                    lastUpdate: now.toISOString(),
                },
                last24h: {
                    ...last24hStats,
                    activeDevices,
                    lastUpdate: now.toISOString(),
                },
                custom: customStats,
            };
        } catch (error) {
            logger.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    calculateStatistics(data) {
        const stats = {
            totalPoints: data.length,
            averageSpeed: 0,
            maxSpeed: 0,
            distanceTraveled: 0,
            fuelConsumption: 0,
            engineHours: 0,
            alerts: 0
        };

        let prevPoint = null;
        data.forEach(point => {
            // Update statistics based on point data
            if (point.speed) {
                stats.averageSpeed += point.speed;
                stats.maxSpeed = Math.max(stats.maxSpeed, point.speed);
            }

            if (prevPoint && point.latitude && point.longitude && prevPoint.latitude && prevPoint.longitude) {
                // Calculate distance between points
                const distance = this.calculateDistance(
                    { latitude: prevPoint.latitude, longitude: prevPoint.longitude },
                    { latitude: point.latitude, longitude: point.longitude }
                );
                stats.distanceTraveled += distance;
            }

            prevPoint = point;
        });

        stats.averageSpeed /= data.length || 1;
        return stats;
    }

    calculateDistance(point1, point2) {
        if (!point1 || !point2) return 0;

        const R = 6371; // Earth's radius in km
        const dLat = this.toRad(point2.latitude - point1.latitude);
        const dLon = this.toRad(point2.longitude - point1.longitude);
        const lat1 = this.toRad(point1.latitude);
        const lat2 = this.toRad(point2.latitude);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * 
                Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }
}

module.exports = new DataAggregator();
