#!/bin/bash

# Exit on error
set -e

# Default mode is development
MODE=${1:-dev}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies not found. Running setup script..."
    ./setup.sh
fi

# Run the app
if [ "$MODE" = "prod" ] || [ "$MODE" = "production" ]; then
    echo "🚀 Starting LokiKube in production mode..."
    npm start
else
    echo "🚀 Starting LokiKube in development mode..."
    npm run dev
fi 