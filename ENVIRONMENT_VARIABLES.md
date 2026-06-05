# Environment Variables Documentation

## Required Variables (Production)

These variables **MUST** be set in production. The application will fail to start if they are missing or use default values.

### Security Variables

| Variable | Required | Min Length | Description | Example |
|----------|----------|------------|-------------|---------|
| `JWT_SECRET` | ✅ Yes | 32 chars | Secret key for JWT token signing | `your-super-secure-jwt-secret-key-at-least-32-characters-long` |
| `SESSION_SECRET` | ✅ Yes | 32 chars | Secret key for session encryption | `your-super-secure-session-secret-key-at-least-32-characters-long` |

**⚠️ Important:** 
- Never use default values like `your-secret-key` or `default-secret` in production
- Generate strong random secrets: `openssl rand -hex 32`
- These secrets must be at least 32 characters long

---

## Optional Variables (With Defaults)

### Server Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode: `development`, `production`, `test` |
| `SERVER_IP` | `localhost` | Server IP address |
| `SERVER_DOMAIN` | `localhost` | Server domain name |
| `HTTP_PORT` | `8081` | HTTP server port |
| `TCP_PORT` | `3003` | TCP server port for device connections |
| `FRONTEND_PORT` | `8080` | Frontend application port |
| `MOBILE_PORT` | `3002` | Mobile frontend port |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_STORAGE` | `backend/data/prod.sqlite` | SQLite database file path |
| `DATABASE_URL` | `sqlite:backend/data/prod.sqlite` | Database connection URL |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGIN` | `http://localhost:8080,...` | Comma-separated list of allowed CORS origins |

### Performance Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENCY` | CPU cores - 1 | Maximum concurrent operations |
| `BATCH_SIZE` | `100` | Batch processing size |
| `MAX_MEMORY_BUFFER` | `104857600` | Memory buffer size in bytes (100MB) |
| `MAX_DISK_BUFFER` | `524288000` | Disk buffer size in bytes (500MB) |
| `ENABLE_WORKER_THREADS` | `false` | Enable worker threads for processing |

### Logging Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | `combined` | Log format |
| `LOG_FILE` | `logs/app.log` | Log file path |

### WebSocket Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_HEARTBEAT_INTERVAL` | `30000` | WebSocket heartbeat interval in milliseconds |

### Export Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_EXPORT_ENABLED` | `true` | Enable automatic exports |
| `EXPORT_DIR` | `backend/exports` | Export directory |
| `EXPORT_FORMAT` | `pfsl` | Export file format |
| `EXPORT_RETENTION_DAYS` | `30` | Export file retention period |

### Backup Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_ENABLED` | `true` | Enable automatic backups |
| `BACKUP_DIR` | `backups` | Backup directory |
| `BACKUP_SCHEDULE` | `0 2 * * *` | Backup schedule (cron format) |
| `BACKUP_RETENTION_DAYS` | `7` | Backup retention period |

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate limit window in milliseconds (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Maximum requests per window |

---

## Environment File Setup

### Development
Create `.env` file in project root:
```bash
NODE_ENV=development
JWT_SECRET=dev-secret-key
SESSION_SECRET=dev-session-secret
```

### Production
Use `env.production` file:
```bash
NODE_ENV=production
JWT_SECRET=<generate-strong-secret>
SESSION_SECRET=<generate-strong-secret>
SERVER_IP=192.168.1.100
HTTP_PORT=8081
TCP_PORT=3003
```

### Generate Strong Secrets
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32
```

---

## Validation

The application validates environment variables on startup:
- ✅ Checks required variables are set
- ✅ Validates secret strength (minimum length)
- ✅ Rejects default/placeholder values in production
- ✅ Provides clear error messages if validation fails

---

## PM2 Configuration

PM2 loads environment variables from `env.production`:
```javascript
// ecosystem.config.js
require('dotenv').config({ path: './env.production' });
```

Make sure `env.production` exists and contains all required variables before starting with PM2.

---

*Last updated: 2025-01-XX*
