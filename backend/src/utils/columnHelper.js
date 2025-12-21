// backend/src/utils/columnHelper.js

/**
 * Filters a list of possible columns to only include those that exist in the database
 * @param {Array} possibleColumns - Array of column names to check
 * @param {Object} model - Sequelize model to check against
 * @returns {Array} Array of columns that exist in the database
 */
function getAvailableColumns(possibleColumns, model) {
    // Get the actual table columns from the model
    const tableColumns = Object.keys(model.rawAttributes);
    
    // Filter to only include columns that exist in the database
    return possibleColumns.filter(col => tableColumns.includes(col));
}

/**
 * Common column sets for different data types
 */
const columnSets = {
    tracking: [
        'timestamp', 'datetime', 'latitude', 'longitude', 'speed', 'direction', 
        'height', 'satellites', 'status', 'supplyVoltage', 'batteryVoltage'
    ],
    
    deviceData: [
        'timestamp', 'datetime', 'latitude', 'longitude', 'speed', 'direction',
        'height', 'satellites', 'status', 'supplyVoltage', 'batteryVoltage',
        'input0', 'input1', 'input2', 'input3',
        'inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3',
        'inputVoltage4', 'inputVoltage5', 'inputVoltage6'
    ],
    
    export: [
        'timestamp', 'datetime', 'latitude', 'longitude', 'speed', 'direction', 
        'height', 'satellites', 'status', 'supplyVoltage', 'batteryVoltage',
        'input0', 'input1', 'input2', 'input3',
        'inputVoltage0', 'inputVoltage1', 'inputVoltage2', 'inputVoltage3',
        'inputVoltage4', 'inputVoltage5', 'inputVoltage6',
        'userData0', 'userData1', 'userData2', 'userData3',
        'userData4', 'userData5', 'userData6', 'userData7',
        'modbus0', 'modbus1', 'modbus2', 'modbus3', 'modbus4', 'modbus5',
        'modbus6', 'modbus7', 'modbus8', 'modbus9', 'modbus10', 'modbus11',
        'modbus12', 'modbus13', 'modbus14', 'modbus15'
    ]
};

module.exports = {
    getAvailableColumns,
    columnSets
}; 