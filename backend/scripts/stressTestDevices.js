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
 *   node scripts/stressTestDevices.js --host 62.84.189.162 --devices 50 --duration-sec 7200 --interval-ms 30000
 *
 * Options:
 *   --host          TCP host (default 127.0.0.1)
 *   --port          TCP port (default 3003)
 *   --devices       Concurrent simulated devices (default 20)
 *   --packets       Telemetry packets per device after IMEI registration (default 30)
 *   --duration-sec  Soak duration in seconds (overrides --packets when > 0)
 *   --max-size      Max packet data bytes (default 1024, matches MAX_PACKET_SIZE)
 *   --interval-ms   Delay between packets per device (default 0)
 *   --ack-timeout   ACK wait timeout ms (default 15000)
 *   --imei-prefix   First 12 digits shared by test IMEIs (default 999000000000)
 *   --chunk-mode    full | partial | random | split-header | byte (default full)
 *   --chunk-size    Bytes per write in partial mode (default 7)
 *   --chunk-delay   Delay ms between chunk writes (default 0)
 *   --progress-sec  Progress log interval seconds in duration mode (default 60)
 *   --retries       Retries for same packet after ACK/send failure before skipping (default 3)
 *   --extended-tags Include 0xFE extended tags (Modbus 0x0001/0x0002) in each record
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
    durationSec: 0,
    maxSize: 1024,
    intervalMs: 0,
    ackTimeoutMs: 15000,
    imeiPrefix: '999000000000',
    chunkMode: 'full',
    chunkSize: 7,
    chunkDelayMs: 0,
    progressSec: 60,
    retries: 3,
    extendedTags: false,
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
      case '--duration-sec':
        options.durationSec = Number(next);
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
      case '--chunk-mode':
        options.chunkMode = next;
        i += 1;
        break;
      case '--chunk-size':
        options.chunkSize = Number(next);
        i += 1;
        break;
      case '--chunk-delay':
        options.chunkDelayMs = Number(next);
        i += 1;
        break;
      case '--progress-sec':
        options.progressSec = Number(next);
        i += 1;
        break;
      case '--retries':
        options.retries = Number(next);
        i += 1;
        break;
      case '--extended-tags':
        options.extendedTags = true;
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

function buildChunkPlan(packet, options, deviceIndex, packetIndex) {
  const mode = options.chunkMode;
  const chunks = [];

  if (mode === 'full') {
    return [packet];
  }

  if (mode === 'byte') {
    for (let offset = 0; offset < packet.length; offset++) {
      chunks.push(packet.slice(offset, offset + 1));
    }
    return chunks;
  }

  if (mode === 'split-header') {
    // Exercises 1–2 byte TCP remainders at frame start (HEAD + partial LENGTH)
    const splitAt = 2 + ((deviceIndex + packetIndex) % 2);
    chunks.push(packet.slice(0, splitAt));
    chunks.push(packet.slice(splitAt));
    return chunks;
  }

  if (mode === 'random') {
    let offset = 0;
    let seed = deviceIndex * 1000 + packetIndex * 17 + 3;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed;
    };
    while (offset < packet.length) {
      const maxChunk = Math.min(31, packet.length - offset);
      const size = 1 + (rand() % maxChunk);
      chunks.push(packet.slice(offset, offset + size));
      offset += size;
    }
    return chunks;
  }

  // partial: fixed-size chunks
  const size = Math.max(1, options.chunkSize || 7);
  for (let offset = 0; offset < packet.length; offset += size) {
    chunks.push(packet.slice(offset, offset + size));
  }
  return chunks;
}

async function sendPacketChunked(socket, packet, options, deviceIndex, packetIndex) {
  const chunks = buildChunkPlan(packet, options, deviceIndex, packetIndex);
  for (const chunk of chunks) {
    await new Promise((resolve, reject) => {
      socket.write(chunk, (error) => (error ? reject(error) : resolve()));
    });
    if (options.chunkDelayMs > 0) {
      await sleep(options.chunkDelayMs);
    }
  }
  return chunks.length;
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
    socket.setKeepAlive(true, 10000);
    socket.connect(port, host, () => resolve(socket));
    socket.once('error', reject);
  });
}

async function runDeviceSimulation(deviceIndex, options, sharedProgress) {
  const imei = buildTestImei(options.imeiPrefix, deviceIndex);
  const stats = {
    deviceIndex,
    imei,
    connected: false,
    registrationAck: false,
    reconnects: 0,
    packetRetries: 0,
    packetsSent: 0,
    acksReceived: 0,
    recordsSent: 0,
    bytesSent: 0,
    chunksSent: 0,
    failures: [],
    ackLatenciesMs: []
  };

  let socket;
  const startedAt = performance.now();
  const durationMs = options.durationSec > 0 ? options.durationSec * 1000 : 0;
  const useDuration = durationMs > 0;
  const maxRetries = Number.isFinite(options.retries) ? Math.max(0, options.retries) : 3;
  let nextRecordNumber = 1;
  // Use near-real wall-clock times (small per-device stagger only) so Gap Analysis /
  // Data Export date filters match what operators expect.
  const baseTimestamp = Math.floor(Date.now() / 1000) - (deviceIndex * 5);
  let packetIndex = 0;

  const shouldContinue = () => {
    if (useDuration) {
      return (performance.now() - startedAt) < durationMs;
    }
    return packetIndex < options.packets;
  };

  const ensureConnected = async () => {
    if (socket && !socket.destroyed) {
      return;
    }
    if (socket) {
      socket.destroy();
      socket = null;
      stats.reconnects += 1;
    }
    socket = await connectDevice(options.host, options.port);
    stats.connected = true;

    const regPacket = buildImeiRegistrationPacket(imei);
    const regChunks = await sendPacketChunked(socket, regPacket, options, deviceIndex, 0);
    stats.chunksSent += regChunks;
    stats.bytesSent += regPacket.length;
    const regAckStart = performance.now();
    await waitForAck(socket, options.ackTimeoutMs);
    stats.registrationAck = true;
    stats.acksReceived += 1;
    stats.ackLatenciesMs.push(performance.now() - regAckStart);
  };

  try {
    while (shouldContinue()) {
        const built = buildMultiRecordPacket({
          maxDataBytes: options.maxSize,
          startRecordNumber: nextRecordNumber,
          baseTimestampSec: baseTimestamp + (packetIndex * 60),
          deviceIndex,
          includeExtendedTags: !!options.extendedTags
        });

      let delivered = false;
      let lastError = null;

      for (let attempt = 0; attempt <= maxRetries && shouldContinue(); attempt++) {
        try {
          if (attempt > 0) {
            stats.packetRetries += 1;
            if (socket) {
              socket.destroy();
              socket = null;
            }
            await sleep(Math.min(2000 * attempt, 5000));
          }

          await ensureConnected();

          const ackStart = performance.now();
          const chunkCount = await sendPacketChunked(socket, built.packet, options, deviceIndex, packetIndex + 1);
          stats.chunksSent += chunkCount;
          stats.bytesSent += built.packet.length;

          await waitForAck(socket, options.ackTimeoutMs);
          stats.acksReceived += 1;
          stats.ackLatenciesMs.push(performance.now() - ackStart);
          stats.packetsSent += 1;
          stats.recordsSent += built.recordCount;
          delivered = true;

          if (sharedProgress) {
            sharedProgress.packetsSent += 1;
            sharedProgress.acksReceived += 1;
            sharedProgress.recordsSent += built.recordCount;
          }
          break;
        } catch (error) {
          lastError = error;
          if (socket) {
            socket.destroy();
            socket = null;
          }
        }
      }

      if (!delivered) {
        if (stats.failures.length < 20) {
          stats.failures.push(lastError?.message || 'packet delivery failed after retries');
        } else if (stats.failures.length === 20) {
          stats.failures.push('…additional errors truncated');
        }
        if (!useDuration) {
          break;
        }
        // After retries exhausted, skip this packet (real device would keep retrying;
        // for soak we continue so the run can finish under heavy fault injection)
        nextRecordNumber = built.endRecordNumber + 1;
        packetIndex += 1;
        await sleep(1000);
        continue;
      }

      nextRecordNumber = built.endRecordNumber + 1;
      packetIndex += 1;

      if (options.intervalMs > 0 && shouldContinue()) {
        await sleep(options.intervalMs);
      }
    }
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
  const totalChunks = deviceStats.reduce((sum, item) => sum + item.chunksSent, 0);
  const totalFailures = deviceStats.reduce((sum, item) => sum + item.failures.length, 0);
  const connected = deviceStats.filter((item) => item.connected).length;
  const registered = deviceStats.filter((item) => item.registrationAck).length;
  const allLatencies = deviceStats.flatMap((item) => item.ackLatenciesMs);

  return {
    host: options.host,
    port: options.port,
    devices: options.devices,
    packetsPerDevice: options.packets,
    durationSec: options.durationSec || 0,
    intervalMs: options.intervalMs || 0,
    maxPacketDataBytes: options.maxSize,
    chunkMode: options.chunkMode,
    chunkSize: options.chunkSize,
    totalDurationMs,
    connectedDevices: connected,
    registeredDevices: registered,
    totalTelemetryPackets: totalPackets,
    totalAcks,
    totalRecordsAttempted: totalRecords,
    totalBytesSent: totalBytes,
    totalChunksSent: totalChunks,
    totalReconnects: deviceStats.reduce((sum, item) => sum + (item.reconnects || 0), 0),
    totalPacketRetries: deviceStats.reduce((sum, item) => sum + (item.packetRetries || 0), 0),
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
  if (options.durationSec > 0) {
    if (!Number.isFinite(options.durationSec)) {
      throw new Error('--duration-sec must be a number');
    }
  } else if (!Number.isFinite(options.packets) || options.packets < 1) {
    throw new Error('--packets must be >= 1 (or use --duration-sec)');
  }

  console.log('Galileosky TCP stress test');
  console.log('========================');
  console.log(`Target: ${options.host}:${options.port}`);
  console.log(`Devices: ${options.devices} concurrent`);
  if (options.durationSec > 0) {
    console.log(`Mode: soak ${options.durationSec}s (~${(options.durationSec / 3600).toFixed(2)}h)`);
    console.log(`Interval: ${options.intervalMs} ms between packets/device`);
  } else {
    console.log(`Packets/device: ${options.packets} (max data ${options.maxSize} bytes, multi-record)`);
  }
  console.log(`Max packet data: ${options.maxSize} bytes`);
  console.log(`Extended tags (0xFE): ${options.extendedTags ? 'yes (Modbus 0x0001/0x0002)' : 'no'}`);
  console.log(`Chunk mode: ${options.chunkMode}${options.chunkMode === 'partial' ? ` (size ${options.chunkSize})` : ''}`);
  console.log(`IMEI prefix: ${options.imeiPrefix}`);
  console.log('');

  const startedAt = performance.now();
  const sharedProgress = { packetsSent: 0, acksReceived: 0, recordsSent: 0 };
  let progressTimer = null;
  if (options.durationSec > 0 && options.progressSec > 0) {
    progressTimer = setInterval(() => {
      const elapsedSec = Math.round((performance.now() - startedAt) / 1000);
      const remainingSec = Math.max(0, options.durationSec - elapsedSec);
      console.log(
        `[progress ${elapsedSec}s / ${options.durationSec}s | remaining ~${remainingSec}s] ` +
        `packets=${sharedProgress.packetsSent} acks=${sharedProgress.acksReceived} records=${sharedProgress.recordsSent}`
      );
    }, options.progressSec * 1000);
  }

  const deviceIndexes = Array.from({ length: options.devices }, (_, index) => index + 1);
  const deviceStats = await Promise.all(
    deviceIndexes.map((deviceIndex) => runDeviceSimulation(deviceIndex, options, sharedProgress))
  );
  if (progressTimer) {
    clearInterval(progressTimer);
  }
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

  if (summary.registeredDevices < options.devices) {
    process.exit(1);
  }
  if (options.durationSec > 0) {
    // Soak mode: transient reconnect errors are expected; fail only if almost no traffic
    if (summary.totalTelemetryPackets < options.devices) {
      process.exit(1);
    }
  } else if (summary.failures > 0) {
    process.exit(1);
  }
}

function printHumanSummary(summary) {
  console.log('Results');
  console.log('-------');
  console.log(`Duration: ${summary.totalDurationMs} ms`);
  if (summary.durationSec) {
    console.log(`Requested soak: ${summary.durationSec}s, interval ${summary.intervalMs}ms`);
  }
  console.log(`Connected: ${summary.connectedDevices}/${summary.devices}`);
  console.log(`Registered (IMEI ACK): ${summary.registeredDevices}/${summary.devices}`);
  console.log(`Telemetry packets sent: ${summary.totalTelemetryPackets}`);
  console.log(`ACKs received: ${summary.totalAcks}`);
  console.log(`Records in packets: ${summary.totalRecordsAttempted}`);
  console.log(`Bytes sent: ${summary.totalBytesSent}`);
  console.log(`TCP chunks sent: ${summary.totalChunksSent}`);
  console.log(`Reconnects: ${summary.totalReconnects}`);
  console.log(`Packet retries: ${summary.totalPacketRetries || 0}`);
  console.log(`Chunk mode: ${summary.chunkMode}`);
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
      `#${String(device.deviceIndex).padStart(2, '0')} ${device.imei} | packets=${device.packetsSent} records=${device.recordsSent} chunks=${device.chunksSent} acks=${device.acksReceived} avgAck=${device.avgAckLatencyMs}ms | ${status}`
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
