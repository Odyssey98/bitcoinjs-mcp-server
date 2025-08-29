#!/bin/bash

# BitcoinJS MCP Server Startup Script

set -e

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 18 ]; then
    echo "Error: Node.js version $NODE_VERSION is not supported. Please install Node.js 18 or later."
    exit 1
fi

# Check if build directory exists
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Start the MCP server
echo "Starting BitcoinJS MCP Server..."
node dist/index.js