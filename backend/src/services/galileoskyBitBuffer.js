/**
 * Bit-level reader for Galileosky compressed minimal data set (10 bytes).
 */
class GalileoskyBitBuffer {
    constructor(buffer) {
        this.buffer = buffer;
        this.bitPos = 0;
    }

    readUnsigned(bits) {
        let result = 0;
        for (let i = 0; i < bits; i++) {
            const byteIndex = Math.floor(this.bitPos / 8);
            const bitIndex = 7 - (this.bitPos % 8);
            const bit = (this.buffer[byteIndex] >> bitIndex) & 1;
            result = (result << 1) | bit;
            this.bitPos += 1;
        }
        return result;
    }
}

function popcount(byte) {
    let count = 0;
    let value = byte & 0xff;
    while (value) {
        count += value & 1;
        value >>= 1;
    }
    return count;
}

module.exports = {
    GalileoskyBitBuffer,
    popcount
};
