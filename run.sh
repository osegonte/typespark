#!/bin/bash

# Function to handle process termination
cleanup() {
    echo "Stopping all processes..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up trap to handle Ctrl+C
trap cleanup INT TERM

# Start the backend - Explicitly setting port to 5002
echo "Starting the backend..."
cd backend
source venv/bin/activate
python app.py --port=5002 &
BACKEND_PID=$!
cd ..

# Wait a moment for the backend to initialize
sleep 3

# Start the frontend
echo "Starting the frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# Print URLs - Updated to use port 5002 for backend
echo "TypeSpark is running!"
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop both servers"

# Wait for one of the processes to exit
wait $BACKEND_PID $FRONTEND_PID

# If we get here, one of the processes exited
echo "A process has stopped. Cleaning up..."
cleanup