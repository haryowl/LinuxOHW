const logger = require('../utils/logger');

class PacketTypeHandler {
    static determinePacketType(packetType) {
        if (packetType === 0x01) {
            return 'Main Packet';
        }
        if (packetType === 0x08) {
            return 'Compressed Packet';
        }
        if (packetType === 0x07) {
            return 'Photo Packet';
        }
        if (packetType === 0x15) {
            return 'Ignorable Packet';
        }
        return 'Extension';
    }

    static isMainPacket(packetType) {
        return packetType === 0x01;
    }

    static isCompressedPacket(packetType) {
        return packetType === 0x08;
    }

    static isPhotoPacket(packetType) {
        return packetType === 0x07;
    }

    static isIgnorablePacket(packetType) {
        return packetType === 0x15;
    }

    static isExtensionPacket(packetType) {
        return !this.isMainPacket(packetType)
            && !this.isCompressedPacket(packetType)
            && !this.isPhotoPacket(packetType)
            && !this.isIgnorablePacket(packetType);
    }
}

module.exports = PacketTypeHandler; 