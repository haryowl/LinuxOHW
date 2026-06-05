# Gali-Parse Production Deployment Guide

## 🚀 **Production-Grade Update Complete**

Your Gali-Parse working server has been updated to production-grade with full environment configuration support.

## 📋 **What Was Updated**

### ✅ **Environment Configuration**
- **Created**: `env.production` - Comprehensive environment file with all configurable options
- **Removed**: All hardcoded ports and configuration values
- **Added**: 50+ configurable environment variables

### ✅ **Configuration Files Updated**
- **`ecosystem.config.js`**: Enhanced PM2 configuration with environment variables
- **`nginx.conf`**: Production-grade Nginx with security headers, rate limiting, and caching
- **`server.js`**: Removed hardcoded port scanning, now uses configured ports
- **`app.js`**: Updated TCP server to use environment configuration
- **`config/production.js`**: Expanded with comprehensive production settings

### ✅ **Production Scripts Created**
- **`deploy-production.sh`**: Complete production deployment script
- **`manage-config.sh`**: Configuration management and validation
- **`monitor.sh`**: Monitoring, health checks, and maintenance

## 🔧 **Key Features Added**

### **Environment-Based Configuration**
```bash
# All ports are now configurable
HTTP_PORT=8081
TCP_PORT=3003
FRONTEND_PORT=8080
MOBILE_PORT=3002

# Security settings
JWT_SECRET=your-super-secure-jwt-secret-key
SESSION_SECRET=your-super-secure-session-secret
BCRYPT_ROUNDS=12

# Performance tuning
MAX_CONCURRENCY=4
BATCH_SIZE=100
MAX_MEMORY_BUFFER=104857600
```

### **Production Security**
- Rate limiting (API: 10 req/s, Login: 5 req/min)
- Security headers (XSS, CSRF, Content Security Policy)
- Fail2Ban integration
- UFW firewall configuration
- SSL/TLS support (configurable)

### **Monitoring & Maintenance**
- Health check endpoints
- Performance metrics
- Automated log rotation
- Backup management
- Cleanup utilities

## 🚀 **How to Deploy**

### **Step 1: Prepare Your Server**
```bash
# On your target server, extract the package
tar -xzf gali-parse-working-server.tar.gz
cd gali-parse-working-server

# Make scripts executable
chmod +x deploy-production.sh manage-config.sh monitor.sh
```

### **Step 2: Configure Environment**
```bash
# Edit the environment file
nano env.production

# Update these key values:
SERVER_IP=your-server-ip
SERVER_DOMAIN=your-domain.com
JWT_SECRET=your-unique-jwt-secret
SESSION_SECRET=your-unique-session-secret
```

### **Step 3: Deploy**
```bash
# Run the production deployment
sudo ./deploy-production.sh
```

## 🔧 **Configuration Management**

### **View Current Configuration**
```bash
./manage-config.sh show
```

### **Update Configuration**
```bash
# Edit env.production, then:
./manage-config.sh update
```

### **Backup Configuration**
```bash
./manage-config.sh backup
```

### **Validate Configuration**
```bash
./manage-config.sh validate
```

## 📊 **Monitoring & Maintenance**

### **Check Application Status**
```bash
./monitor.sh status
```

### **Health Check**
```bash
./monitor.sh health
```

### **View Logs**
```bash
# Recent logs
./monitor.sh logs

# Follow logs
./monitor.sh logs --tail
```

### **Performance Metrics**
```bash
./monitor.sh metrics
```

### **Cleanup Old Files**
```bash
# Clean files older than 30 days
./monitor.sh cleanup

# Clean files older than 7 days
./monitor.sh cleanup --days 7
```

### **Create Backup**
```bash
./monitor.sh backup
```

### **Restart Application**
```bash
./monitor.sh restart
```

### **Continuous Monitoring**
```bash
./monitor.sh monitor
```

## 🌐 **Access Points**

After deployment, your application will be available at:

- **Web Dashboard**: `http://your-server-ip`
- **Mobile Interface**: `http://your-server-ip/mobile`
- **Backend API**: `http://your-server-ip/api`
- **TCP Server**: `your-server-ip:3003`
- **Health Check**: `http://your-server-ip/health`

## 🔐 **Default Login**

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Important**: Change the default password immediately after first login!

## 📁 **Directory Structure**

```
/opt/gali-parse/
├── backend/
│   ├── src/                 # Application source code
│   ├── data/               # Database files
│   └── exports/            # Export files
├── frontend/build/         # Frontend build files
├── mobile-frontend/build/  # Mobile frontend build files
├── logs/                   # Application logs
├── backups/                # Configuration backups
├── env.production          # Environment configuration
├── ecosystem.config.js     # PM2 configuration
└── nginx.conf             # Nginx configuration
```

## 🔧 **Environment Variables Reference**

### **Core Configuration**
- `NODE_ENV`: Environment (production)
- `SERVER_IP`: Server IP address
- `SERVER_DOMAIN`: Server domain name

### **Port Configuration**
- `HTTP_PORT`: HTTP server port (default: 8081)
- `TCP_PORT`: TCP server port (default: 3003)
- `FRONTEND_PORT`: Frontend port (default: 8080)
- `MOBILE_PORT`: Mobile frontend port (default: 3002)

### **Security Configuration**
- `JWT_SECRET`: JWT signing secret
- `SESSION_SECRET`: Session secret
- `BCRYPT_ROUNDS`: Password hashing rounds (default: 12)

### **Performance Configuration**
- `MAX_CONCURRENCY`: Maximum concurrent operations
- `BATCH_SIZE`: Batch processing size
- `MAX_MEMORY_BUFFER`: Memory buffer size (bytes)
- `MAX_DISK_BUFFER`: Disk buffer size (bytes)

### **Logging Configuration**
- `LOG_LEVEL`: Log level (debug, info, warn, error)
- `LOG_FORMAT`: Log format (combined, common, dev)
- `LOG_FILE`: Log file path

### **Export Configuration**
- `AUTO_EXPORT_ENABLED`: Enable automatic exports
- `EXPORT_DIR`: Export directory
- `EXPORT_FORMAT`: Export file format
- `EXPORT_RETENTION_DAYS`: Export retention period

### **Backup Configuration**
- `BACKUP_ENABLED`: Enable automatic backups
- `BACKUP_DIR`: Backup directory
- `BACKUP_SCHEDULE`: Backup schedule (cron format)
- `BACKUP_RETENTION_DAYS`: Backup retention period

### **Monitoring Configuration**
- `HEALTH_CHECK_ENABLED`: Enable health checks
- `METRICS_ENABLED`: Enable metrics collection
- `METRICS_PORT`: Metrics server port

### **Rate Limiting**
- `RATE_LIMIT_ENABLED`: Enable rate limiting
- `RATE_LIMIT_WINDOW_MS`: Rate limit window (milliseconds)
- `RATE_LIMIT_MAX_REQUESTS`: Maximum requests per window

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tlnp | grep :8081
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **Permission Issues**
   ```bash
   # Fix ownership
   sudo chown -R gali-parse:gali-parse /opt/gali-parse
   ```

3. **Configuration Errors**
   ```bash
   # Validate configuration
   ./manage-config.sh validate
   
   # Check Nginx config
   sudo nginx -t
   ```

4. **Application Not Starting**
   ```bash
   # Check PM2 logs
   pm2 logs gali-parse
   
   # Check system logs
   sudo journalctl -u nginx
   ```

### **Useful Commands**

```bash
# Check application status
pm2 status

# View real-time logs
pm2 logs gali-parse --tail

# Restart application
pm2 restart gali-parse

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tlnp | grep -E "(8081|3003)"
```

## 🔄 **Updates and Maintenance**

### **Regular Maintenance Tasks**

1. **Daily**: Check application status and logs
2. **Weekly**: Review performance metrics and cleanup old files
3. **Monthly**: Create full backups and review security logs
4. **Quarterly**: Update dependencies and review configuration

### **Update Process**

1. **Backup current configuration**
   ```bash
   ./manage-config.sh backup
   ```

2. **Update application files**
   ```bash
   # Copy new files to /opt/gali-parse/
   sudo cp -r new-files/* /opt/gali-parse/
   ```

3. **Update dependencies**
   ```bash
   sudo -u gali-parse bash -c "cd /opt/gali-parse/backend && npm install --production"
   ```

4. **Restart application**
   ```bash
   ./monitor.sh restart
   ```

## 📞 **Support**

For issues or questions:

1. Check the logs: `./monitor.sh logs`
2. Run health check: `./monitor.sh health`
3. Validate configuration: `./manage-config.sh validate`
4. Check system resources: `./monitor.sh status`

## 🎉 **Production Ready!**

Your Gali-Parse server is now production-grade with:
- ✅ Environment-based configuration
- ✅ Production security features
- ✅ Monitoring and maintenance tools
- ✅ Automated deployment scripts
- ✅ Comprehensive documentation

**Next Steps:**
1. Deploy to your production server
2. Configure your environment variables
3. Change default passwords
4. Set up SSL certificates (if needed)
5. Configure monitoring alerts
