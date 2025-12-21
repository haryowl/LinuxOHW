const express = require('express');
const router = express.Router();
const { Record, Device, DeviceGroup, UserDeviceAccess, UserDeviceGroupAccess } = require('../models');
const { Op } = require('sequelize');
const { Parser: Json2csvParser } = require('json2csv');
const ExcelJS = require('exceljs');
const { requireAuth } = require('./auth');
const { filterDevicesByPermission } = require('../middleware/permissions');
const logger = require('../utils/logger');

// Get records with optional date filtering - WITH USER PERMISSIONS
router.get('/', requireAuth, filterDevicesByPermission, async (req, res) => {
    try {
        const requestStart = Date.now();
        logger.debug('GET /api/records - Starting request', { username: req.user.username });
        
        let { startDate, endDate, limit = 100, range, imeis } = req.query;
        const where = {};
        const now = new Date();
        
        // Filter by user permissions - only show records from accessible devices
        let accessibleDeviceImeis = [];
        
        if (req.user.role === 'admin') {
            logger.debug('Admin user - getting all records');
        } else {
            logger.debug('Non-admin user - filtering records by permissions');
            
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
            
            // Add device filter to where clause
            if (accessibleDeviceImeis.length > 0) {
                where.deviceImei = { [Op.in]: accessibleDeviceImeis };
            } else {
                // No accessible devices - return empty result
                where.deviceImei = { [Op.in]: [] };
            }
            
            logger.debug('User device access calculated', { deviceCount: accessibleDeviceImeis.length });
        }
        
        // Better defaults to prevent massive queries
        if (!range && !startDate && !endDate) {
            // Default to last 1h instead of 24h for better performance
            range = '1h';
        }
        
        if (range === '24h') {
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            endDate = now;
        } else if (range === '1h') {
            startDate = new Date(now.getTime() - 60 * 60 * 1000);
            endDate = now;
        } else if (range === 'all') {
            // For 'all' requests, limit to last 7 days to prevent timeout
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
        }
        
        if (startDate && endDate) {
            where.datetime = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        
        // Add IMEI filtering if provided
        if (imeis) {
            const imeiList = imeis.split(',').map(imei => imei.trim()).filter(imei => imei);
            if (imeiList.length > 0) {
                // If user has specific IMEI filter, intersect with accessible devices
                if (req.user.role !== 'admin') {
                    const filteredImeis = imeiList.filter(imei => accessibleDeviceImeis.includes(imei));
                    if (filteredImeis.length > 0) {
                        where.deviceImei = { [Op.in]: filteredImeis };
                    } else {
                        where.deviceImei = { [Op.in]: [] }; // No accessible devices match
                    }
                } else {
                    where.deviceImei = { [Op.in]: imeiList };
                }
            }
        }
        
        // Better limit handling to prevent massive queries
        let queryLimit = parseInt(limit);
        if (limit === 'all' || queryLimit === 0 || isNaN(queryLimit)) {
            // Cap at 1000 records for 'all' requests to prevent timeout
            queryLimit = 1000;
        } else if (queryLimit > 1000) {
            // Cap at 1000 records maximum
            queryLimit = 1000;
        }
        
        logger.debug('Records query parameters', { range: range || 'custom', limit: queryLimit });
        const dbStart = Date.now();
        
        const records = await Record.findAll({
            where,
            order: [['datetime', 'DESC']],
            limit: queryLimit,
            // Add attributes to reduce data transfer - include important GPS fields and timestamp
            attributes: ['id', 'deviceImei', 'timestamp', 'datetime', 'latitude', 'longitude', 'altitude', 'speed', 'course', 'satellites', 'hdop', 'direction', 'status', 'supplyVoltage', 'batteryVoltage', 'forwarded', 'userData0', 'userData1', 'userData2', 'modbus0']
        });
        
        const dbTime = Date.now() - dbStart;
        const totalTime = Date.now() - requestStart;
        
        logger.info('Records query completed', { 
            dbTime: `${dbTime}ms`, 
            totalTime: `${totalTime}ms`,
            recordsCount: records.length 
        });
        
        res.json(records);
    } catch (error) {
        logger.error('Error fetching records:', error);
        res.status(500).json({ 
            error: 'Failed to fetch records', 
            details: error.message, 
            stack: error.stack 
        });
    }
});

// Get records by device IMEI
router.get('/device/:imei', async (req, res) => {
    try {
        const { imei } = req.params;
        const { startDate, endDate, limit = 100 } = req.query;
        const where = { deviceImei: imei };
        
        if (startDate && endDate) {
            where.datetime = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        
        const records = await Record.findAll({
            where,
            order: [['datetime', 'DESC']],
            limit: parseInt(limit)
        });
        
        res.json(records);
    } catch (error) {
        logger.error('Error fetching device records:', error);
        res.status(500).json({ 
            error: 'Failed to fetch device records',
            details: error.message 
        });
    }
});

// Export records
router.post('/export', async (req, res) => {
    try {
        const { startDate, endDate, format, fields, imeis } = req.body;
        const where = {};
        
        // Use DATETIME field for time filtering instead of TIMESTAMP
        if (startDate && endDate) {
            where.datetime = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        
        // Add IMEI filtering if provided
        if (imeis && imeis.length > 0) {
            where.deviceImei = {
                [Op.in]: imeis
            };
        }
        
        // Include all possible fields in the query to ensure they're available for export
        const allFields = [
            'id', 'deviceImei', 'timestamp', 'datetime', 'recordNumber',
            'latitude', 'longitude', 'speed', 'direction', 'altitude', 'course', 'satellites', 'hdop',
            'status', 'supplyVoltage', 'batteryVoltage',
            'input0', 'input1', 'input2', 'input3',
            'inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3', 'inputVoltage4', 'inputVoltage5', 'inputVoltage6',
            'userData0', 'userData1', 'userData2', 'userData3', 'userData4', 'userData5', 'userData6', 'userData7',
            'modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5', 'modbus6', 'modbus7',
            'modbus8', 'modbus9', 'modbus10', 'modbus11', 'modbus12', 'modbus13', 'modbus14', 'modbus15'
        ];
        
        const records = await Record.findAll({
            where,
            attributes: allFields,
            order: [['datetime', 'DESC']] // Order by device datetime instead of server timestamp
        });
        
        const data = records.map(r => r.toJSON());
        const selectedData = data.map(row => {
            const filtered = {};
            fields.forEach(field => {
                filtered[field] = row[field];
            });
            return filtered;
        });
        
        if (format === 'csv') {
            const parser = new Json2csvParser({ fields });
            const csv = parser.parse(selectedData);
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="records.csv"');
            res.send(csv);
        } else if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Records');
            
            // Add headers
            worksheet.columns = fields.map(field => ({ header: field, key: field }));
            
            // Add data
            selectedData.forEach(row => {
                worksheet.addRow(row);
            });
            
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="records.xlsx"');
            
            await workbook.xlsx.write(res);
            res.end();
        } else {
            res.json(selectedData);
        }
        
    } catch (error) {
        logger.error('Error exporting records:', error);
        res.status(500).json({ 
            error: 'Failed to export records',
            details: error.message 
        });
    }
});

// Export Data SM records with custom field mapping
// Export Data SM records with custom field mapping
router.post('/export-sm', requireAuth, filterDevicesByPermission, async (req, res) => {
    try {
        const { startDate, endDate, fields, customHeaders, imeis, fileExtension = 'pfsl' } = req.body;
        logger.info('Export-SM request received', {
            startDate,
            endDate,
            imeisCount: imeis?.length || 0,
            fieldsCount: fields?.length || 0,
            fileExtension,
            username: req.user.username,
            role: req.user.role
        });
        
        const where = {};
        
        // Filter by user permissions - only show records from accessible devices
        let accessibleDeviceImeis = [];
        
        if (req.user.role === 'admin') {
            logger.debug('Admin user - getting all records for export');
        } else {
            logger.debug('Non-admin user - filtering export records by permissions');
            
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
            
            logger.debug('User device access for export', { deviceCount: accessibleDeviceImeis.length });
        }
        
        // Use DATETIME field for time filtering
        if (startDate && endDate) {
            where.datetime = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        }
        
        // Add IMEI filtering if provided - but respect user permissions
        if (imeis && imeis.length > 0) {
            if (req.user.role === 'admin') {
                where.deviceImei = { [Op.in]: imeis };
            } else {
                // Filter IMEIs by accessible devices
                const filteredImeis = imeis.filter(imei => accessibleDeviceImeis.includes(imei));
                if (filteredImeis.length > 0) {
                    where.deviceImei = { [Op.in]: filteredImeis };
                } else {
                    where.deviceImei = { [Op.in]: [] }; // No accessible devices match
                }
            }
        } else if (req.user.role !== 'admin') {
            // If no specific IMEIs requested, filter by all accessible devices
            if (accessibleDeviceImeis.length > 0) {
                where.deviceImei = { [Op.in]: accessibleDeviceImeis };
            } else {
                where.deviceImei = { [Op.in]: [] }; // No accessible devices
            }
        }
        
        // Include all required fields for Data SM
        const allFields = [
            'id', 'deviceImei', 'datetime', 'latitude', 'longitude', 'speed', 'altitude', 'satellites',
            'userData0', 'userData1', 'userData2', 'modbus0'
        ];
        
        logger.debug('Export query where clause', { where });
        
        const records = await Record.findAll({
            where,
            attributes: allFields,
            order: [['datetime', 'DESC']]
        });
        
        logger.debug('Records found for export', { count: records.length });
        
        // Filter out records that only have IMEI and timestamp (no meaningful data)
        const filteredRecords = records.filter(record => {
            const hasGPS = record.latitude !== null && record.latitude !== undefined && 
                          record.longitude !== null && record.longitude !== undefined;
            const hasAltitude = record.altitude !== null && record.altitude !== undefined;
            const hasSatellites = record.satellites !== null && record.satellites !== undefined;
            const hasSpeed = record.speed !== null && record.speed !== undefined;
            const hasSensorData = (record.userData0 !== null && record.userData0 !== undefined) ||
                                (record.userData1 !== null && record.userData1 !== undefined) ||
                                (record.userData2 !== null && record.userData2 !== undefined) ||
                                (record.modbus0 !== null && record.modbus0 !== undefined);
            
            return hasGPS || hasAltitude || hasSatellites || hasSpeed || hasSensorData;
        });
        
        logger.debug('Filtered records for export', { meaningfulRecords: filteredRecords.length });
        
        // Transform data with custom headers and date formatting
        const transformedData = filteredRecords.map(record => {
            const transformed = {};
            
            // Map each field to its custom header with proper formatting
            Object.keys(customHeaders).forEach(field => {
                switch (field) {
                    case 'deviceImei':
                        transformed[customHeaders[field]] = record.deviceImei;
                        break;
                    case 'datetime':
                        // Format date as YYYY-MM-DD HH:MM:SS
                        if (record.datetime) {
                            const date = new Date(record.datetime);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const hours = String(date.getHours()).padStart(2, '0');
                            const minutes = String(date.getMinutes()).padStart(2, '0');
                            const seconds = String(date.getSeconds()).padStart(2, '0');
                            transformed[customHeaders[field]] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                        } else {
                            transformed[customHeaders[field]] = '';
                        }
                        break;
                    case 'latitude':
                        transformed[customHeaders[field]] = record.latitude || '';
                        break;
                    case 'longitude':
                        transformed[customHeaders[field]] = record.longitude || '';
                        break;
                    case 'altitude':
                        transformed[customHeaders[field]] = record.altitude || '';
                        break;
                    case 'satellites':
                        transformed[customHeaders[field]] = record.satellites || '';
                        break;
                    case 'speed':
                        transformed[customHeaders[field]] = record.speed || '';
                        break;
                    case 'userData0':
                        transformed[customHeaders[field]] = record.userData0 || '';
                        break;
                    case 'userData1':
                        transformed[customHeaders[field]] = record.userData1 || '';
                        break;
                    case 'userData2':
                        transformed[customHeaders[field]] = record.userData2 || '';
                        break;
                    case 'modbus0':
                        transformed[customHeaders[field]] = record.modbus0 || '';
                        break;
                    default:
                        transformed[customHeaders[field]] = record[field] || '';
                }
            });
            return transformed;
        });
        
        // Generate CSV without headers - Manual approach to avoid quotes
        const headers = Object.values(customHeaders);
        let csv = '';
        
        transformedData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header];
                return value !== null && value !== undefined ? value : '';
            });
            csv += values.join(';') + '\n';
        });
        
        // Generate filename with device groups
        const deviceRecords = await Device.findAll({
            where: { imei: imeis },
            include: [{
                model: DeviceGroup,
                as: 'group',
                attributes: ['name']
            }],
            attributes: ['imei', 'name']
        });
        
        // Generate date string for filename
        const dateStr = `${String(new Date().getDate()).padStart(2, '0')}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${new Date().getFullYear()}`;
        
        // Create filename based on device groups
        let filename;
        if (deviceRecords.length === 1) {
            const device = deviceRecords[0];
            const groupName = device.group ? device.group.name : 'Unknown';
            const deviceName = device.name || device.imei;
            filename = `${groupName}_${deviceName}_${dateStr}.${fileExtension}`;
        } else {
            // Multiple devices - use group names or "all_devices"
            const groupNames = [...new Set(deviceRecords.map(d => d.group ? d.group.name : 'Unknown'))];
            if (groupNames.length === 1) {
                filename = `${groupNames[0]}_all_devices_${dateStr}.${fileExtension}`;
            } else {
                filename = `all_devices_${dateStr}.${fileExtension}`;
            }
        }
        
        logger.info('Export completed', { filename, recordsCount: transformedData.length });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
        
    } catch (error) {
        logger.error('Error exporting Data SM records:', error);
        res.status(500).json({ 
            error: 'Failed to export Data SM records',
            details: error.message 
        });
    }
});

module.exports = router;