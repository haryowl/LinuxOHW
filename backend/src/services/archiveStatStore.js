// backend/src/services/archiveStatStore.js

class ArchiveStatStore {
    constructor() {
        this.statsByImei = new Map();
        this.lastSentAt = new Map();
        this.lastOutSentAt = new Map();
    }

    updateStats(imei, stats) {
        if (!imei) {
            return;
        }
        this.statsByImei.set(imei, {
            ...stats,
            imei,
            updatedAt: new Date().toISOString()
        });
    }

    getStats(imei) {
        return this.statsByImei.get(imei) || null;
    }

    getAllStats() {
        return Array.from(this.statsByImei.values());
    }

    shouldSendArchivestat(imei, intervalMs = 60000) {
        const last = this.lastSentAt.get(imei);
        if (!last) {
            return true;
        }
        return Date.now() - last.getTime() >= intervalMs;
    }

    markArchivestatSent(imei) {
        this.lastSentAt.set(imei, new Date());
    }

    shouldSendOut(imei, cooldownMs = 300000) {
        const last = this.lastOutSentAt.get(imei);
        if (!last) {
            return true;
        }
        return Date.now() - last.getTime() >= cooldownMs;
    }

    markOutSent(imei) {
        this.lastOutSentAt.set(imei, new Date());
    }
}

module.exports = new ArchiveStatStore();
