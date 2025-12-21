# GitHub Push Instructions

## ✅ Pre-Push Checklist

Before pushing to GitHub, ensure:

- [x] `.gitignore` created - Excludes sensitive files
- [x] `env.production.example` created - Template for environment variables
- [x] `README.md` created - Project documentation
- [x] `LICENSE` created - ISC License
- [x] `.gitattributes` created - Line ending normalization
- [x] Sensitive files excluded (database, logs, secrets)

## 🚀 Push to GitHub

### Step 1: Initialize Git Repository (if not already done)

```bash
# Initialize git repository
git init

# Add remote repository
git remote add origin https://github.com/haryowl/LinuxOHW.git
```

### Step 2: Prepare Files for GitHub

```bash
# Run preparation script (removes sensitive files)
bash scripts/prepare-for-github.sh
```

**Or manually:**
- Ensure `env.production` is NOT tracked (should be in `.gitignore`)
- Remove all `*.sqlite` files
- Remove all `*.log` files
- Remove `node_modules/` directories
- Remove Windows metadata files (`*.Zone.Identifier`)

### Step 3: Verify Sensitive Files Are Excluded

```bash
# Check that env.production is ignored
git check-ignore env.production
# Should output: env.production

# Check git status
git status
# Should NOT show:
# - env.production
# - *.sqlite files
# - *.log files
# - node_modules/
```

### Step 4: Add Files to Git

```bash
# Add all files (respecting .gitignore)
git add .

# Verify what will be committed
git status
```

### Step 5: Commit Changes

```bash
git commit -m "Initial commit: Gali-Parse GPS tracking parser"
```

### Step 6: Push to GitHub

```bash
# Push to main branch
git branch -M main
git push -u origin main
```

## 🔒 Security Checklist

Before pushing, verify:

- [ ] `env.production` is NOT in repository (check with `git check-ignore env.production`)
- [ ] No database files (`*.sqlite`, `*.db`) are tracked
- [ ] No log files are tracked
- [ ] No actual secrets in code (only placeholders)
- [ ] `env.production.example` exists with placeholder values
- [ ] No hardcoded IP addresses or credentials in source code

## 📋 Files That Should Be in Repository

✅ **Include:**
- Source code (`backend/src/`, `frontend/src/`)
- Configuration files (`package.json`, `ecosystem.config.js`)
- Documentation (`.md` files)
- Scripts (`scripts/*.sh`, `scripts/*.js`)
- Example files (`env.production.example`)
- Build configuration files
- `.gitignore`, `.gitattributes`
- `LICENSE`, `README.md`

❌ **Exclude:**
- `env.production` (actual secrets)
- `*.sqlite`, `*.db` (database files)
- `*.log` (log files)
- `node_modules/` (dependencies)
- `*.Zone.Identifier` (Windows metadata)
- `backups/`, `exports/`, `uploads/` (user data)
- `.pm2/` (PM2 files)

## 🛠️ After Pushing

### For Users Installing from GitHub:

1. **Clone repository:**
   ```bash
   git clone https://github.com/haryowl/LinuxOHW.git
   cd LinuxOHW
   ```

2. **Create environment file:**
   ```bash
   cp env.production.example env.production
   nano env.production
   # Set JWT_SECRET, SESSION_SECRET, SERVER_IP
   ```

3. **Install dependencies:**
   ```bash
   cd backend && npm install --production
   cd ../frontend && npm install --production && npm run build
   ```

4. **Initialize database:**
   ```bash
   cd ../backend
   node init-database.js
   node create-default-admin.js
   ```

5. **Start application:**
   ```bash
   cd ..
   pm2 start ecosystem.config.js
   ```

## 📝 Repository Structure

```
LinuxOHW/
├── .gitignore              # Git ignore rules
├── .gitattributes          # Line ending normalization
├── LICENSE                 # ISC License
├── README.md               # Main documentation
├── INSTALL.md              # Installation guide
├── env.production.example  # Environment template
├── ecosystem.config.js     # PM2 configuration
├── nginx.conf             # Nginx configuration
├── backend/                # Backend source code
├── frontend/              # Frontend source code
├── mobile-frontend/        # Mobile frontend
├── scripts/                # Deployment scripts
└── [documentation files]   # Various .md files
```

## ⚠️ Important Notes

1. **Never commit `env.production`** - It contains sensitive secrets
2. **Never commit database files** - They contain user data
3. **Always use `env.production.example`** - As a template
4. **Review changes before pushing** - Use `git status` and `git diff`

## 🔄 Updating Repository

When making changes:

```bash
# Pull latest changes
git pull origin main

# Make your changes
# ...

# Prepare for push (if needed)
bash scripts/prepare-for-github.sh

# Add, commit, and push
git add .
git commit -m "Description of changes"
git push origin main
```

---

**Repository URL**: https://github.com/haryowl/LinuxOHW


