const logger = require('../utils/logger');

const DELTA = 0x9E3779B9;
const ROUNDS = 32;

const PLAINTEXT_HEADERS = new Set([0x15, 0x07]);

function parseKey(keyMaterial) {
    if (!keyMaterial) {
        return null;
    }

    const trimmed = String(keyMaterial).trim();
    if (/^[0-9a-fA-F]{32}$/.test(trimmed)) {
        return Buffer.from(trimmed, 'hex');
    }

    const key = Buffer.from(trimmed, 'utf8');
    if (key.length !== 16) {
        throw new Error('GALILEOSKY_XTEA_KEY must be 16 bytes (or 32 hex characters)');
    }
    return key;
}

function toKeySchedule(key) {
    return [
        key.readUInt32LE(0),
        key.readUInt32LE(4),
        key.readUInt32LE(8),
        key.readUInt32LE(12)
    ];
}

function decryptBlock(block, keySchedule) {
    let v0 = block.readUInt32LE(0);
    let v1 = block.readUInt32LE(4);
    let sum = (DELTA * ROUNDS) >>> 0;

    for (let i = 0; i < ROUNDS; i++) {
        v1 = (v1 - (((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + keySchedule[(sum >>> 11) & 3])) >>> 0)) >>> 0;
        sum = (sum - DELTA) >>> 0;
        v0 = (v0 - (((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + keySchedule[sum & 3])) >>> 0)) >>> 0;
    }

    const out = Buffer.alloc(8);
    out.writeUInt32LE(v0, 0);
    out.writeUInt32LE(v1, 4);
    return out;
}

function decryptBuffer(ciphertext, key) {
    if (ciphertext.length === 0 || ciphertext.length % 8 !== 0) {
        throw new Error(`XTEA ciphertext length must be a multiple of 8 (got ${ciphertext.length})`);
    }

    const keySchedule = toKeySchedule(key);
    const plaintext = Buffer.alloc(ciphertext.length);

    for (let offset = 0; offset < ciphertext.length; offset += 8) {
        const block = decryptBlock(ciphertext.slice(offset, offset + 8), keySchedule);
        block.copy(plaintext, offset);
    }

    return plaintext;
}

function isEncryptablePacket(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
        return false;
    }
    const header = buffer.readUInt8(0);
    return !PLAINTEXT_HEADERS.has(header);
}

/**
 * Decrypt the data section of a Galileosky packet (bytes after HEAD+LENGTH, before CRC).
 * Header, length field, and CRC are left unchanged.
 */
function decryptPacketBody(buffer, keyMaterial) {
    const key = parseKey(keyMaterial);
    if (!key || !isEncryptablePacket(buffer)) {
        return buffer;
    }

    const rawLength = buffer.readUInt16LE(1);
    const actualLength = rawLength & 0x7fff;
    const dataStart = 3;
    const dataEnd = dataStart + actualLength;

    if (actualLength === 0 || actualLength % 8 !== 0) {
        return buffer;
    }

    if (buffer.length < dataEnd + 2) {
        throw new Error('Incomplete encrypted packet');
    }

    const decryptedData = decryptBuffer(buffer.slice(dataStart, dataEnd), key);
    const output = Buffer.from(buffer);
    decryptedData.copy(output, dataStart);

    logger.debug('XTEA packet body decrypted', {
        header: `0x${buffer.readUInt8(0).toString(16).padStart(2, '0')}`,
        dataLength: actualLength
    });

    return output;
}

module.exports = {
    parseKey,
    decryptPacketBody,
    isEncryptablePacket
};
