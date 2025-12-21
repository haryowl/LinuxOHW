// backend/src/utils/envValidator.js
const logger = require('./logger');

/**
 * Validates required environment variables
 * Throws error if validation fails
 */
function validateEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const errors = [];
    const warnings = [];
    
    // Required in all environments
    const alwaysRequired = [];
    
    // Required only in production
    const productionRequired = [
        { name: 'JWT_SECRET', minLength: 32, description: 'JWT signing secret' },
        { name: 'SESSION_SECRET', minLength: 32, description: 'Session secret' }
    ];
    
    // Recommended but not required
    const recommended = [
        { name: 'SERVER_IP', description: 'Server IP address' },
        { name: 'HTTP_PORT', description: 'HTTP server port' },
        { name: 'TCP_PORT', description: 'TCP server port' }
    ];
    
    // Validate always required
    for (const varName of alwaysRequired) {
        if (!process.env[varName]) {
            errors.push(`${varName} is required`);
        }
    }
    
    // Validate production required
    if (isProduction) {
        for (const { name, minLength, description } of productionRequired) {
            const value = process.env[name];
            
            if (!value) {
                errors.push(`${name} is required in production (${description})`);
            } else if (value.includes('default') || value.includes('your-') || value.includes('change-this')) {
                errors.push(`${name} cannot use default/placeholder values in production`);
            } else if (minLength && value.length < minLength) {
                errors.push(`${name} must be at least ${minLength} characters long in production`);
            }
        }
    }
    
    // Warn about recommended variables
    if (isProduction) {
        for (const { name, description } of recommended) {
            if (!process.env[name]) {
                warnings.push(`${name} is recommended but not set (${description})`);
            }
        }
    }
    
    // Log warnings
    if (warnings.length > 0) {
        logger.warn('Environment variable warnings:', { warnings });
    }
    
    // Throw error if validation fails
    if (errors.length > 0) {
        const errorMessage = `Environment validation failed:\n${errors.join('\n')}`;
        logger.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    if (isProduction && errors.length === 0) {
        logger.info('Environment validation passed');
    }
}

module.exports = { validateEnvironment };






