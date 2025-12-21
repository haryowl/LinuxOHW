const express = require('express');
const router = express.Router();
const { Record, Device } = require('../models');
const { Op } = require('sequelize');
const { Parser: Json2csvParser } = require('json2csv');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const logger = require('../utils/logger');

// Store auto-export configurations
const autoExportConfigs = new Map();


// File path for storing auto-export configs
const CONFIG_FILE = path.join(__dirname, '../../data/auto-export-configs.json');

// Load configs from file on startup
function loadConfigs() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            const configs = JSON.parse(data);
            logger.info('Loaded auto-export configs from file', { count: configs.length });
            return configs;
        }
    } catch (error) {
        logger.error('Error loading auto-export configs:', error);
    }
    return [];
}

// Save configs to file
function saveConfigs() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const configs = Array.from(autoExportConfigs.entries()).map(([jobId, config]) => ({
            jobId,
            type: config.type,
            time: config.time,
            devices: config.devices,
            fields: config.fields,
            customHeaders: config.customHeaders
        }));
        
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2));
        logger.info('Saved auto-export configs to file', { count: configs.length });
    } catch (error) {
        logger.error('Error saving auto-export configs:', error);
    }
}

// Initialize configs from file on startup
const savedConfigs = loadConfigs();
savedConfigs.forEach(config => {
    if (config.type === 'data-sm') {
        // Parse time and recreate cron job
        const [hour, minute] = config.time.split(':').map(Number);
        const cronExpression = `${minute} ${hour} * * *`;
        
        const job = cron.schedule(cronExpression, async () => {
            await performDataSMAutoExport(config.devices, config.fields, config.customHeaders, config.jobId);
        }, {
            scheduled: true,
            timezone: "UTC"
        });
        
        autoExportConfigs.set(config.jobId, {
            type: config.type,
            time: config.time,
            devices: config.devices,
            fields: config.fields,
            customHeaders: config.customHeaders,
            job
        });
        
        logger.info('Restored auto-export job', { jobId: config.jobId, time: config.time });
    }
});


// Configure auto-export for Data SM
// Configure auto-export for Data SM
router.post('/sm', async (req, res) => {
    try {
        const { enabled, time, devices, fields, customHeaders } = req.body;
        
        logger.info('Auto-export request received', {
            enabled,
            time,
            devicesCount: devices?.length || 0,
            fieldsCount: fields?.length || 0
        });
        
        if (enabled) {
            // Parse time (format: "HH:MM")
            const [hour, minute] = time.split(':').map(Number);
            
            logger.debug('Parsed time for auto-export', { hour, minute, originalTime: time });
            
            // Schedule the cron job
            const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
            
            const jobId = `data-sm-${Date.now()}`;
            
            const job = cron.schedule(cronExpression, async () => {
                await performDataSMAutoExport(devices, fields, customHeaders);
            }, {
                scheduled: true,
                timezone: "UTC"
            });
            
            // Store configuration
            autoExportConfigs.set(jobId, {
                type: 'data-sm',
                time: time || '00:00',  // Ensure time is never undefined
                devices,
                fields,
                customHeaders,
                job
            });
            
            logger.debug('Stored auto-export configuration', { jobId, time: autoExportConfigs.get(jobId).time });
            
            // Save configs to file
            saveConfigs();
            logger.info('Auto-export scheduled for Data SM', { time, jobId });
            res.json({ 
                success: true, 
                message: `Auto-export scheduled for Data SM at ${time} UTC`,
                jobId 
            });
        } else {
            // Disable auto-export
            for (const [jobId, config] of autoExportConfigs.entries()) {
                if (config.type === 'data-sm') {
                    config.job.stop();
                    autoExportConfigs.delete(jobId);
                }
            }
            saveConfigs();
            logger.info('Auto-export disabled for Data SM');
            res.json({ 
                success: true, 
                message: 'Auto-export disabled for Data SM' 
            });
        }
    } catch (error) {
        logger.error('Error configuring auto-export:', error);
        res.status(500).json({ error: 'Failed to configure auto-export' });
    }
});

// Get auto-export status
// Get auto-export status
router.get('/status', async (req, res) => {
    try {
        const status = [];
        // Get only the latest Data SM config (most recent jobId)
        let latestDataSMConfig = null;
        let latestJobId = null;
        
        for (const [jobId, config] of autoExportConfigs.entries()) {
            if (config.type === 'data-sm') {
                if (!latestJobId || jobId > latestJobId) {
                    latestDataSMConfig = config;
                    latestJobId = jobId;
                }
            }
        }
        
        if (latestDataSMConfig) {
            status.push({
                jobId: latestJobId,
                type: latestDataSMConfig.type,
                time: latestDataSMConfig.time,
                devices: latestDataSMConfig.devices,
                enabled: true
            });
        }
        
        res.json(status);
    } catch (error) {
        logger.error('Error getting auto-export status:', error);
        res.status(500).json({ error: 'Failed to get auto-export status' });
    }
});

// Perform Data SM auto-export
// Perform Data SM auto-export - generates separate files per device
async function performDataSMAutoExport(devices, fields, customHeaders, jobId) {
    logger.info('Auto-export triggered', { 
        timestamp: new Date().toISOString(),
        devicesCount: devices?.length || 0,
        fieldsCount: fields?.length || 0,
        jobId 
    });
    
    const startTime = Date.now();
    let totalRecordsCount = 0;
    let filesGenerated = 0;
    const generatedFiles = [];
    
    try {
        logger.info('Starting Data SM auto-export', { mode: 'separate files per device' });
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const startDate = new Date(yesterday.setHours(0, 0, 0, 0));
        const endDate = new Date(yesterday.setHours(23, 59, 59, 999));
        
        // Generate date period (same format as manual export)
        const dateStr = `${String(yesterday.getDate()).padStart(2, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${yesterday.getFullYear()}`;
        
        // Create exports directory if it doesn't exist
        const exportsDir = path.join(__dirname, '../../exports');
        if (!fs.existsSync(exportsDir)) {
            fs.mkdirSync(exportsDir, { recursive: true });
        }
        
        // Get device information with group details (same as manual export)
        const { DeviceGroup } = require('../models');
        
        // If no devices specified, get all devices that have records
        let targetDevices = devices;
        if (!targetDevices || targetDevices.length === 0) {
            const allRecords = await Record.findAll({
                where: {
                    datetime: { [Op.between]: [startDate, endDate] }
                },
                attributes: ['deviceImei'],
                group: ['deviceImei']
            });
            targetDevices = allRecords.map(record => record.deviceImei);
        }
        
        // Get device information for all target devices
        const deviceRecords = await Device.findAll({
            where: { imei: targetDevices },
            include: [{
                model: DeviceGroup,
                as: 'group',
                attributes: ['name']
            }],
            attributes: ['imei', 'name']
        });
        
        // Process each device separately
        for (const deviceRecord of deviceRecords) {
            try {
                const deviceImei = deviceRecord.imei;
                
                // Query records for this specific device
                const records = await Record.findAll({
                    where: {
                        deviceImei: deviceImei,
                        datetime: { [Op.between]: [startDate, endDate] }
                    },
                    order: [['datetime', 'DESC']] // Same as manual export
                });
                
                // Filter out records that only have IMEI and timestamp (same as manual export)
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
                
                if (filteredRecords.length === 0) {
                    logger.debug('No records found for device during auto-export', { deviceImei });
                    continue;
                }
                
                // Transform data with custom headers and date formatting (same as manual export)
                const transformedData = filteredRecords.map(record => {
                    const transformed = {};
                    
                    // Map each field to its custom header with proper formatting
                    Object.keys(customHeaders).forEach(field => {
                        switch (field) {
                            case 'deviceImei':
                                transformed[customHeaders[field]] = record.deviceImei;
                                break;
                            case 'datetime':
                                // Format date as YYYY-MM-DD HH:MM:SS (same as manual export)
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
                
                // Generate CSV without headers - Manual approach to avoid quotes (same as manual export)
                const headers = Object.values(customHeaders);
                let csv = '';
                
                transformedData.forEach(row => {
                    const values = headers.map(header => {
                        const value = row[header];
                        return value !== null && value !== undefined ? value : '';
                    });
                    csv += values.join(';') + '\n';
                });
                
                // Generate filename for this device (same as manual export)
                const groupName = deviceRecord.group ? deviceRecord.group.name : 'Unknown';
                const deviceName = deviceRecord.name || deviceRecord.imei;
                const filename = `${groupName}_${deviceName}_${dateStr}.pfsl`;
                const filepath = path.join(exportsDir, filename);
                
                // Write file
                fs.writeFileSync(filepath, csv);
                
                totalRecordsCount += filteredRecords.length;
                filesGenerated++;
                generatedFiles.push({
                    filename,
                    recordsCount: filteredRecords.length,
                    fileSize: csv.length
                });
                
                logger.info('Device export completed', { 
                    filename, 
                    recordsCount: filteredRecords.length,
                    deviceImei 
                });
                
            } catch (deviceError) {
                logger.error('Error processing device during auto-export', { 
                    deviceImei: deviceRecord.imei,
                    error: deviceError.message 
                });
            }
        }
        
        const duration = Date.now() - startTime;
        
        logger.info('Data SM auto-export completed successfully', {
            filesGenerated,
            totalRecordsCount,
            duration: `${duration}ms`,
            generatedFiles: generatedFiles.map(f => f.filename)
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('Error during Data SM auto-export', {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`
        });
        
        throw error;
    }
}

module.exports = router; 





