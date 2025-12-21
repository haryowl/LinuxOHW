// New HTTP Data Forwarder Service
const axios = require('axios');
const packetQueue = require('./packetQueue');
const fs = require('fs');
const path = require('path');
const { Record } = require('../models');

// Load config (simple JSON for now)
const configPath = path.join(__dirname, '../config/dataForwarder.json');
let config = { enabled: false, targetUrl: 'http://accessmyship.com:8008/GpsGate/' };
if (fs.existsSync(configPath)) {
  config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
}

const logPath = path.join(__dirname, '../../logs/data-forwarder.log');
function logForwarder(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile(logPath, line, err => { if (err) console.error('Forwarder log error:', err); });
}

function toNmeaLat(lat) {
  if (lat == null) return [null, 'N'];
  const hemi = lat >= 0 ? 'N' : 'S';
  const abs = Math.abs(lat);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return [deg.toString().padStart(2, '0') + (min.toFixed(4).padStart(7, '0')), hemi];
}
function toNmeaLon(lon) {
  if (lon == null) return [null, 'E'];
  const hemi = lon >= 0 ? 'E' : 'W';
  const abs = Math.abs(lon);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return [deg.toString().padStart(3, '0') + (min.toFixed(4).padStart(7, '0')), hemi];
}
function toKnots(speed) {
  if (speed == null) return '';
  // Assume speed is in km/h; convert to knots
  return (speed * 0.539957).toFixed(2);
}
function toDateStr(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  // Format: DDMMYY (always use the year from the date, not current year)
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear().toString().slice(-2);
  return `${day}${month}${year}`;
}
function toTimeStr(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toISOString().substr(11,8).replace(/:/g,'') + '.00';
}
function validFlag(lat, lon) {
  return (lat && lon) ? '1' : '0';
}
function boolToBit(val) {
  return val ? '1' : '0';
}

async function forwardRecord(record) {
  if (!config.enabled) return;
  // Helper to get field from top-level or .data
  const get = (key) => record[key] ?? (record.data ? record.data[key] : undefined);
  try {
    const imeiRaw = get('deviceImei') || get('imei') || get('deviceid') || get('deviceId') || '';
    const imei = imeiRaw.toString() + '1';
    const latitude = get('latitude');
    const longitude = get('longitude');
    const [latStr, latHemi] = toNmeaLat(latitude);
    const [lonStr, lonHemi] = toNmeaLon(longitude);
    const height = get('height') || '';
    const speed = toKnots(get('speed'));
    const heading = get('direction') || '';
    const date = toDateStr(get('datetime') || get('timestamp'));
    const time = toTimeStr(get('datetime') || get('timestamp'));
    const valid = validFlag(latitude, longitude);
    const vButton1 = boolToBit(get('input0'));
    const vButton2 = boolToBit(get('input1'));
    const vButton3 = boolToBit(get('input2'));
    const vButton4 = boolToBit(get('input3'));
    const vAnalog1 = get('supplyVoltage') || '';
    const vAnalog2 = get('batteryVoltage') || '';
    const vAnalog3 = get('inputVoltage0') || '';
    const vAnalog4 = get('inputVoltage1') || '';
    // Log the full payload for debugging
    logForwarder(`ATTEMPT IMEI=${imei} lat=${latitude} lon=${longitude} height=${height} speed=${speed} heading=${heading} date=${date} time=${time} valid=${valid}`);
    // If required fields are missing, log and skip
    if (!imeiRaw || latitude == null || longitude == null) {
      logForwarder(`SKIP IMEI=${imeiRaw} Reason=Missing required fields (imei, latitude, longitude)`);
      return;
    }
    const cmd = `$FRCMD,${imei},_SendMessage,,${latStr},${latHemi},${lonStr},${lonHemi},${height},${speed},${heading},${date},${time},${valid},Button1=${vButton1},Button2=${vButton2},Button3=${vButton3},Button4=${vButton4},Analog1=${vAnalog1},Analog2=${vAnalog2},Analog3=${vAnalog3},Analog4=${vAnalog4}`;
    const url = config.targetUrl + '?cmd=' + encodeURIComponent(cmd);
    await axios.get(url);
    logForwarder(`SUCCESS IMEI=${imei} URL=${url}`);
  } catch (err) {
    logForwarder(`FAIL IMEI=${get('deviceImei') || get('imei') || get('deviceid') || get('deviceId') || ''} ERROR=${err.message}`);
  }
}

// Listen for new records
packetQueue.on('recordStored', forwardRecord);

// Periodic job for auto-forwarding
let autoForwardInterval = null;
function startAutoForwardJob() {
  if (autoForwardInterval) clearInterval(autoForwardInterval);
  if (!config.autoForwardEnabled) return;
  const intervalMs = (config.autoForwardIntervalMinutes || 5) * 60 * 1000;
  autoForwardInterval = setInterval(runAutoForward, intervalMs);
  // Run immediately on start
  runAutoForward();
}
async function runAutoForward() {
  try {
    const imeis = Array.isArray(config.forwardDeviceImeis) && config.forwardDeviceImeis.length > 0 ? config.forwardDeviceImeis : null;
    const where = { forwarded: false };
    if (imeis) where.deviceImei = imeis;
    const records = await Record.findAll({ where, limit: 100 });
    for (const rec of records) {
      await forwardRecord(rec);
      rec.forwarded = true;
      await rec.save();
      logForwarder(`AUTO-FORWARDED record id=${rec.id} imei=${rec.deviceImei}`);
    }
    if (records.length === 0) logForwarder('AUTO-FORWARD: No unforwarded records found');
  } catch (e) {
    logForwarder(`AUTO-FORWARD ERROR: ${e.message}`);
  }
}
// Watch config for changes and restart job
function reloadConfig() {
  if (fs.existsSync(configPath)) {
    config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
  }
  startAutoForwardJob();
}
// Initial start
startAutoForwardJob();
// Optionally, you could watch the config file for changes and reload
// fs.watchFile(configPath, reloadConfig);

// Expose a function to read the last N log entries
function getForwarderLogs(limit = 50) {
  try {
    if (!fs.existsSync(logPath)) return [];
    const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(Boolean);
    return lines.slice(-limit).reverse();
  } catch (e) {
    return [`ERROR reading log: ${e.message}`];
  }
}

module.exports = { forwardRecord, config, getForwarderLogs, reloadConfig }; 