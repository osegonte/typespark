#!/bin/bash

# Create directories if they don't exist
mkdir -p backend/uploads
mkdir -p frontend

# Check if Python is installed
if command -v python3 &>/dev/null; then
    echo "Python detected, setting up backend..."
    
    # Create virtual environment
    cd backend
    python3 -m venv venv
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    pip install -r ../requirements.txt
    
    cd ..
else
    echo "Python not found. Please install Python 3.7+ to run the backend."
    exit 1
fi

# Check if Node.js is installed
if command -v npm &>/dev/null; then
    echo "Node.js detected, setting up frontend..."
    
    # Navigate to frontend and install dependencies
    cd frontend
    
    # Initialize React app if it doesn't exist
    if [ ! -f "package.json" ]; then
        echo "Initializing React app..."
        npx create-react-app .
    fi
    
    # Install dependencies
    npm install axios tailwindcss@3.3.3 react-router-dom @headlessui/react lucide-react
    
    # Initialize Tailwind CSS
    npx tailwindcss init -p
    
    cd ..
else
    echo "Node.js not found. Please install Node.js 16+ to run the frontend."
    exit 1
fi

echo "Setup complete! Follow the instructions in README.md to run the application."