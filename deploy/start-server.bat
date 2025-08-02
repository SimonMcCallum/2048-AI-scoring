@echo off
echo 🎮 Starting 2048 Analytics Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist package.json (
    echo ❌ package.json not found
    echo Please run this script from the deploy directory
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

REM Start the server
echo 🚀 Starting server on http://127.0.0.1:3000
echo.
echo Press Ctrl+C to stop the server
echo.
node server.js

pause
