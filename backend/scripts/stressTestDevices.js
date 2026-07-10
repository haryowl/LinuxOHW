#!/usr/bin/env node
'use strict';

/**
 * Concurrent Galileosky TCP stress test.
 *
 * Simulates N devices sending max-size multi-record packets to the parser TCP port.
 *
 * Usage:
 *   cd backend
 *   node scripts/stressTestDevices.js --host 127.0.0.1 --port 3003 --devices 20 --packets 30
 *   node scripts/stressTestDevices.js --host 62.84.189.162 --port 3003 --devices 20 --packets 50 --max-size 1024
 *   node scripts/stressTestDevices.js --host 127.0.0.1 --devices 20 --packets 20 --verify-db
 *
 * Options:
 *   --host          TCP host (default 127.0.0.1)
 *   --port          TCP port (default 3003)
 *   --devices       Concurrent simulated devices (default 20)
 *   --packets       Telemetry packets per device after IMEI registration (default 30)
 *   --max-size      Max packet data bytes (default 1024, matches MAX_PACKET_SIZE)
 *   --interval-ms   Delay between packets per device (default 0)
 *   --ack-timeout   ACK wait timeout ms (default 15000)
 *   --imei-prefix   First 12 digits shared by test IMEIs (default 999000000000)
 *   --verify-db     Count Records inserted for test IMEIs (requires env.production)
 *   --json          Print machine-readable summary JSON
 */

const net = require('net');
const { performance } = require('perf_hooks');
const {
  buildImeiRegistrationPacket,
  buildMultiRecordPacket
} = require('./galileoskyPacketBuilder');

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: 3003,
    devices: 20,
    packets: 30,
    maxSize: 1024,
    intervalMs: 0,
    ackTimeoutMs: 15000,
    imeiPrefix: '999000000000',
    verifyDb: false,
    json: false
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--host':
        options.host = next;
        i += 1;
        break;
      case '--port':
        options.port = Number(next);
        i += 1;
        break;
      case '--devices':
        options.devices = Number(next);
        i += 1;
        break;
      case '--packets':
        options.packets = Number(next);
        i += 1;
        break;
      case '--max-size':
        options.maxSize = Number(next);
        i += 1;
        break;
      case '--interval-ms':
        options.intervalMs = Number(next);
        i += 1;
        break;
      case '--ack-timeout':
        options.ackTimeoutMs = Number(next);
        i += 1;
        break;
      case '--imei-prefix':
        options.imeiPrefix = next;
        i += 1;
        break;
      case '--verify-db':
        options.verifyDb = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        console.log(`See script header in ${__filename}`);
        process.exit(0);
      default:
        break;
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTestImei(prefix, deviceIndex) {
  const suffix = String(deviceIndex).padStart(3, '0');
  const imei = `${prefix}${suffix}`;
  if (!/^\d{15}$/.test(imei)) {
    throw new Error(`Invalid test IMEI generated: ${imei}`);
  }
  return imei;
}

function waitForAck(socket, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const onData = (chunk) => {
      if (settled) return;
      if (chunk.length >= 3 && chunk[0] === 0x02) {
        settled = true;
        cleanup();
        resolve({
          ackHex: chunk.slice(0, 3).toString('hex').toUpperCase(),
          ackBytes: 3
        });
      }
    };

    const onError = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onClose = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Socket closed before ACK'));
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`ACK timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
  });
}

function connectDevice(host, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setNoDelay(true);
    socket.connect(port, host, () => resolve(socket));
    socket.once('error', reject);
  });
}

async function runDeviceSimulation(deviceIndex, options) {
  const imei = buildTestImei(options.imeiPrefix, deviceIndex);
  const stats = {
    deviceIndex,
    imei,
    connected: false,
    registrationAck: false,
    packetsSent: 0,
    acksReceived: 0,
    recordsSent: 0,
    bytesSent: 0,
    failures: [],
    ackLatenciesMs: []
  };

  let socket;
  const startedAt = performance.now();

  try {
    socket = await connectDevice(options.host, options.port);
    stats.connected = true;

    const regPacket = buildImeiRegistrationPacket(imei);
    socket.write(regPacket);
    stats.bytesSent += regPacket.length;
    const regAckStart = performance.now();
    await waitForAck(socket, options.ackTimeoutMs);
    stats.registrationAck = true;
    stats.acksReceived += 1;
    stats.ackLatenciesMs.push(performance.now() - regAckStart);

    let nextRecordNumber = 1;
    const baseTimestamp = Math.floor(Date.now() / 1000) - (deviceIndex * 1000);

    for (let packetIndex = 0; packetIndex < options.packets; packetIndex++) {
      const built = buildMultiRecordPacket({
        maxDataBytes: options.maxSize,
        startRecordNumber: nextRecordNumber,
        baseTimestampSec: baseTimestamp + (packetIndex * 60),
        deviceIndex
      });

      nextRecordNumber = built.endRecordNumber + 1;
      stats.recordsSent += built.recordCount;

      const ackStart = performance.now();
      socket.write(built.packet);
      stats.packetsSent += 1;
      stats.bytesSent += built.packet.length;

      await waitForAck(socket, options.ackTimeoutMs);
      stats.acksReceived += 1;
      stats.ackLatenciesMs.push(performance.now() - ackStart);

      if (options.intervalMs > 0) {
        await sleep(options.intervalMs);
      }
    }
  } catch (error) {
    stats.failures.push(error.message);
  } finally {
    if (socket) {
      socket.destroy();
    }
    stats.durationMs = Math.round(performance.now() - startedAt);
    stats.avgAckLatencyMs = stats.ackLatenciesMs.length
      ? Math.round(stats.ackLatenciesMs.reduce((sum, value) => sum + value, 0) / stats.ackLatenciesMs.length)
      : null;
    stats.p95AckLatencyMs = percentile(stats.ackLatenciesMs, 95);
  }

  return stats;
}

function percentile(values, pct) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((pct / 100) * sorted.length) - 1);
  return Math.round(sorted[index]);
}

function summarize(deviceStats, options, totalDurationMs) {
  const totalPackets = deviceStats.reduce((sum, item) => sum + item.packetsSent, 0);
  const totalAcks = deviceStats.reduce((sum, item) => sum + item.acksReceived, 0);
  const totalRecords = deviceStats.reduce((sum, item) => sum + item.recordsSent, 0);
  const totalBytes = deviceStats.reduce((sum, item) => sum + item.bytesSent, 0);
  const totalFailures = deviceStats.reduce((sum, item) => sum + item.failures.length, 0);
  const connected = deviceStats.filter((item) => item.connected).length;
  const registered = deviceStats.filter((item) => item.registrationAck).length;
  const allLatencies = deviceStats.flatMap((item) => item.ackLatenciesMs);

  return {
    host: options.host,
    port: options.port,
    devices: options.devices,
    packetsPerDevice: options.packets,
    maxPacketDataBytes: options.maxSize,
    totalDurationMs,
    connectedDevices: connected,
    registeredDevices: registered,
    totalTelemetryPackets: totalPackets,
    totalAcks,
    totalRecordsAttempted: totalRecords,
    totalBytesSent: totalBytes,
    failures: totalFailures,
    throughputPacketsPerSec: totalDurationMs > 0
      ? Number((totalPackets / (totalDurationMs / 1000)).toFixed(2))
      : 0,
    throughputRecordsPerSec: totalDurationMs > 0
      ? Number((totalRecords / (totalDurationMs / 1000)).toFixed(2))
      : 0,
    avgAckLatencyMs: allLatencies.length
      ? Math.round(allLatencies.reduce((sum, value) => sum + value, 0) / allLatencies.length)
      : null,
    p95AckLatencyMs: percentile(allLatencies, 95),
    maxAckLatencyMs: allLatencies.length ? Math.round(Math.max(...allLatencies)) : null,
    perDevice: deviceStats
  };
}

async function verifyDatabaseCounts(options) {
  try {
    const { loadProductionEnv } = require('../src/utils/loadProductionEnv');
    const { sequelize } = require('../models');
    loadProductionEnv();
    await sequelize.authenticate();

    const imeis = [];
    for (let i = 1; i <= options.devices; i++) {
      imeis.push(buildTestImei(options.imeiPrefix, i));
    }

    const placeholders = imeis.map((_, index) => `:imei${index}`).join(', ');
    const replacements = {};
    imeis.forEach((imei, index) => {
      replacements[`imei${index}`] = imei;
    });

    const dialect = sequelize.getDialect();
    const inClause = dialect === 'postgres'
      ? imeis.map((imei) => `'${imei}'`).join(', ')
      : imeis.map((imei) => `'${imei}'`).join(', ');

    const [rows] = await sequelize.query(`
      SELECT "deviceImei", COUNT(*)::bigint AS count
      FROM "Records"
      WHERE "deviceImei" IN (${inClause})
      GROUP BY "deviceImei"
      ORDER BY "deviceImei"
    `);

    await sequelize.close();
    return rows;
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  const options = parseArgs(process.argv);

  if (!Number.isFinite(options.devices) || options.devices < 1) {
    throw new Error('--devices must be >= 1');
  }
  if (!Number.isFinite(options.packets) || options.packets < 1) {
    throw new Error('--packets must be >= 1');
  }

  console.log('Galileosky TCP stress test');
  console.log('========================');
  console.log(`Target: ${options.host}:${options.port}`);
  console.log(`Devices: ${options.devices} concurrent`);
  console.log(`Packets/device: ${options.packets} (max data ${options.maxSize} bytes, multi-record)`);
  console.log('');

  const startedAt = performance.now();
  const deviceIndexes = Array.from({ length: options.devices }, (_, index) => index + 1);
  const deviceStats = await Promise.all(
    deviceIndexes.map((deviceIndex) => runDeviceSimulation(deviceIndex, options))
  );
  const totalDurationMs = Math.round(performance.now() - startedAt);
  const summary = summarize(deviceStats, options, totalDurationMs);

  if (options.verifyDb) {
    summary.database = await verifyDatabaseCounts(options);
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    printHumanSummary(summary);
  }

  if (summary.failures > 0 || summary.registeredDevices < options.devices) {
    process.exit(1);
  }
}

function printHumanSummary(summary) {
  console.log('Results');
  console.log('-------');
  console.log(`Duration: ${summary.totalDurationMs} ms`);
  console.log(`Connected: ${summary.connectedDevices}/${summary.devices}`);
  console.log(`Registered (IMEI ACK): ${summary.registeredDevices}/${summary.devices}`);
  console.log(`Telemetry packets sent: ${summary.totalTelemetryPackets}`);
  console.log(`ACKs received: ${summary.totalAcks}`);
  console.log(`Records in packets: ${summary.totalRecordsAttempted}`);
  console.log(`Bytes sent: ${summary.totalBytesSent}`);
  console.log(`Throughput: ${summary.throughputPacketsPerSec} packets/s, ${summary.throughputRecordsPerSec} records/s`);
  console.log(`ACK latency avg/p95/max: ${summary.avgAckLatencyMs}/${summary.p95AckLatencyMs}/${summary.maxAckLatencyMs} ms`);
  console.log(`Failures: ${summary.failures}`);
  console.log('');

  console.log('Per device');
  console.log('----------');
  for (const device of summary.perDevice) {
    const status = device.failures.length
      ? `FAIL (${device.failures[0]})`
      : 'OK';
    console.log(
      `#${String(device.deviceIndex).padStart(2, '0')} ${device.imei} | packets=${device.packetsSent} records=${device.recordsSent} acks=${device.acksReceived} avgAck=${device.avgAckLatencyMs}ms | ${status}`
    );
  }

  if (summary.database) {
    console.log('');
    console.log('Database verification');
    console.log('---------------------');
    if (summary.database.error) {
      console.log(`Skipped: ${summary.database.error}`);
    } else {
      let total = 0;
      for (const row of summary.database) {
        const count = Number(row.count || 0);
        total += count;
        console.log(`${row.deviceImei}: ${count} records`);
      }
      console.log(`Total saved for test IMEIs: ${total}`);
    }
  }

  console.log('');
  console.log('Note: test IMEIs use prefix', summary.perDevice[0]?.imei?.slice(0, 12) || '999000000000');
}

main().catch((error) => {
  console.error('Stress test failed:', error.message);
  process.exit(1);
});
