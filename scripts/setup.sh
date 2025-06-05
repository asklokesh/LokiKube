#!/bin/bash

# Set color variables for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}🚀 Setting up LokiKube - Kubernetes Cluster Management Web App${NC}"
echo -e "==============================================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
echo ""
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
echo -e "${BLUE}🏗️ Building the project...${NC}"
echo ""
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✨ Setup complete! You can now run the app with:${NC}"
    echo -e "npm run dev    # Development mode"
    echo -e "npm start      # Production mode"
    echo ""
    echo -e "${BLUE}🌐 The app will be available at http://localhost:3000${NC}"
    echo -e "${BLUE}📝 Documentation: See README.md for more information${NC}"
    echo ""
    exit 0
else
    echo -e "\033[0;31m❌ Setup failed. Please check the error messages above.${NC}"
    echo -e "If you need help, please open an issue on GitHub."
    exit 1
fi 