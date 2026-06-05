# Linux Deployment Checklist

## ✅ Pre-Deployment Checklist

### Files to Fix Before Transfer:
- [ ] Fix `frontend/package.json` - Remove Windows `set` command
- [ ] Fix `mobile-frontend/package.json` - Remove Windows `set` command
- [ ] Run `scripts/prepare-for-linux.sh` to clean up files

### Files to Transfer:
- [x] `backend/src/` - All source code
- [x] `frontend/src/` - All source code  
- [x] `frontend/build/` - Built frontend (if exists)
- [x] `backend/package.json` - Dependencies list
- [x] `frontend/package.json` - Dependencies list (FIXED)
- [x] `ecosystem.config.js` - PM2 configuration
- [x] `env.production` - Environment config (EDIT BEFORE DEPLOY)
- [x] `nginx.conf` - Nginx config
- [x] `monitor.sh` - Monitoring script
- [x] `scripts/` - Deployment scripts
- [x] `backend/data/prod.sqlite` - Database (if exists)
- [x] Documentation files

### Files NOT to Transfer:
- [ ] `node_modules/` - Install fresh on Linux
- [ ] `*.log` - Log files
- [ ] `*.Zone.Identifier` - Windows metadata
- [ ] `.DS_Store` - macOS metadata
- [ ] `backups/` - Can regenerate

---

## 🖥️ Linux Server Requirements

### System Requirements:
- [ ] Linux x86_64 (Ubuntu 18.04+, Debian 10+, CentOS 7+)
- [ ] Node.js >= 14.18.0
- [ ] npm >= 6.0.0
- [ ] PM2 (will be installed by script)
- [ ] Nginx (optional but recommended)
- [ ] Build tools: gcc, python3 (for native modules)

### Disk Space:
- [ ] Minimum 2GB free space
- [ ] Recommended 5GB+ for logs and exports

### Network:
- [ ] Port 8081 (HTTP) - Open
- [ ] Port 8080 (Frontend, if served directly) - Open
- [ ] Port 3003 (TCP) - Open for devices
- [ ] Port 80 (HTTP) - Open if using Nginx
- [ ] Port 443 (HTTPS) - Open if using SSL

---

## 📋 Deployment Steps

### Step 1: Prepare Files (On Windows/Development Machine)
```bash
# Run preparation script
bash scripts/prepare-for-linux.sh

# Or manually:
# 1. Fix package.json files (remove 'set' command)
# 2. Remove node_modules folders
# 3. Remove Windows metadata files
```

### Step 2: Transfer Files to Linux Server
```bash
# Option A: Using SCP
scp -r --exclude='node_modules' --exclude='*.log' gali-parse/ user@server:/opt/

# Option B: Using tar + SCP
tar -czf gali-parse.tar.gz --exclude='node_modules' --exclude='*.log' gali-parse/
scp gali-parse.tar.gz user@server:/opt/
# On server:
cd /opt && tar -xzf gali-parse.tar.gz
```

### Step 3: Run Deployment Script (On Linux Server)
```bash
cd /opt/gali-parse
sudo bash scripts/deploy-to-linux.sh
```

### Step 4: Manual Steps (If script doesn't cover everything)

#### 4.1 Install System Dependencies
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Build tools
sudo apt-get install -y build-essential python3

# Nginx (optional)
sudo apt-get install -y nginx
```

#### 4.2 Install Node.js Dependencies
```bash
cd /opt/gali-parse/backend
npm install --production

cd /opt/gali-parse/frontend
npm install --production
npm run build  # If build folder doesn't exist
```

#### 4.3 Configure Environment
```bash
cd /opt/gali-parse
nano env.production

# Set these REQUIRED values:
# JWT_SECRET=<generate-with-openssl-rand-hex-32>
# SESSION_SECRET=<generate-with-openssl-rand-hex-32>
# SERVER_IP=<your-server-ip>
```

#### 4.4 Initialize Database
```bash
cd /opt/gali-parse/backend
node init-database.js
node create-default-admin.js
```

#### 4.5 Start Application
```bash
cd /opt/gali-parse
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions
```

#### 4.6 Configure Nginx (Optional)
```bash
cd /opt/gali-parse
./scripts/process-nginx-template.sh
sudo cp nginx.conf /etc/nginx/sites-available/gali-parse
sudo ln -s /etc/nginx/sites-available/gali-parse /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## ✅ Post-Deployment Verification

### Check Application Status:
```bash
# PM2 status
pm2 status

# Application logs
pm2 logs gali-parse --lines 50

# Health check
cd /opt/gali-parse
./monitor.sh health

# Port check
netstat -tlnp | grep -E "(8081|8080|3003)"
```

### Test Endpoints:
```bash
# Health check
curl http://localhost:8081/api/auth/check

# Dashboard
curl http://localhost:8081/api/dashboard/stats
```

### Check Logs:
```bash
# PM2 logs
pm2 logs gali-parse

# Application logs
tail -f /opt/gali-parse/logs/combined.log
tail -f /opt/gali-parse/logs/error.log
```

---

## 🔧 Troubleshooting

### Issue: Application won't start
```bash
# Check environment variables
cd /opt/gali-parse
cat env.production | grep JWT_SECRET
cat env.production | grep SESSION_SECRET

# Check Node.js version
node --version  # Should be >= 14.18.0

# Check PM2 logs
pm2 logs gali-parse --err

# Check if ports are in use
netstat -tlnp | grep -E "(8081|8080|3003)"
```

### Issue: Database errors
```bash
# Check database file permissions
ls -la /opt/gali-parse/backend/data/

# Fix permissions
chmod 755 /opt/gali-parse/backend/data
chmod 644 /opt/gali-parse/backend/data/*.sqlite
```

### Issue: Frontend not loading
```bash
# Check if build folder exists
ls -la /opt/gali-parse/frontend/build/

# Rebuild if needed
cd /opt/gali-parse/frontend
npm run build
```

### Issue: Native module compilation fails
```bash
# Install build tools
sudo apt-get install -y build-essential python3

# Reinstall dependencies
cd /opt/gali-parse/backend
rm -rf node_modules
npm install --production
```

---

## 📝 Summary

### ✅ What Works:
- Source code can be copied
- Configuration files can be copied (with edits)
- Database files can be copied (with permissions)
- Build artifacts can be copied

### ❌ What Doesn't Work:
- Cannot copy node_modules (platform-specific)
- Cannot use Windows commands on Linux
- Must install system dependencies
- Must configure environment variables

### 🎯 Recommended Approach:
1. **Fix package.json files** (remove Windows `set` command)
2. **Run prepare script** to clean up
3. **Transfer files** (excluding node_modules)
4. **Run deployment script** on Linux server
5. **Verify installation**

---

*Last updated: 2025-01-XX*






