@echo off
REM Simplified version - keeps window open and shows all output
REM This version won't close unexpectedly

echo ========================================
echo Gali-Parse GitHub Push Script
echo ========================================
echo.

REM Keep window open on error
setlocal

REM Check if git is installed
echo Checking Git installation...
git --version
if errorlevel 1 (
    echo.
    echo ERROR: Git is not installed!
    echo Download from: https://git-scm.com/download/win
    goto :error_exit
)
echo.

REM Initialize git
echo Checking/initializing repository...
if not exist .git (
    git init
    if errorlevel 1 goto :error_exit
)
echo.

REM Configure remote
echo Configuring remote...
git remote remove origin 2>nul
git remote add origin https://github.com/haryowl/LinuxOHW.git
if errorlevel 1 goto :error_exit
echo.

REM Check git config
echo Checking Git identity...
git config user.name >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git user.name not set!
    echo Run: git config --global user.name "Your Name"
    goto :error_exit
)
git config user.email >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git user.email not set!
    echo Run: git config --global user.email "your@email.com"
    goto :error_exit
)
echo   Name: 
git config user.name
echo   Email: 
git config user.email
echo.

REM Add files
echo Adding files...
git add .
if errorlevel 1 (
    echo WARNING: Some files may not have been added
)
echo.

REM Show status
echo Files ready to commit:
git status --short
echo.

REM Confirm
echo.
echo Ready to commit and push?
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

REM Commit
echo Creating commit...
git commit -m "Initial commit: Gali-Parse GPS tracking parser with production deployment setup"
if errorlevel 1 (
    echo WARNING: Commit may have failed or nothing to commit
    echo Checking status...
    git status
    echo.
    echo Continue anyway? (Y/N)
    choice /C YN /N
    if errorlevel 2 goto :error_exit
)
echo.

REM Set branch
echo Setting branch to main...
git branch -M main 2>nul
echo.

REM Push
echo.
echo ========================================
echo PUSHING TO GITHUB
echo ========================================
echo.
echo IMPORTANT: When prompted:
echo   Username: haryowl (or your GitHub username)
echo   Password: Use Personal Access Token (NOT password)
echo.
echo Get token: https://github.com/settings/tokens
echo.
echo Press any key to start push...
pause >nul
echo.

git push -u origin main
if errorlevel 1 (
    echo.
    echo ========================================
    echo PUSH FAILED
    echo ========================================
    echo.
    echo Check the error above. Common issues:
    echo - Use Personal Access Token as password
    echo - Check repository exists and you have access
    echo - Check internet connection
    goto :error_exit
)

echo.
echo ========================================
echo SUCCESS!
echo ========================================
echo.
echo Repository: https://github.com/haryowl/LinuxOHW
echo.
goto :end

:error_exit
echo.
echo ========================================
echo SCRIPT STOPPED
echo ========================================
echo Check the errors above.
:end
echo.
echo Press any key to exit...
pause >nul
exit /b %errorlevel%

