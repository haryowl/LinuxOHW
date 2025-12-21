// backend/src/middleware/rateLimiter.js
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

// Simple in-memory rate limiter
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    }

    cleanup() {
        const now = Date.now();
        for (const [key, data] of this.requests.entries()) {
            if (now > data.resetTime) {
                this.requests.delete(key);
            }
        }
    }

    check(identifier, maxRequests, windowMs) {
        const now = Date.now();
        const key = identifier;

        if (!this.requests.has(key)) {
            this.requests.set(key, {
                count: 1,
                resetTime: now + windowMs
            });
            return { allowed: true, remaining: maxRequests - 1 };
        }

        const data = this.requests.get(key);

        if (now > data.resetTime) {
            // Window expired, reset
            data.count = 1;
            data.resetTime = now + windowMs;
            return { allowed: true, remaining: maxRequests - 1 };
        }

        if (data.count >= maxRequests) {
            return { 
                allowed: false, 
                remaining: 0,
                resetTime: data.resetTime
            };
        }

        data.count++;
        return { 
            allowed: true, 
            remaining: maxRequests - data.count 
        };
    }
}

const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @param {function} getIdentifier - Function to get unique identifier (default: IP address)
 */
function rateLimit(maxRequests = 100, windowMs = 900000, getIdentifier = null) {
    return (req, res, next) => {
        try {
            // Get identifier (IP address by default)
            const identifier = getIdentifier 
                ? getIdentifier(req) 
                : req.ip || req.connection.remoteAddress || 'unknown';

            const result = rateLimiter.check(identifier, maxRequests, windowMs);

            // Set rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests);
            res.setHeader('X-RateLimit-Remaining', result.remaining);
            if (result.resetTime) {
                res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
            }

            if (!result.allowed) {
                logger.warn('Rate limit exceeded', { 
                    identifier, 
                    url: req.url,
                    method: req.method 
                });
                throw new AppError('Too many requests, please try again later', 429);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Stricter rate limit for login endpoint
 */
function loginRateLimit(req, res, next) {
    return rateLimit(5, 60000, (req) => {
        // Use IP + username for login attempts
        const username = req.body?.username || 'unknown';
        return `${req.ip}-${username}`;
    })(req, res, next);
}

module.exports = {
    rateLimit,
    loginRateLimit
};






