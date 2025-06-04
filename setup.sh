#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up LokiKube - Kubernetes Cluster Management Web App"
echo "==============================================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cat > .env.local << EOF
# Server-side environment variables
NEXT_PUBLIC_APP_NAME=LokiKube
EOF
    echo "✅ Created .env.local file"
fi

# Build the project
echo "🏗️ Building the project..."
npm run build

echo "✨ Setup complete! You can now run the app with:"
echo "npm run dev    # Development mode"
echo "npm start      # Production mode"
echo ""
echo "🌐 The app will be available at http://localhost:3000"
echo "📝 Documentation: See README.md for more information" 