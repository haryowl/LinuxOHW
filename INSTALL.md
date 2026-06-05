# Installation Guide

## Quick Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/haryowl/LinuxOHW.git
cd LinuxOHW
```

### Step 2: Install System Dependencies

#### Ubuntu/WSL

```bash
# Automated installation
sudo bash scripts/install-dependencies-ubuntu.sh

# Or manual installation
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3
sudo npm install -g pm2
sudo apt-get install -y nginx
```

#### Other Linux Distributions

See [INSTALL_DEPENDENCIES_UBUNTU.md](INSTALL_DEPENDENCIES_UBUNTU.md) for distribution-specific instructions.

### Step 3: Install Project Dependencies

```bash
# Backend dependencies
cd backend
npm install --production

# Frontend dependencies and build
cd ../frontend
npm install --production
npm run build
```

### Step 4: Configure Environment

```bash
# Copy example environment file
cd ..
cp env.production.example env.production

# Edit configuration
nano env.production
```

**Required settings:**
- `JWT_SECRET` - Generate with: `openssl rand -hex 32`
- `SESSION_SECRET` - Generate with: `openssl rand -hex 32`
- `SERVER_IP` - Your server IP address

### Step 5: Initialize Database

```bash
cd backend
node init-database.js
node create-default-admin.js
```

### Step 6: Start Application

```bash
cd ..
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

## Verify Installation

```bash
# Check status
pm2 status

# Check logs
pm2 logs gali-parse

# Health check
curl http://localhost:8081/api/auth/check
```

## Default Login

- **Username**: `admin`
- **Password**: `admin123`

⚠️ **Change password immediately after first login!**

## Next Steps

- Configure Nginx (see [LINUX_DEPLOYMENT_GUIDE.md](LINUX_DEPLOYMENT_GUIDE.md))
- Set up SSL certificates (if using HTTPS)
- Configure firewall rules
- Set up automated backups

## Troubleshooting

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for troubleshooting guide.


