    // backend/src/routes/mapping.js
    const express = require('express');
    const router = express.Router();
    const { FieldMapping } = require('../models');
    const asyncHandler = require('../utils/asyncHandler');

    // Get available original fields
    router.get('/fields/available', asyncHandler(async (req, res) => {
        // Import tag definitions
        const tagDefinitions = {
            '0x01': { name: 'Hardware Version', type: 'uint8', description: 'Hardware version of the device' },
            '0x02': { name: 'Firmware Version', type: 'uint8', description: 'Firmware version of the device' },
            '0x03': { name: 'IMEI', type: 'string', description: 'IMEI number of the device' },
            '0x04': { name: 'Device Identifier', type: 'uint16', description: 'Identifier of the device' },
            '0x10': { name: 'Archive Record Number', type: 'uint16', description: 'Sequential number of archive record' },
            '0x20': { name: 'Date Time', type: 'datetime', description: 'Date and time in Unix timestamp format' },
            '0x21': { name: 'Milliseconds', type: 'uint16', description: 'Milliseconds (0-999) to complete date and time value' },
            '0x30': { name: 'Coordinates', type: 'coordinates', description: 'GPS/GLONASS coordinates and satellites info' },
            '0x33': { name: 'Speed and Direction', type: 'speedDirection', description: 'Speed in km/h and direction in degrees' },
            '0x34': { name: 'Height', type: 'int16', description: 'Height above sea level in meters' },
            '0x35': { name: 'HDOP', type: 'uint8', description: 'HDOP or cellular location error in meters' },
            '0x40': { name: 'Status', type: 'status', description: 'Device status bits' },
            '0x41': { name: 'Supply Voltage', type: 'uint16', description: 'Supply voltage in mV' },
            '0x42': { name: 'Battery Voltage', type: 'uint16', description: 'Battery voltage in mV' },
            '0x43': { name: 'Inside Temperature', type: 'int8', description: 'Internal temperature in °C' },
            '0x44': { name: 'Acceleration', type: 'uint32', description: 'Acceleration' },
            '0x45': { name: 'Status of outputs', type: 'outputs', description: 'Status of outputs (each bit represents an output state)' },
            '0x46': { name: 'Status of inputs', type: 'inputs', description: 'Status of inputs (each bit represents an input state)' },
            '0x47': { name: 'ECO and driving style', type: 'uint32', description: 'ECO and driving style' },
            '0x48': { name: 'Expanded status of the device', type: 'uint16', description: 'Expanded status of the device' },
            '0x49': { name: 'Transmission channel', type: 'uint8', description: 'Transmission channel' },
            '0x50': { name: 'Input voltage 0', type: 'uint16', description: 'Input voltage 0' },
            '0x51': { name: 'Input voltage 1', type: 'uint16', description: 'Input voltage 1' },
            '0x52': { name: 'Input voltage 2', type: 'uint16', description: 'Input voltage 2' },
            '0x53': { name: 'Input voltage 3', type: 'uint16', description: 'Input voltage 3' },
            '0x54': { name: 'Input 4 Values', type: 'uint16', description: 'Input 4 Values' },
            '0x55': { name: 'Input 5 Values', type: 'uint16', description: 'Input 5 Values' },
            '0x56': { name: 'Input 6 Values', type: 'uint16', description: 'Input 6 Values' },
            '0x57': { name: 'Input 7 Values', type: 'uint16', description: 'Input 7 Values' },
            '0x58': { name: 'RS232 0', type: 'uint16', description: 'RS232 0' },
            '0x59': { name: 'RS232 1', type: 'uint16', description: 'RS232 1' },
            '0x60': { name: 'GSM Network Code', type: 'uint32', description: 'GSM network code (extended)' },
            '0x61': { name: 'GSM Location Area Code', type: 'uint32', description: 'GSM location area code (extended)' },
            '0x62': { name: 'GSM Signal Level', type: 'uint8', description: 'GSM signal level (0-31)' },
            '0x63': { name: 'GSM Cell ID', type: 'uint16', description: 'GSM cell identifier' },
            '0x64': { name: 'GSM Area Code', type: 'uint16', description: 'GSM area code' },
            '0x65': { name: 'GSM Operator Code', type: 'uint16', description: 'GSM operator code' },
            '0x66': { name: 'GSM Base Station', type: 'uint16', description: 'GSM base station identifier' },
            '0x67': { name: 'GSM Country Code', type: 'uint16', description: 'GSM country code' },
            '0x68': { name: 'GSM Network Code', type: 'uint16', description: 'GSM network code' },
            '0x69': { name: 'GSM Location Area Code', type: 'uint16', description: 'GSM location area code' },
            '0x70': { name: 'GSM Location Area Code', type: 'uint32', description: 'GSM location area code (extended)' },
            '0x71': { name: 'GSM Signal Level', type: 'uint8', description: 'GSM signal level (0-31)' },
            '0x72': { name: 'GSM Cell ID', type: 'uint16', description: 'GSM cell identifier' },
            '0x73': { name: 'Temperature Sensor', type: 'int16', description: 'Temperature sensor reading in °C' },
            '0x74': { name: 'Humidity Sensor', type: 'uint8', description: 'Humidity sensor reading in %' },
            '0x75': { name: 'Pressure Sensor', type: 'uint16', description: 'Pressure sensor reading in hPa' },
            '0x76': { name: 'Light Sensor', type: 'uint16', description: 'Light sensor reading in lux' },
            '0x77': { name: 'Accelerometer', type: 'int16', description: 'Accelerometer readings (X, Y, Z) in m/s²' },
            '0x78': { name: 'Input 8 Value', type: 'int16', description: 'Input 8 Value' },
            '0x79': { name: 'Input 9 Value', type: 'int16', description: 'Input 9 Value' },
            '0x7a': { name: 'Input 10 Value', type: 'uint16', description: 'Input 10 Value' },
            '0x7b': { name: 'Input 11 Value', type: 'uint16', description: 'Input 11 Value' },
            '0x7c': { name: 'Input 12 Value', type: 'uint16', description: 'Input 12 Value' },
            '0x7d': { name: 'Input 13 Value', type: 'uint16', description: 'Input 13 Value' },
            '0x7e': { name: 'Input 14 Value', type: 'uint16', description: 'Input 14 Value' },
            '0x7f': { name: 'Input 15 Value', type: 'uint16', description: 'Input 15 Value' },
            '0xe2': { name: 'User data 0', type: 'uint32', description: 'User data 0' },
            '0xe3': { name: 'User data 1', type: 'uint32', description: 'User data 1' },
            '0xe4': { name: 'User data 2', type: 'uint32', description: 'User data 2' },
            '0xe5': { name: 'User data 3', type: 'uint32', description: 'User data 3' },
            '0xe6': { name: 'User data 4', type: 'uint32', description: 'User data 4' },
            '0xe7': { name: 'User data 5', type: 'uint32', description: 'User data 5' },
            '0xe8': { name: 'User data 6', type: 'uint32', description: 'User data 6' },
            '0xe9': { name: 'User data 7', type: 'uint32', description: 'User data 7' }
        };

        // Convert to array format for easier frontend consumption
        const availableFields = Object.entries(tagDefinitions).map(([field, info]) => ({
            field,
            name: info.name,
            type: info.type,
            description: info.description
        }));

        res.json(availableFields);
    }));

    // Get all mappings
    router.get('/all', asyncHandler(async (req, res) => {
        const mappings = await FieldMapping.findAll({
            where: {
                deviceId: req.query.deviceId || null
            },
            order: [['originalField', 'ASC']]
        });
        res.json(mappings);
    }));

    // Get mappings for a device
    router.get('/:deviceId', asyncHandler(async (req, res) => {
        const { deviceId } = req.params;
        const mappings = await FieldMapping.findAll({
            where: { deviceId },
            order: [['originalField', 'ASC']]
        });
        res.json(mappings);
    }));

    // Create a new mapping
    router.post('/', asyncHandler(async (req, res) => {
        const mappingData = {
            ...req.body,
            deviceId: req.body.deviceId || null
        };
        const mapping = await FieldMapping.create(mappingData);
        res.status(201).json(mapping);
    }));

    // Update a mapping
    router.put('/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const mapping = await FieldMapping.findByPk(id);
        if (!mapping) {
            return res.status(404).json({ message: 'Mapping not found' });
        }
        await mapping.update(req.body);
        res.json(mapping);
    }));

    // Delete a mapping
    router.delete('/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const mapping = await FieldMapping.findByPk(id);
        if (!mapping) {
            return res.status(404).json({ message: 'Mapping not found' });
        }
        await mapping.destroy();
        res.json({ message: 'Mapping deleted successfully' });
    }));

    // Get preview data
    router.get('/preview', asyncHandler(async (req, res) => {
        // Return some sample data for preview
        res.json([
            { originalField: '0x46', value: 'ON' },
            { originalField: '0x50', value: '24.5V' },
            { originalField: '0x51', value: '23.8V' }
        ]);
    }));

    // Export mappings
    router.get('/export/:format', asyncHandler(async (req, res) => {
        const { format } = req.params;
        const mappings = await FieldMapping.findAll({
            order: [['originalField', 'ASC']]
        });

        if (format === 'json') {
            res.json(mappings);
        } else if (format === 'csv') {
            // Convert to CSV
            const csv = mappings.map(m => 
                `${m.originalField},${m.customName},${m.dataType},${m.unit},${m.enabled}`
            ).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.send(csv);
        } else {
            res.status(400).json({ message: 'Unsupported export format' });
        }
    }));

    module.exports = router;

