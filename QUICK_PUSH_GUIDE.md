# Quick Push Guide - Run These Commands

## Step 0: Set Git Identity (First Time Only)

**Before pushing, configure your Git identity:**

**Option A - Use helper script:**
```cmd
setup-git-identity.bat
```

**Option B - Manual commands:**
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

**Recommended:** Use your GitHub username and the email associated with your GitHub account.

## Option 1: Use the Batch Script (Easiest)

**Windows:** Double-click `push-to-github.bat` or run in Command Prompt:
```cmd
push-to-github.bat
```

## Option 2: Manual Commands (Git Bash or Command Prompt)

Copy and paste these commands one by one:

```bash
# Navigate to project directory (adjust path if needed)
cd "C:\Users\haryo\Downloads\gali-parse-production-working.tar\gali-parse-production-working\gali-parse-production-working\gali-parse"

# Initialize git (if not done)
git init

# Add remote
git remote add origin https://github.com/haryowl/LinuxOHW.git
# OR if remote exists: git remote set-url origin https://github.com/haryowl/LinuxOHW.git

# Verify sensitive files are excluded
git check-ignore env.production
# Should output: env.production

# Add all files
git add .

# Check what will be committed (verify no sensitive files)
git status

# Commit
git commit -m "Initial commit: Gali-Parse GPS tracking parser"

# Push
git branch -M main
git push -u origin main
```

## GitHub Authentication

When prompted for credentials:
- **Username**: Your GitHub username (haryowl)
- **Password**: Use a **Personal Access Token** (NOT your GitHub password)
  - Create token: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select scope: `repo` (full control)
  - Copy the token and use it as your password

## Verify After Push

Visit: https://github.com/haryowl/LinuxOHW

Check that:
- ✅ All source code files are present
- ✅ README.md is visible
- ✅ env.production.example exists
- ❌ env.production is NOT visible
- ❌ No *.sqlite files visible
- ❌ No *.log files visible

---

**That's it!** Your code should now be on GitHub. 🎉


