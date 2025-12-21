@echo off
setlocal enabledelayedexpansion
REM Batch script to push Gali-Parse to GitHub
REM Improved version with error handling

echo ========================================
echo Gali-Parse GitHub Push Script
echo ========================================
echo.

REM Check if git is installed
echo [1/10] Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from: https://git-scm.com/download/win
    goto :error_exit
)
echo   OK: Git found
git --version
echo.

REM Initialize git if needed
echo [2/10] Checking Git repository...
if not exist .git (
    echo   Initializing new repository...
    git init
    if errorlevel 1 (
        echo ERROR: Failed to initialize git repository
        goto :error_exit
    )
)
echo   OK: Repository ready
echo.

REM Check if remote exists
echo [3/10] Configuring remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/haryowl/LinuxOHW.git
if errorlevel 1 (
    echo ERROR: Failed to configure remote
    goto :error_exit
)
echo   OK: Remote configured
echo.

REM Verify sensitive files are ignored
echo [4/10] Verifying sensitive files are excluded...
git check-ignore env.production >nul 2>&1
if errorlevel 1 (
    echo   WARNING: env.production is NOT ignored!
) else (
    echo   OK: env.production is ignored
)
echo.

REM Check Git user configuration
echo [5/10] Checking Git user configuration...
git config user.name >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git user.name is not configured
    echo.
    echo Run: git config --global user.name "Your Name"
    echo      git config --global user.email "your.email@example.com"
    goto :error_exit
)

git config user.email >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git user.email is not configured
    echo.
    echo Run: git config --global user.email "your.email@example.com"
    goto :error_exit
)

echo   OK: Git identity configured
echo   Name: 
git config user.name
echo   Email: 
git config user.email
echo.

REM Add all files
echo [6/10] Adding files to git...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    goto :error_exit
)
echo   OK: Files staged
echo.

REM Show status
echo [7/10] Files to be committed:
git status --short
echo.

REM Ask for confirmation
echo [8/10] Ready to commit and push
echo Press any key to continue (Ctrl+C to cancel)...
pause >nul
echo.

REM Commit
echo [9/10] Creating commit...
git commit -m "Initial commit: Gali-Parse GPS tracking parser with production deployment setup"
if errorlevel 1 (
    echo.
    echo WARNING: Commit returned error. This might mean:
    echo   - Nothing new to commit (already committed)
    echo   - Or actual commit error
    echo.
    echo Checking status...
    git status
    echo.
    echo Continue with push anyway? (Y/N)
    choice /C YN /N /M ""
    if errorlevel 2 goto :error_exit
) else (
    echo   OK: Commit created
)
echo.

REM Set branch to main
echo [10/10] Setting branch to main...
git branch -M main 2>nul
echo.

REM Push to GitHub
echo ========================================
echo PUSHING TO GITHUB
echo ========================================
echo.
echo IMPORTANT: You will be prompted for credentials:
echo   Username: Your GitHub username
echo   Password: Use Personal Access Token (NOT password)
echo.
echo Create token: https://github.com/settings/tokens
echo   Scope: repo (full control)
echo.
echo Press any key to start push...
pause >nul
echo.

git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Push failed
    echo ========================================
    echo.
    echo Common issues:
    echo   1. Authentication: Use Personal Access Token as password
    echo   2. Repository not found or no access
    echo   3. Network/timeout issues
    echo.
    echo Check error message above for details.
    goto :error_exit
)

echo.
echo ========================================
echo SUCCESS! Code pushed to GitHub
echo ========================================
echo.
echo Repository: https://github.com/haryowl/LinuxOHW
echo.
goto :end

:error_exit
echo.
echo ========================================
echo SCRIPT ENDED WITH ERRORS
echo ========================================
echo Check the messages above for details.
echo.

:end
echo Press any key to exit...
pause >nul
exit /b 0
