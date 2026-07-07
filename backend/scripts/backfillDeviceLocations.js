#!/usr/bin/env node
'use strict';

/**
 * One-time backfill of Devices.lastLatitude/lastLongitude from Records.
 * Run with app stopped: pm2 stop gali-parse
 *
 *   cd /opt/linuxParser2/backend
 *   node scripts/backfillDeviceLocations.js
 */

const { loadProductionEnv } = require('../src/utils/loadProductionEnv');
const { sequelize, Device } = require('../src/models');
const { ensureDeviceLocationColumns } = require('../src/utils/ensureDeviceLocationColumns');
const { QueryTypes } = require('sequelize');

loadProductionEnv();

async function backfillDevice(imei) {
    const [row] = await sequelize.query(
        `SELECT latitude, longitude, datetime, timestamp, speed, direction, altitude, satellites, hdop
         FROM "Records"
         WHERE "deviceImei" = ?
           AND latitude IS NOT NULL
           AND longitude IS NOT NULL
         ORDER BY id DESC
         LIMIT 1`,
        { replacements: [imei], type: QueryTypes.SELECT }
    );

    if (!row) {
        return false;
    }

    await Device.update({
        lastLatitude: row.latitude,
        lastLongitude: row.longitude,
        lastLocationAt: row.datetime || row.timestamp,
        lastSpeed: row.speed,
        lastDirection: row.direction,
        lastAltitude: row.altitude,
        lastSatellites: row.satellites,
        lastHdop: row.hdop
    }, { where: { imei } });

    return true;
}

async function main() {
    await ensureDeviceLocationColumns(sequelize);
    const devices = await Device.findAll({ attributes: ['imei'], raw: true });

    let updated = 0;
    for (const { imei } of devices) {
        if (await backfillDevice(imei)) {
            updated += 1;
            if (updated % 10 === 0) {
                console.log(`  ${updated}/${devices.length} devices...`);
            }
        }
    }

    console.log(`Backfill complete: ${updated}/${devices.length} devices with GPS`);
    await sequelize.close();
}

main().catch((error) => {
    console.error('Backfill failed:', error.message);
    process.exit(1);
});
