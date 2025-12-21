// backend/src/utils/errorHandler.js
const logger = require('./logger');

/**
 * Standard error response format
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Standard error handler middleware
 */
function errorHandler(err, req, res, next) {
    // Log error
    logger.error('Application error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.url,
        method: req.method,
        statusCode: err.statusCode || 500
    });
    
    // Determine status code
    const statusCode = err.statusCode || 500;
    
    // Prepare error response
    // Check if error is operational (user-facing) or system error
    const isOperational = err instanceof AppError || (err.isOperational !== undefined ? err.isOperational : false);
    const errorResponse = {
        error: isOperational ? err.message : 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: err.details
        })
    };
    
    res.status(statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Not found handler
 */
function notFoundHandler(req, res, next) {
    const error = new AppError(`Route ${req.method} ${req.path} not found`, 404);
    next(error);
}

module.exports = {
    AppError,
    errorHandler,
    asyncHandler,
    notFoundHandler
};

