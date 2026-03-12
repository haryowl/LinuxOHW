// backend/src/services/commandQueue.js

const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { DeviceCommand } = require('../models');
const connectionRegistry = require('./connectionRegistry');
const { buildCommandPacket } = require('./commandPacketBuilder');

class CommandQueue {
    constructor() {
        this.intervalId = null;
    }

    start(intervalMs = 5000) {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
            this.processQueue().catch(error => {
                logger.error('Command queue processing error:', error);
            });
        }, intervalMs);
    }

    getNextAttemptAt(retryCount) {
        const baseMs = 5000;
        const delay = Math.min(baseMs * Math.pow(2, retryCount), 5 * 60 * 1000);
        return new Date(Date.now() + delay);
    }

    async processQueue() {
        if (!DeviceCommand) {
            logger.error('DeviceCommand model is not loaded. Ensure backend/src/models/index.js exports DeviceCommand and the migration ran.');
            return;
        }
        const now = new Date();
        const commands = await DeviceCommand.findAll({
            where: {
                status: { [Op.in]: ['queued', 'failed'] },
                [Op.or]: [
                    { nextAttemptAt: null },
                    { nextAttemptAt: { [Op.lte]: now } }
                ]
            },
            order: [['priority', 'DESC'], ['createdAt', 'ASC']],
            limit: 20
        });

        for (const command of commands) {
            await this.processCommand(command);
        }
    }

    async processCommand(command) {
        const socket = connectionRegistry.getSocketByImei(command.imei);
        if (!socket || !socket.writable) {
            await this.markFailed(command, 'Device not connected');
            return;
        }

        if (command.retryCount >= command.maxRetries) {
            await command.update({
                status: 'failed',
                errorMessage: 'Max retries exceeded',
                nextAttemptAt: null
            });
            return;
        }

        let packetHex = command.rawPayloadHex;
        if (!packetHex) {
            try {
                const packetInfo = buildCommandPacket({
                    imei: command.imei,
                    deviceNumber: 0,
                    commandNumber: command.commandNumber,
                    commandText: command.commandText
                });
                packetHex = packetInfo.packetHex;
            } catch (error) {
                await this.markFailed(command, error.message);
                return;
            }
        }

        const normalizedHex = packetHex.replace(/^0x/i, '').replace(/\s+/g, '');
        const packet = Buffer.from(normalizedHex, 'hex');
        try {
            logger.info('Sending command packet', {
                commandId: command.id,
                imei: command.imei,
                bytes: packet.length,
                packetHex: normalizedHex.toUpperCase()
            });
            await new Promise((resolve, reject) => {
                socket.write(packet, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });

            await command.update({
                status: 'sent',
                sentAt: new Date(),
                lastAttemptAt: new Date(),
                errorMessage: null
            });
        } catch (error) {
            await this.markFailed(command, error.message || 'Socket write failed');
        }
    }

    async markFailed(command, message) {
        const nextAttemptAt = this.getNextAttemptAt(command.retryCount + 1);
        await command.update({
            status: 'failed',
            errorMessage: message,
            retryCount: command.retryCount + 1,
            lastAttemptAt: new Date(),
            nextAttemptAt
        });
    }
}

module.exports = new CommandQueue();
