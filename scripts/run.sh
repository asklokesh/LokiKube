#!/bin/bash

# Set color variables for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if first argument is "prod" to run in production mode
if [ "$1" == "prod" ]; then
  MODE="production"
  COMMAND="start"
else
  MODE="development"
  COMMAND="dev"
fi

echo -e "${GREEN}🚀 Starting LokiKube in ${MODE} mode${NC}"
echo -e "==============================================="
echo ""

# Check if node_modules exists, if not suggest running setup.sh
if [ ! -d "node_modules" ]; then
  echo -e "${RED}❌ node_modules directory not found!${NC}"
  echo -e "Please run ${BLUE}./setup.sh${NC} first to install dependencies."
  exit 1
fi

# Run the app
echo -e "${BLUE}🌐 Starting server...${NC}"
echo -e "${BLUE}📝 The app will be available at http://localhost:3000${NC}"
echo -e "${BLUE}💡 Press Ctrl+C to stop the server${NC}"
echo ""

npm run $COMMAND 