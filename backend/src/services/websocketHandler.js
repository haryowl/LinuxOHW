// backend/src/services/websocketHandler.js

const WebSocket = require('ws');
const config = require('../config');
const logger = require('../utils/logger');
const sessionStore = require('../utils/sessionStore');
const { resolveAccessibleDeviceImeis, canAccessDeviceImei } = require('../utils/accessibleDevices');

function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    cookieHeader.split(';').forEach((part) => {
        const [key, ...rest] = part.trim().split('=');
        if (key) {
            cookies[key] = decodeURIComponent(rest.join('='));
        }
    });
    return cookies;
}

class WebSocketHandler {
    constructor() {
        this.clients = new Map();
        this.statistics = new Map();
    }

    initialize(server) {
        this.wss = new WebSocket.Server({
            server,
            path: '/ws',
            clientTracking: true
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req).catch((error) => {
                logger.error('WebSocket connection setup failed:', error);
                ws.close(1011, 'Connection setup failed');
            });
        });

        setInterval(() => {
            this.checkConnections();
        }, config.websocket.heartbeatInterval);

        logger.info('WebSocket server initialized');
    }

    checkConnections() {
        this.wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                logger.debug(`Terminating inactive WebSocket connection from ${ws.ip}`);
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();
        });
    }

    async handleConnection(ws, req) {
        const cookies = parseCookies(req.headers.cookie);
        const token = cookies.sessionToken;

        if (!token) {
            ws.close(4401, 'Authentication required');
            return;
        }

        const session = await sessionStore.get(token);
        if (!session) {
            ws.close(4401, 'Authentication required');
            return;
        }

        ws.isAlive = true;
        ws.ip = req.socket.remoteAddress;
        ws.user = session;
        ws.accessibleImeis = await resolveAccessibleDeviceImeis(session);

        logger.debug(`Authenticated WebSocket connection from ${ws.ip}`, {
            username: session.username,
            role: session.role
        });

        ws.on('pong', () => {
            ws.isAlive = true;
        });

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                this.handleMessage(ws, data);
            } catch (error) {
                logger.error('WebSocket message error:', error);
            }
        });

        ws.on('close', () => {
            this.handleDisconnect(ws);
        });
    }

    extractImei(topic, data) {
        if (!data) {
            return null;
        }
        return data.imei || data.deviceImei || data.deviceId || null;
    }

    canClientReceive(client, topic, data) {
        if (!client.user) {
            return false;
        }

        if (client.user.role === 'admin' || client.accessibleImeis === null) {
            return true;
        }

        const imei = this.extractImei(topic, data);
        if (!imei) {
            return topic === 'system_status' || topic === 'archivestat_update';
        }

        return canAccessDeviceImei(client.accessibleImeis, imei);
    }

    handleMessage(ws, message) {
        switch (message.type) {
            case 'subscribe':
                this.subscribeToDevice(ws, message.deviceId);
                break;
            case 'unsubscribe':
                this.unsubscribeFromDevice(ws, message.deviceId);
                break;
            default:
                logger.warn('Unknown message type:', message.type);
        }
    }

    subscribeToDevice(ws, deviceId) {
        if (!ws.user || !deviceId) {
            return;
        }

        if (!canAccessDeviceImei(ws.accessibleImeis, deviceId)) {
            logger.warn('WebSocket subscribe denied', {
                username: ws.user.username,
                deviceId
            });
            return;
        }

        if (!this.clients.has(deviceId)) {
            this.clients.set(deviceId, new Set());
        }
        this.clients.get(deviceId).add(ws);
        ws.subscribedDevices = ws.subscribedDevices || new Set();
        ws.subscribedDevices.add(deviceId);
    }

    unsubscribeFromDevice(ws, deviceId) {
        const deviceClients = this.clients.get(deviceId);
        if (deviceClients) {
            deviceClients.delete(ws);
        }
        if (ws.subscribedDevices) {
            ws.subscribedDevices.delete(deviceId);
        }
    }

    handleDisconnect(ws) {
        if (ws.subscribedDevices) {
            ws.subscribedDevices.forEach((deviceId) => {
                const deviceClients = this.clients.get(deviceId);
                if (deviceClients) {
                    deviceClients.delete(ws);
                }
            });
        }
    }

    broadcast(topic, data) {
        if (!this.wss) {
            return;
        }

        const message = JSON.stringify({
            type: 'broadcast',
            topic,
            data
        });

        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && this.canClientReceive(client, topic, data)) {
                client.send(message);
            }
        });
    }

    broadcastDeviceData(deviceId, data) {
        const clients = this.clients.get(deviceId);
        if (clients) {
            const message = JSON.stringify({
                type: 'deviceData',
                deviceId,
                data,
                topic: data?.topic
            });

            clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN && this.canClientReceive(client, data?.topic, { ...data, imei: deviceId })) {
                    client.send(message);
                }
            });
        }
    }

    updateStatistics(deviceId, stats) {
        this.statistics.set(deviceId, {
            ...stats,
            timestamp: new Date()
        });
    }
}

module.exports = new WebSocketHandler();
