#!/bin/bash

echo "🎮 Starting 2048 Analytics Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    echo "Please run this script from the deploy directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo
fi

# Start the server
echo "🚀 Starting server on http://127.0.0.1:3000"
echo
echo "Press Ctrl+C to stop the server"
echo

node server.js
