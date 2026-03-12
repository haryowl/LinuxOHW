// backend/src/services/connectionRegistry.js

class ConnectionRegistry {
    constructor() {
        this.connections = new Map(); // connectionId -> socket
        this.imeiToConnection = new Map(); // imei -> connectionId
    }

    registerConnection(connectionId, socket) {
        this.connections.set(connectionId, socket);
    }

    removeConnection(connectionId) {
        this.connections.delete(connectionId);
        for (const [imei, mappedId] of this.imeiToConnection.entries()) {
            if (mappedId === connectionId) {
                this.imeiToConnection.delete(imei);
            }
        }
    }

    bindImeiToConnection(imei, connectionId) {
        if (!imei || !connectionId) {
            return;
        }
        this.imeiToConnection.set(imei, connectionId);
    }

    getSocketByImei(imei) {
        const connectionId = this.imeiToConnection.get(imei);
        if (!connectionId) {
            return null;
        }
        return this.connections.get(connectionId) || null;
    }

    getConnectedImeis() {
        return Array.from(this.imeiToConnection.keys());
    }

    getConnectionStats() {
        return {
            totalConnections: this.connections.size,
            totalBoundImei: this.imeiToConnection.size
        };
    }
}

module.exports = new ConnectionRegistry();
