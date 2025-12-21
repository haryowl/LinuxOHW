# Install Dependencies on Ubuntu (WSL)

## Complete Installation Guide

Run these commands in order on your Ubuntu WSL terminal.

---

## Step 1: Update System Packages

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

---

## Step 2: Install Node.js and npm

### Option A: Using NodeSource Repository (Recommended - Latest LTS)

```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Expected output:**
- Node.js version: `v18.x.x` or higher
- npm version: `9.x.x` or higher

### Option B: Using Ubuntu Repository (Simpler, but older version)

```bash
sudo apt-get install -y nodejs npm

# Verify installation
node --version
npm --version
```

**Note:** This may install an older version. If Node.js version is < 14.18.0, use Option A instead.

---

## Step 3: Install Build Tools (Required for native modules like sqlite3)

```bash
sudo apt-get install -y build-essential python3
```

**What this installs:**
- `gcc` - C compiler
- `g++` - C++ compiler
- `make` - Build automation tool
- `python3` - Required for node-gyp (builds native modules)

**Verify installation:**
```bash
gcc --version
python3 --version
```

---

## Step 4: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

**Expected output:** `5.x.x` or higher

**Setup PM2 to start on boot (optional for WSL):**
```bash
pm2 startup
# Follow the instructions shown (may require sudo)
```

---

## Step 5: Install Nginx (Optional but Recommended)

```bash
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

# Verify installation
nginx -v
```

**Check Nginx status:**
```bash
sudo systemctl status nginx
```

**Note:** On WSL, `systemctl` may not work. If it doesn't, you can start Nginx manually:
```bash
sudo service nginx start
```

---

## Step 6: Install Additional Tools (Optional but Useful)

### Git (if not already installed)
```bash
sudo apt-get install -y git
```

### curl and wget (usually pre-installed)
```bash
sudo apt-get install -y curl wget
```

### Text editors
```bash
# Nano (simple editor)
sudo apt-get install -y nano

# Vim (advanced editor)
sudo apt-get install -y vim
```

---

## Complete One-Line Installation Script

If you want to install everything at once, copy and paste this:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools
sudo apt-get install -y build-essential python3

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install useful tools
sudo apt-get install -y git nano curl wget

# Verify installations
echo "=== Verification ==="
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo "Nginx: $(nginx -v 2>&1)"
echo "GCC: $(gcc --version | head -1)"
echo "Python3: $(python3 --version)"
```

---

## Verification Checklist

After installation, verify everything works:

```bash
# Check Node.js version (should be >= 14.18.0)
node --version

# Check npm version
npm --version

# Check PM2
pm2 --version

# Check build tools
gcc --version
python3 --version

# Check Nginx (if installed)
nginx -v
```

---

## Troubleshooting

### Issue: `systemctl` doesn't work on WSL

**Solution:** Use `service` command instead:
```bash
# Instead of: sudo systemctl start nginx
sudo service nginx start

# Instead of: sudo systemctl status nginx
sudo service nginx status
```

### Issue: Node.js version is too old

**Solution:** Use NodeSource repository (Option A in Step 2)

### Issue: Permission denied when installing npm packages globally

**Solution:** Use `sudo` or configure npm to use a different directory:
```bash
# Option 1: Use sudo
sudo npm install -g pm2

# Option 2: Configure npm (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g pm2
```

### Issue: Cannot find `curl` command

**Solution:**
```bash
sudo apt-get install -y curl
```

### Issue: Build tools not found when installing npm packages

**Solution:**
```bash
sudo apt-get install -y build-essential python3
```

---

## WSL-Specific Notes

### Systemd (systemctl) on WSL

WSL1 doesn't support `systemctl`. WSL2 may or may not support it depending on your Windows version.

**Workaround for services:**
```bash
# Start Nginx manually
sudo service nginx start

# Or start directly
sudo /usr/sbin/nginx
```

### PM2 Startup on WSL

PM2's `startup` command may not work properly on WSL. You can manually start PM2 when needed:
```bash
pm2 start ecosystem.config.js
pm2 save
```

Or add to your `~/.bashrc`:
```bash
# Auto-start PM2 on login (if processes are saved)
if command -v pm2 &> /dev/null; then
    pm2 resurrect
fi
```

---

## Next Steps

After installing dependencies:

1. **Navigate to your project:**
   ```bash
   cd /opt/gali-parse
   # or wherever you extracted the project
   ```

2. **Install project dependencies:**
   ```bash
   cd backend
   npm install --production
   
   cd ../frontend
   npm install --production
   npm run build
   ```

3. **Configure environment:**
   ```bash
   cd /opt/gali-parse
   nano env.production
   # Set JWT_SECRET, SESSION_SECRET, SERVER_IP
   ```

4. **Start application:**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

*Last updated: 2025-01-XX*




