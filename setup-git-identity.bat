@echo off
REM Quick script to set Git user identity
REM Run this once before pushing to GitHub

echo ========================================
echo Git Identity Setup
echo ========================================
echo.

REM Check current config
echo Current Git configuration:
echo.
git config user.name >nul 2>&1
if errorlevel 1 (
    echo   Name: NOT SET
) else (
    echo   Name: 
    git config user.name
)

git config user.email >nul 2>&1
if errorlevel 1 (
    echo   Email: NOT SET
) else (
    echo   Email: 
    git config user.email
)
echo.

REM Ask user for input
echo Please enter your Git identity:
echo (Press Enter to skip and keep current values)
echo.

set /p GIT_NAME="Enter your name (or press Enter to skip): "
if not "%GIT_NAME%"=="" (
    git config --global user.name "%GIT_NAME%"
    echo   Set user.name to: %GIT_NAME%
)

echo.
set /p GIT_EMAIL="Enter your email (or press Enter to skip): "
if not "%GIT_EMAIL%"=="" (
    git config --global user.email "%GIT_EMAIL%"
    echo   Set user.email to: %GIT_EMAIL%
)

echo.
echo ========================================
echo Updated Git configuration:
echo.
echo   Name: 
git config user.name
echo   Email: 
git config user.email
echo ========================================
echo.
echo You can now run push-to-github.bat
echo.
pause

