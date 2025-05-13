#!/bin/bash
# TypeSpark Run Script for macOS
# This script starts both the backend and frontend servers

# Store PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

# Function to check if a process is running
is_process_running() {
    local pid=$1
    if ps -p $pid > /dev/null; then
        return 0  # Process is running
    else
        return 1  # Process is not running
    fi
}

# Function to handle process termination
cleanup() {
    echo -e "\nStopping all processes..."
    
    if [[ -n "$BACKEND_PID" ]]; then
        echo "Stopping backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [[ -n "$FRONTEND_PID" ]]; then
        echo "Stopping frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "All processes stopped. Goodbye!"
    exit 0
}

# Set up trap to handle Ctrl+C and other termination signals
trap cleanup INT TERM

# Display banner
clear
echo "┌─────────────────────────────────────────────┐"
echo "│                TypeSpark                     │" 
echo "│         Typing Practice Application          │"
echo "└─────────────────────────────────────────────┘"

# Check for required directories and files
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "Error: backend or frontend directory not found."
    echo "Please make sure you're running this script from the TypeSpark root directory."
    exit 1
fi

# Create uploads directory if it doesn't exist
if [ ! -d "backend/uploads" ]; then
    echo "Creating uploads directory..."
    mkdir -p backend/uploads
fi

# Check for virtual environment
if [ ! -d "backend/venv" ]; then
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Frontend dependencies not found. Please run 'cd frontend && npm install' first."
    exit 1
fi

# Start the backend
echo "Starting the backend..."
cd backend
source venv/bin/activate
python app.py &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to initialize
sleep 3

# Check if backend started successfully
if ! is_process_running $BACKEND_PID; then
    echo "Backend failed to start. Please check logs and ensure port 5002 is available."
    exit 1
fi

# Start the frontend
echo "Starting the frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Wait a moment for the frontend to initialize
sleep 3

# Check if frontend started successfully
if ! is_process_running $FRONTEND_PID; then
    echo "Frontend failed to start. Please check logs for errors."
    # Kill backend since frontend failed
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Print URLs
echo "TypeSpark is running!"
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both servers"

# Wait for processes
while is_process_running $BACKEND_PID && is_process_running $FRONTEND_PID; do
    sleep 1
done

# If we get here, one of the processes exited
echo "A process has stopped. Cleaning up..."
cleanup