#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}TypeSpark Connection Troubleshooter${NC}"
echo "===================================="
echo "This script will help fix connection issues between the frontend and backend."

# Check if backend is running
echo -e "\n${YELLOW}Step 1: Checking if backend is running...${NC}"
if pgrep -f "python app.py" > /dev/null; then
    echo -e "${GREEN}✓ Backend process is running${NC}"
else
    echo -e "${RED}✗ Backend process is not running${NC}"
    echo "Starting backend server..."
    
    # Navigate to backend directory
    cd backend 2>/dev/null || { 
        echo -e "${RED}Error: Cannot find backend directory${NC}"
        echo "Make sure you're running this script from the project root directory"
        exit 1
    }
    
    # Check for virtual environment
    if [ -d "venv" ]; then
        echo "Activating virtual environment..."
        source venv/bin/activate 2>/dev/null || {
            echo -e "${RED}Error: Could not activate virtual environment${NC}"
            echo "Try running: python -m venv venv && source venv/bin/activate"
            exit 1
        }
    else
        echo -e "${YELLOW}Warning: No virtual environment found. Creating one...${NC}"
        python3 -m venv venv || python -m venv venv || {
            echo -e "${RED}Error: Could not create virtual environment${NC}"
            echo "Please install virtualenv: pip install virtualenv"
            exit 1
        }
        source venv/bin/activate
        echo "Installing dependencies..."
        pip install -r ../requirements.txt
    fi
    
    # Start the backend server on port 5002
    echo "Starting backend server on port 5002..."
    python app.py --port=5002 &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Backend started with PID: $BACKEND_PID${NC}"
    
    # Wait for backend to initialize
    echo "Waiting for backend to initialize..."
    sleep 3
fi

# Check if backend is accessible
echo -e "\n${YELLOW}Step 2: Checking backend connectivity...${NC}"
BACKEND_URL="http://localhost:5002/api/health"
if curl -s "$BACKEND_URL" > /dev/null; then
    echo -e "${GREEN}✓ Backend is accessible at $BACKEND_URL${NC}"
else
    echo -e "${RED}✗ Cannot connect to backend at $BACKEND_URL${NC}"
    echo "Updating backend configuration..."
    
    # Modify backend port in app.py
    cd backend
    if [ -f "app.py" ]; then
        echo "Updating app.py to use port 5002..."
        # Add a line at the end of app.py to ensure it runs on port 5002
        if grep -q "if __name__ == '__main__':" app.py; then
            # Already has a main block - modify it
            sed -i.bak 's/app\.run.*/app.run(debug=True, host='\''0.0.0.0'\'', port=5002)/' app.py
        else
            # Add a main block
            echo -e "\n# Modified by fix script\nif __name__ == '__main__':\n    app.run(debug=True, host='0.0.0.0', port=5002)" >> app.py
        fi
        echo -e "${GREEN}✓ Updated app.py${NC}"
        
        # Restart backend
        echo "Restarting backend..."
        pkill -f "python app.py" || true
        python app.py --port=5002 &
        BACKEND_PID=$!
        echo -e "${GREEN}✓ Backend restarted with PID: $BACKEND_PID${NC}"
        sleep 3
    else
        echo -e "${RED}Error: app.py not found${NC}"
    fi
    cd ..
fi

# Update the API URL in frontend code
echo -e "\n${YELLOW}Step 3: Updating frontend API configuration...${NC}"
cd frontend || {
    echo -e "${RED}Error: Cannot find frontend directory${NC}"
    exit 1
}

# Check for the services/api.js file
if [ -f "src/services/api.js" ]; then
    echo "Updating API URL in src/services/api.js..."
    sed -i.bak 's#http://188\.136\.27\.4:5002/api#http://localhost:5002/api#g' src/services/api.js
    sed -i.bak 's#const API_URL = .*#const API_URL = '\''http://localhost:5002/api'\'';#g' src/services/api.js
    echo -e "${GREEN}✓ Updated src/services/api.js${NC}"
else
    echo -e "${YELLOW}Warning: src/services/api.js not found${NC}"
fi

# Update API URL in HomePage.js
if [ -f "src/pages/HomePage.js" ]; then
    echo "Updating API URL in src/pages/HomePage.js..."
    sed -i.bak 's#http://188\.136\.27\.4:5002/api#http://localhost:5002/api#g' src/pages/HomePage.js
    sed -i.bak 's#const API_URL = .*#const API_URL = '\''http://localhost:5002/api'\'';#g' src/pages/HomePage.js
    echo -e "${GREEN}✓ Updated src/pages/HomePage.js${NC}"
else
    echo -e "${YELLOW}Warning: src/pages/HomePage.js not found${NC}"
fi

# Update API URL in PracticePage.js
if [ -f "src/pages/PracticePage.js" ]; then
    echo "Updating API URL in src/pages/PracticePage.js..."
    sed -i.bak 's#http://188\.136\.27\.4:5002/api#http://localhost:5002/api#g' src/pages/PracticePage.js
    sed -i.bak 's#const API_URL = .*#const API_URL = '\''http://localhost:5002/api'\'';#g' src/pages/PracticePage.js
    echo -e "${GREEN}✓ Updated src/pages/PracticePage.js${NC}"
else
    echo -e "${YELLOW}Warning: src/pages/PracticePage.js not found${NC}"
fi

# Update API URL in ConnectionTester.js
if [ -f "src/components/ConnectionTester.js" ]; then
    echo "Updating API URL in src/components/ConnectionTester.js..."
    sed -i.bak 's#http://188\.136\.27\.4:5002/api#http://localhost:5002/api#g' src/components/ConnectionTester.js
    sed -i.bak 's#const API_URL = .*#const API_URL = '\''http://localhost:5002/api'\'';#g' src/components/ConnectionTester.js
    echo -e "${GREEN}✓ Updated src/components/ConnectionTester.js${NC}"
else
    echo -e "${YELLOW}Warning: src/components/ConnectionTester.js not found${NC}"
fi

# Update API URL in DebugInfo.js
if [ -f "src/DebugInfo.js" ]; then
    echo "Updating API URL in src/DebugInfo.js..."
    sed -i.bak 's#http://188\.136\.27\.4:5002/api#http://localhost:5002/api#g' src/DebugInfo.js
    sed -i.bak 's#const API_URL = .*#const API_URL = '\''http://localhost:5002/api'\'';#g' src/DebugInfo.js
    echo -e "${GREEN}✓ Updated src/DebugInfo.js${NC}"
else
    echo -e "${YELLOW}Warning: src/DebugInfo.js not found${NC}"
fi

cd ..

# Restart frontend (if it's running)
echo -e "\n${YELLOW}Step 4: Checking frontend status...${NC}"
if pgrep -f "node.*react-scripts start" > /dev/null; then
    echo "Frontend is running. Restarting..."
    pkill -f "node.*react-scripts start" || true
    cd frontend
    # Start frontend in background
    npm start &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Frontend restarted${NC}"
else
    echo "Frontend is not running. Starting..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Frontend started${NC}"
fi

echo -e "\n${GREEN}=== TypeSpark Connection Fix Complete ===${NC}"
echo "The application should now be running properly with:"
echo "Backend: http://localhost:5002"
echo "Frontend: http://localhost:3000 or http://localhost:3001"
echo -e "\nIf you still experience issues, try refreshing your browser or:"
echo "1. Kill all running instances: pkill -f 'python app.py' && pkill -f 'node.*react-scripts'"
echo "2. Restart both servers manually:"
echo "   - Backend: cd backend && source venv/bin/activate && python app.py --port=5002"
echo "   - Frontend: cd frontend && npm start"
echo -e "\nHappy typing!"