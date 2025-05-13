#!/bin/bash
# Improved run script for TypeSpark
# This script handles more edge cases and provides better feedback

# Set colored output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Function to display banner
show_banner() {
  clear
  echo -e "${BLUE}"
  echo "┌─────────────────────────────────────────────┐"
  echo "│                TypeSpark                     │" 
  echo "│         Typing Practice Application          │"
  echo "└─────────────────────────────────────────────┘"
  echo -e "${NC}"
}

# Function to handle process termination
cleanup() {
    echo -e "\n${YELLOW}Stopping all processes...${NC}"
    
    if [[ -n "$BACKEND_PID" ]]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [[ -n "$FRONTEND_PID" ]]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}All processes stopped. Goodbye!${NC}"
    exit 0
}

# Set up trap to handle Ctrl+C and other termination signals
trap cleanup INT TERM

# Display banner
show_banner

# Check for required directories and files
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}Error: backend or frontend directory not found.${NC}"
    echo "Please make sure you're running this script from the TypeSpark root directory."
    exit 1
fi

# Check for virtual environment
if [ ! -d "backend/venv" ]; then
    echo -e "${YELLOW}Virtual environment not found. Running setup...${NC}"
    ./setup.sh
    
    # Check if setup was successful
    if [ ! -d "backend/venv" ]; then
        echo -e "${RED}Setup failed. Please run setup.sh manually and check for errors.${NC}"
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Frontend dependencies not found. Installing...${NC}"
    cd frontend
    npm install
    cd ..
    
    # Check if installation was successful
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "${RED}Frontend setup failed. Please run 'cd frontend && npm install' manually.${NC}"
        exit 1
    fi
fi

# Clean uploads directory
echo -e "${BLUE}Cleaning up old uploads...${NC}"
find backend/uploads -type f -mtime +1 -delete 2>/dev/null

# Start the backend
echo -e "${BLUE}Starting the backend...${NC}"
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Check if backend started successfully
sleep 2
if ! ps -p $BACKEND_PID > /dev/null; then
    echo -e "${RED}Backend failed to start.${NC}"
    echo "Try running fix_typespark.sh to resolve common issues."
    exit 1
fi

# Wait for backend to initialize
echo -e "${YELLOW}Waiting for backend to initialize...${NC}"
sleep 3

# Start the frontend
echo -e "${BLUE}Starting the frontend...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if ! ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${RED}Frontend failed to start.${NC}"
    kill $BACKEND_PID
    exit 1
fi

# Print URLs and usage instructions
echo -e "\n${GREEN}TypeSpark is running!${NC}"
echo -e "Backend: ${BLUE}http://localhost:5002${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "\n${YELLOW}Usage:${NC}"
echo "- Open http://localhost:3000 in your browser"
echo "- Upload a PDF or text file, or use Quick Start for immediate practice"
echo "- Press Ctrl+C to stop both servers"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID

# If we get here, one of the processes exited
echo -e "\n${RED}A process has stopped unexpectedly. Cleaning up...${NC}"
cleanup