// backend/src/server.js

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const { sequelize } = require('./models');
const GalileoskyParser = require('./services/parser');
const deviceManager = require('./services/deviceManager');
const packetProcessor = require('./services/packetProcessor');
const logger = require('./utils/logger');
const config = require('./config');

const { app, tcpServer } = require('./app');

// Middleware - CORS is already configured in app.js
app.use(express.json());

// Serve static files if frontend build exists
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
}

// Create parser instance
const parser = new GalileoskyParser();

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle WebSocket upgrade
wss.on('connection', (ws) => {
    logger.info('WebSocket client connected');
    ws.isAlive = true;
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            logger.error('WebSocket message error:', error);
        }
    });

    ws.on('close', () => {
        logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
    });
});

// Keep alive check
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

// Broadcast to WebSocket clients
function broadcast(topic, data) {
    logger.debug(`Broadcasting to ${wss.clients.size} clients:`, { topic, dataSize: JSON.stringify(data).length });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ topic, data }));
        }
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(ws, data) {
    logger.debug('Received WebSocket message:', data);
    // Handle different message types here
    if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
    }
}

// Serve React app for all other routes (SPA fallback) - exclude API routes
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
        return next();
    }
    
    if (fs.existsSync(frontendBuildPath)) {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    } else {
        res.status(404).json({ error: 'Frontend build not found' });
    }
});

// Error handling is done in app.js with standardized errorHandler
// No need for duplicate error handler here

// Start the server
async function startServer() {
    try {
        // Sync database
        await sequelize.sync();
        logger.info('Database synced');

        // Get HTTP server from app.js (already started)
        const { httpServer, gracefulShutdown: appShutdown } = require('./app');
        
        // Attach WebSocket server to the existing HTTP server
        httpServer.on('upgrade', (request, socket, head) => {
            logger.info('WebSocket upgrade request received', { url: request.url });
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        });

        logger.info('WebSocket server ready');

        // Enhanced graceful shutdown that also closes database
        const originalShutdown = appShutdown;
        const enhancedShutdown = async (signal) => {
            try {
                // Close database connection
                await sequelize.close();
                logger.info('Database connection closed');
            } catch (error) {
                logger.error('Error closing database:', error);
            }
            // Call original shutdown handler
            await originalShutdown(signal);
        };

        // Replace shutdown handler to include database closure
        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.once('SIGINT', () => enhancedShutdown('SIGINT'));
        process.once('SIGTERM', () => enhancedShutdown('SIGTERM'));

        logger.info('Server initialization complete');

    } catch (error) {
        logger.error('Error starting server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
});

module.exports = {
    app,
    tcpServer,
    wss,
    broadcast
};
