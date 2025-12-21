// Load environment variables
require('dotenv').config({ path: './env.production' });

module.exports = {
  apps: [{
    name: 'gali-parse',
    script: 'backend/src/server.js',
    instances: process.env.PM2_INSTANCES || 1,
    exec_mode: process.env.PM2_EXEC_MODE || 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: process.env.PM2_MAX_MEMORY_RESTART || '1G',
    min_uptime: process.env.PM2_MIN_UPTIME || '10s',
    max_restarts: process.env.PM2_MAX_RESTARTS || 10,
    restart_delay: process.env.PM2_RESTART_DELAY || 4000,
    
    // Environment variables
    env: {
      NODE_ENV: 'production',
      HTTP_PORT: process.env.HTTP_PORT || 3001,
      TCP_PORT: process.env.TCP_PORT || 3003,
      SERVER_IP: process.env.SERVER_IP || 'localhost',
      SERVER_DOMAIN: process.env.SERVER_DOMAIN || 'localhost',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      // Secrets - MUST be provided, will fail if missing or using defaults
      JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-key'),
      SESSION_SECRET: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-session-secret'),
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      DB_STORAGE: process.env.DB_STORAGE || 'backend/data/prod.sqlite',
      AUTO_EXPORT_ENABLED: process.env.AUTO_EXPORT_ENABLED || 'true',
      EXPORT_DIR: process.env.EXPORT_DIR || 'backend/exports',
      BACKUP_ENABLED: process.env.BACKUP_ENABLED || 'true',
      BACKUP_DIR: process.env.BACKUP_DIR || 'backups',
      HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED || 'true',
      METRICS_ENABLED: process.env.METRICS_ENABLED || 'true',
      RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED || 'true'
    },
    
    // Logging configuration
    error_file: process.env.PM2_ERROR_FILE || 'logs/err.log',
    out_file: process.env.PM2_OUT_FILE || 'logs/out.log',
    log_file: process.env.PM2_LOG_FILE || 'logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Advanced PM2 options
    kill_timeout: 5000,
    listen_timeout: 3000,
    wait_ready: true,
    
    // Monitoring
    pmx: true,
    
    // Source map support
    source_map_support: true,
    
    // Node.js options
    node_args: [
      '--max-old-space-size=2048',
      '--optimize-for-size',
      '--gc-interval=100'
    ]
  }]
};
