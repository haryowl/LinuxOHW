'use strict';

/**
 * Build Galileosky main packets (HEAD 0x01) for device simulation / stress tests.
 */

function crc16Modbus(buffer) {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }
  return crc & 0xFFFF;
}

function wrapMainPacket(data) {
  const lengthBuf = Buffer.alloc(2);
  lengthBuf.writeUInt16LE(data.length, 0);
  const withoutCrc = Buffer.concat([Buffer.from([0x01]), lengthBuf, data]);
  const crcBuf = Buffer.alloc(2);
  crcBuf.writeUInt16LE(crc16Modbus(withoutCrc), 0);
  return Buffer.concat([withoutCrc, crcBuf]);
}

function buildImeiTag(imei) {
  if (!/^\d{15}$/.test(imei)) {
    throw new Error(`IMEI must be 15 digits: ${imei}`);
  }
  return Buffer.concat([Buffer.from([0x03]), Buffer.from(imei, 'ascii')]);
}

function buildTelemetryRecord({
  recordNumber,
  timestampSec,
  latitude = -6.2,
  longitude = 106.8,
  speedKmh = 45,
  directionDeg = 180,
  satellites = 8
}) {
  const parts = [];

  parts.push(Buffer.from([0x10]));
  const recordBuf = Buffer.alloc(2);
  recordBuf.writeUInt16LE(recordNumber & 0xffff, 0);
  parts.push(recordBuf);

  parts.push(Buffer.from([0x20]));
  const tsBuf = Buffer.alloc(4);
  tsBuf.writeUInt32LE(timestampSec >>> 0, 0);
  parts.push(tsBuf);

  parts.push(Buffer.from([0x30]));
  const coordBuf = Buffer.alloc(9);
  coordBuf.writeInt32LE(Math.round(latitude * 10000000), 0);
  coordBuf.writeInt32LE(Math.round(longitude * 10000000), 4);
  coordBuf.writeUInt8(satellites, 8);
  parts.push(coordBuf);

  parts.push(Buffer.from([0x33]));
  const motionBuf = Buffer.alloc(4);
  motionBuf.writeUInt16LE(Math.round(speedKmh * 10), 0);
  motionBuf.writeUInt16LE(Math.round(directionDeg * 10), 2);
  parts.push(motionBuf);

  return Buffer.concat(parts);
}

function buildImeiRegistrationPacket(imei) {
  return wrapMainPacket(buildImeiTag(imei));
}

function buildMultiRecordPacket({
  maxDataBytes = 1024,
  startRecordNumber = 1,
  baseTimestampSec = Math.floor(Date.now() / 1000),
  deviceIndex = 0,
  includeImei = false,
  imei = null
}) {
  const chunks = [];

  if (includeImei) {
    chunks.push(buildImeiTag(imei));
  }

  let recordNumber = startRecordNumber;
  let timestampSec = baseTimestampSec;
  const latitude = -6.2 + (deviceIndex * 0.001);
  const longitude = 106.8 + (deviceIndex * 0.001);

  while (true) {
    const record = buildTelemetryRecord({
      recordNumber,
      timestampSec,
      latitude: latitude + (recordNumber * 0.00001),
      longitude: longitude + (recordNumber * 0.00001),
      speedKmh: 30 + (recordNumber % 50),
      directionDeg: (recordNumber * 7) % 360
    });

    const nextSize = Buffer.concat(chunks).length + record.length;
    if (nextSize > maxDataBytes) {
      break;
    }

    chunks.push(record);
    recordNumber += 1;
    timestampSec += 1;
  }

  if (chunks.length === 0) {
    throw new Error('Could not fit any telemetry record into packet data budget');
  }

  const data = Buffer.concat(chunks);
  const packet = wrapMainPacket(data);

  return {
    packet,
    recordCount: includeImei ? chunks.length - 1 : chunks.length,
    dataBytes: data.length,
    endRecordNumber: recordNumber - 1
  };
}

module.exports = {
  crc16Modbus,
  wrapMainPacket,
  buildImeiRegistrationPacket,
  buildMultiRecordPacket,
  buildTelemetryRecord
};
