const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { User } = require('../models');
const logger = require('../utils/logger');
const sessionStore = require('../utils/sessionStore');

// Helper function to generate secure session token using crypto.randomBytes
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

 // Run every hour

// Login endpoint with rate limiting
const { loginRateLimit } = require('../middleware/rateLimiter');
router.post('/login', loginRateLimit, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        logger.info('Login attempt', { username, hasPassword: !!password });
        
        if (!username || !password) {
            logger.warn('Login failed - missing credentials', { username, hasPassword: !!password });
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }
        
        // Find user - SIMPLIFIED QUERY
        const user = await User.findOne({ 
            where: { username: username },
            attributes: ['id', 'username', 'password', 'firstName', 'lastName', 'role', 'roleId', 'permissions', 'isActive', 'passwordChangedAt']
        });
        
        logger.info('User lookup result', { 
            found: !!user, 
            username: user?.username,
            isActive: user?.isActive,
            role: user?.role
        });
        
        if (!user) {
            logger.warn('Login failed - user not found', { username });
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
        
        // Check if user is active - HANDLE BOTH BOOLEAN AND INTEGER
        const isActive = user.isActive === true || user.isActive === 1 || user.isActive === '1';
        if (!isActive) {
            logger.warn('Login failed - user inactive', { username, isActive: user.isActive });
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
        
        // Check password
        logger.info('Checking password for user', { username });
        const isValidPassword = await user.comparePassword(password);
        logger.info('Password check result', { username, isValid: isValidPassword });
        
        if (!isValidPassword) {
            logger.warn('Login failed - invalid password', { username });
            return res.status(401).json({ 
                error: 'Invalid username or password' 
            });
        }
        
        logger.info('Login successful', { username, userId: user.id });
        
        // Check if user must change password (passwordChangedAt is null or user is using default password)
        const mustChangePassword = !user.passwordChangedAt;
        
        // Clear any existing sessions for this user
        await sessionStore.deleteByUserId(user.id);
        logger.info('Cleared existing sessions for user', { username: user.username });
        
        // Determine which permissions to use
        let effectivePermissions = user.permissions;
        let effectiveRole = user.role;
        
        // If user has a custom role, use the custom role's permissions
        if (user.roleId) {
            const customRole = await require('../models').Role.findByPk(user.roleId);
            if (customRole) {
                effectivePermissions = customRole.permissions;
                effectiveRole = customRole.name;
            }
        }
        
        // Generate session token
        const token = generateToken();
        const session = {
            userId: user.id,
            username: user.username,
            role: effectiveRole,
            roleId: user.roleId,
            permissions: effectivePermissions,
            mustChangePassword: mustChangePassword,
            createdAt: new Date()
        };
        
        await sessionStore.set(token, session);
        
        logger.info('Session stored in database', {
            token: token.substring(0, 8) + '...',
            userId: session.userId,
            username: session.username,
            mustChangePassword: mustChangePassword
        });
        
        // Update last login
        await user.update({ lastLogin: new Date() });
        
        // Clear any existing sessionToken cookie first
        res.clearCookie('sessionToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            domain: undefined
        });
        
        // Set session cookie
        res.cookie('sessionToken', token, {
            httpOnly: true,
            secure: false, // Set to false for HTTP connections
            sameSite: 'lax', // Use 'lax' for HTTP connections
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            domain: undefined // Remove domain restriction
        });
        
        // Return user data (without password)
        const userData = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: effectiveRole,
            roleId: user.roleId,
            permissions: effectivePermissions,
            mustChangePassword: mustChangePassword
        };
        
        logger.info('User logged in successfully', { 
            username: user.username, 
            token: token.substring(0, 8) + '...',
            mustChangePassword: mustChangePassword
        });
        
        res.json(userData);
        
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    try {
        const token = req.cookies.sessionToken;
        
        if (token) {
            const session = await sessionStore.get(token);
            if (session) {
                await sessionStore.delete(token);
                logger.info('User logged out', { username: session.username });
            }
        }
        
        // Clear session cookie
        res.clearCookie('sessionToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            domain: undefined
        });
        
        res.json({ message: 'Logged out successfully' });
        
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check authentication status
router.get('/check', requireAuth, async (req, res) => {
    try {
        // Get user data from database to ensure we have the latest info
        const user = await User.findByPk(req.user.userId, {
            attributes: ['id', 'username', 'firstName', 'lastName', 'role', 'roleId', 'permissions', 'isActive'],
            include: [
                {
                    model: require('../models').Role,
                    as: 'userRole',
                    attributes: ['id', 'name', 'description', 'permissions'],
                    required: false
                }
            ]
        });
        
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }
        
        // Determine which permissions to use
        let effectivePermissions = user.permissions;
        let effectiveRole = user.role;
        
        // If user has a custom role, use the custom role's permissions
        if (user.roleId && user.userRole) {
            effectivePermissions = user.userRole.permissions;
            effectiveRole = user.userRole.name;
        }
        
        const userData = {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: effectiveRole,
            roleId: user.roleId,
            permissions: effectivePermissions
        };
        
        res.json(userData);
        
    } catch (error) {
        logger.error('Error checking authentication:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to check authentication (for other routes)
async function requireAuth(req, res, next) {
    const token = req.cookies.sessionToken;
    
    // Only log in debug mode to reduce noise and security risk
    logger.debug('requireAuth called', { 
        url: req.url,
        method: req.method,
        hasToken: !!token
    });
    
    if (!token) {
        logger.warn('Authentication failed - no token', { url: req.url });
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
        const session = await sessionStore.get(token);
        
        if (!session) {
            logger.warn('Authentication failed - invalid token', { url: req.url });
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        logger.debug('Authentication successful', {
            userId: session.userId,
            username: session.username,
            role: session.role
        });
        
        req.user = session;
        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { router, requireAuth }; 