# Galileosky Protocol Parser Fix (2026-07-07)

## Backup location

Original files before this change:

`backend/src/services/backups/pre-protocol-fix-20260707/`

See `README.md` in that folder to restore.

## Changes made

| Area | Before | After |
|------|--------|-------|
| **CRC16-Modbus** | Disabled (`// testing`) | Enabled via `validateChecksum` (disable with `VALIDATE_CHECKSUM=false`) |
| **Multi-record packets** | Heuristic split on raw `0x20` bytes | Sequential tag parsing + protocol record boundaries (`0x10`+`0x20` or second `0x20`) |
| **Unknown tags** | Skip 1 byte (offset drift) | End current record; skip tag safely in stream |
| **Extension packets** | ACK only, data discarded | Queued and parsed as tag stream (`parseMainPacket`) |
| **TCP `app.js`** | Extension `continue` before parse | Extension packets queued like main packets |

## New files

- `backend/src/services/galileoskyRecordStream.js` — record boundary helpers
- `backend/src/services/backups/pre-protocol-fix-20260707/` — backup snapshot

## Deploy

```bash
cd /opt/linuxParser2
git pull   # after push
pm2 restart gali-parse
pm2 logs gali-parse --lines 50
```

If CRC rejects valid devices (rare), temporarily set in `env.production`:

```env
VALIDATE_CHECKSUM=false
```

Then capture a failing packet hex from logs and report.

## Phase 2 (2026-07-07) — transport + compressed + XTEA + CAN tags

| Area | Change |
|------|--------|
| **TCP race** | Per-socket promise chain in `tcpConnectionProcessor.js` (no concurrent `data` handlers) |
| **ACK timing** | ACK sent only after successful `parse()` + `flushBuffer()` (disable with `ACK_AFTER_SAVE=false`) |
| **Compressed (0x08)** | Routed in `parser.parse()`; bit-packed minimal data set; records persisted to DB |
| **0xFE extended block** | Length field fixed to **uint16 LE** (was 1 byte) |
| **XTEA3** | Optional decrypt via `GALILEOSKY_XTEA_KEY` in `galileoskyXtea.js` |
| **CAN tags** | Extended 0x5a–0xfd, 0xa0–0xf9, 0xc0–0xd2 added to `tagDefinitions.js` |

### New files (phase 2)

- `backend/src/services/tcpConnectionProcessor.js`
- `backend/src/services/galileoskyBitBuffer.js`
- `backend/src/services/galileoskyXtea.js`

### New env vars

```env
ACK_AFTER_SAVE=true
MAX_PENDING_TELEMETRY=200
GALILEOSKY_XTEA_KEY=   # 16-byte ASCII or 32 hex chars, from device configurator
```

## Phase 3 (2026-07-07) — IMEI-deferred queue + strict DB save

| Area | Change |
|------|--------|
| **IMEI timing** | Telemetry without IMEI is queued per connection (up to `MAX_PENDING_TELEMETRY`); flushed when tag `0x03` or connection IMEI is known |
| **ACK gate** | No ACK while pending telemetry remains without IMEI |
| **DB save** | `batchSaveToDatabase` throws if any record fails after bulk + individual fallback (no silent loss + ACK) |
| **Disconnect** | `clearConnectionState()` clears IMEI + pending queue |
