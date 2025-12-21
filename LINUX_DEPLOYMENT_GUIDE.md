# Linux Server Deployment Guide - Copy-Paste Installation

## ⚠️ Important: Cannot Just Copy-Paste Everything

**Answer:** ❌ **NO** - You cannot simply copy-paste all files. Here's why and what you need to do:

---

## 🔴 Issues Found

### 1. **Windows-Specific Commands in package.json**
**Problem:** Frontend and mobile-frontend use Windows `set` command
- `frontend/package.json:36-37` - Uses `set NODE_OPTIONS=...`
- `mobile-frontend/package.json:28-29` - Uses `set NODE_OPTIONS=...`

**Impact:** These commands won't work on Linux

### 2. **node_modules Folders**
**Problem:** `node_modules` folders are platform-specific
- Contains compiled native modules (sqlite3, etc.)
- Windows binaries won't work on Linux
- Should NOT be copied

### 3. **System Dependencies Required**
**Problem:** Need to install on Linux server:
- Node.js (>=14.18.0)
- npm
- PM2
- Nginx (optional but recommended)
- Build tools (for native modules)

### 4. **Database Files**
**Problem:** SQLite files may have permission issues
- `backend/data/prod.sqlite` - May need permissions set
- `backend/data/sessions.sqlite` - May need permissions set

### 5. **Script Permissions**
**Problem:** Shell scripts need execute permissions
- `monitor.sh`
- `scripts/*.sh`

### 6. **Environment Configuration**
**Problem:** Must configure environment variables
- `env.production` needs to be edited
- Secrets must be set

---

## ✅ What CAN Be Copied

### ✅ Safe to Copy:
1. **Source Code:**
   - `backend/src/` - All source files
   - `frontend/src/` - All source files
   - `mobile-frontend/src/` - All source files (if exists)

2. **Configuration Files:**
   - `backend/package.json` ✅
   - `frontend/package.json` ⚠️ (needs fix)
   - `mobile-frontend/package.json` ⚠️ (needs fix)
   - `ecosystem.config.js` ✅
   - `env.production` ✅ (needs editing)
   - `nginx.conf` ✅

3. **Build Artifacts:**
   - `frontend/build/` ✅ (if already built)
   - `mobile-frontend/build/` ✅ (if exists and built)

4. **Database Files:**
   - `backend/data/prod.sqlite` ✅ (with permissions)
   - `backend/data/sessions.sqlite` ✅ (with permissions)

5. **Scripts:**
   - `monitor.sh` ✅ (needs chmod +x)
   - `scripts/*.sh` ✅ (needs chmod +x)

6. **Documentation:**
   - All `.md` files ✅

### ❌ Do NOT Copy:
1. **node_modules/** - Must install fresh on Linux
2. **Log files** - Can be regenerated
3. **Zone.Identifier files** - Windows metadata, not needed
4. **Backup files** - Can be regenerated

---

## 🛠️ Required Fixes Before Deployment

### Fix 1: Make package.json Cross-Platform
**Files to Fix:**
- `frontend/package.json`
- `mobile-frontend/package.json`

**Change:**
```json
// FROM (Windows):
"start": "set NODE_OPTIONS=--max-old-space-size=12288 && react-scripts start",
"build": "set NODE_OPTIONS=--max-old-space-size=12288 && react-scripts build",

// TO (Cross-platform):
"start": "cross-env NODE_OPTIONS=--max-old-space-size=12288 react-scripts start",
"build": "cross-env NODE_OPTIONS=--max-old-space-size=12288 react-scripts build",
```

**OR (Linux-only):**
```json
"start": "NODE_OPTIONS=--max-old-space-size=12288 react-scripts start",
"build": "NODE_OPTIONS=--max-old-space-size=12288 react-scripts build",
```

---

## 📋 Step-by-Step Deployment Process

### Step 1: Prepare Files on Windows

1. **Create deployment package:**
```bash
# On Windows, create a clean package excluding node_modules
# Use tar or zip to create package
```

2. **Fix package.json files** (see Fix 1 above)

3. **Create .deploymentignore file** (if using tar/zip):
```
node_modules/
**/node_modules/
*.log
logs/
backups/
*.Zone.Identifier
.DS_Store
```

### Step 2: Transfer to Linux Server

**Option A: Using SCP**
```bash
scp -r gali-parse user@server:/opt/
```

**Option B: Using tar + SCP**
```bash
# On Windows (if WSL or Git Bash):
tar -czf gali-parse.tar.gz --exclude='node_modules' --exclude='*.log' gali-parse/
scp gali-parse.tar.gz user@server:/opt/
# On Linux:
cd /opt
tar -xzf gali-parse.tar.gz
```

**Option C: Using rsync**
```bash
rsync -av --exclude='node_modules' --exclude='*.log' gali-parse/ user@server:/opt/gali-parse/
```

### Step 3: Install System Dependencies on Linux

```bash
# Update system
sudo apt-get update  # Ubuntu/Debian
# OR
sudo yum update      # CentOS/RHEL

# Install Node.js (using NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should be >= 14.18.0
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional but recommended)
sudo apt-get install -y nginx

# Install build tools (for native modules like sqlite3)
sudo apt-get install -y build-essential python3
```

### Step 4: Set Permissions

```bash
cd /opt/gali-parse

# Make scripts executable
chmod +x monitor.sh
chmod +x scripts/*.sh

# Set ownership (if running as specific user)
sudo chown -R $USER:$USER /opt/gali-parse

# Ensure data directories are writable
chmod -R 755 backend/data
chmod -R 755 backend/exports
chmod -R 755 logs
chmod -R 755 backups
```

### Step 5: Install Node.js Dependencies

```bash
cd /opt/gali-parse

# Install backend dependencies
cd backend
npm install --production

# Install frontend dependencies (if rebuilding)
cd ../frontend
npm install --production

# Build frontend (if not copying build folder)
npm run build

# Return to root
cd ..
```

### Step 6: Configure Environment

```bash
cd /opt/gali-parse

# Edit environment file
nano env.production

# Set required values:
# - SERVER_IP=your-server-ip
# - JWT_SECRET=<generate-strong-secret>
# - SESSION_SECRET=<generate-strong-secret>
```

**Generate secrets:**
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32
```

### Step 7: Initialize Database (if needed)

```bash
cd /opt/gali-parse/backend

# If database doesn't exist or needs migration
node init-database.js

# Create default admin (if needed)
node create-default-admin.js
```

### Step 8: Configure Nginx (if using)

```bash
# Process nginx template
cd /opt/gali-parse
./scripts/process-nginx-template.sh

# Copy to nginx config directory
sudo cp nginx.conf /etc/nginx/sites-available/gali-parse
sudo ln -s /etc/nginx/sites-available/gali-parse /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 9: Start Application with PM2

```bash
cd /opt/gali-parse

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# Check status
pm2 status
pm2 logs gali-parse
```

### Step 10: Verify Installation

```bash
# Check application status
./monitor.sh status

# Health check
./monitor.sh health

# Check logs
pm2 logs gali-parse --lines 50
```

---

## 🔧 Quick Fix Script

I'll create a script to fix the Windows-specific issues automatically.






