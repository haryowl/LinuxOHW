// backend/src/middleware/inputValidator.js
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Sanitize string input to prevent injection attacks
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    // Remove potentially dangerous characters
    return input.replace(/[<>\"']/g, '');
}

/**
 * Validate and sanitize request body
 */
function validateInput(rules) {
    return (req, res, next) => {
        try {
            const errors = {};
            const sanitized = {};

            // Validate each field
            for (const [field, validators] of Object.entries(rules)) {
                const value = req.body[field];

                for (const validator of validators) {
                    const result = validator(value, field);
                    if (result !== null && result !== true) {
                        errors[field] = result;
                        break;
                    }
                }

                // Sanitize if validation passed
                if (!errors[field]) {
                    if (typeof value === 'string') {
                        sanitized[field] = sanitizeString(value);
                    } else {
                        sanitized[field] = value;
                    }
                }
            }

            if (Object.keys(errors).length > 0) {
                logger.warn('Input validation failed', { errors, url: req.url });
                throw new AppError('Validation failed', 400);
            }

            // Replace body with sanitized values
            req.body = { ...req.body, ...sanitized };
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Common validators
 */
const validators = {
    required: (fieldName) => (value, field) => {
        if (value === null || value === undefined || value === '') {
            return `${fieldName || field} is required`;
        }
        return true;
    },

    string: (fieldName, minLength = 0, maxLength = Infinity) => (value, field) => {
        if (value === null || value === undefined || value === '') {
            return null; // Let required validator handle this
        }
        if (typeof value !== 'string') {
            return `${fieldName || field} must be a string`;
        }
        if (value.length < minLength) {
            return `${fieldName || field} must be at least ${minLength} characters`;
        }
        if (value.length > maxLength) {
            return `${fieldName || field} must be at most ${maxLength} characters`;
        }
        return true;
    },

    number: (fieldName, min = null, max = null) => (value, field) => {
        if (value === null || value === undefined || value === '') {
            return null; // Let required validator handle this
        }
        const num = Number(value);
        if (isNaN(num)) {
            return `${fieldName || field} must be a number`;
        }
        if (min !== null && num < min) {
            return `${fieldName || field} must be at least ${min}`;
        }
        if (max !== null && num > max) {
            return `${fieldName || field} must be at most ${max}`;
        }
        return true;
    },

    email: (value, field) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Invalid email format';
        }
        return true;
    },

    array: (fieldName, minLength = 0) => (value, field) => {
        if (value === null || value === undefined) {
            return null;
        }
        if (!Array.isArray(value)) {
            return `${fieldName || field} must be an array`;
        }
        if (value.length < minLength) {
            return `${fieldName || field} must have at least ${minLength} items`;
        }
        return true;
    },

    oneOf: (allowedValues, fieldName) => (value, field) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        if (!allowedValues.includes(value)) {
            return `${fieldName || field} must be one of: ${allowedValues.join(', ')}`;
        }
        return true;
    }
};

module.exports = {
    validateInput,
    validators
};






