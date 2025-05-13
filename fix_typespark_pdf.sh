#!/bin/bash
# TypeSpark Fix Script - Consolidated Version
# This script resolves PDF loading issues in the TypeSpark application

echo "================================"
echo "TypeSpark PDF Fix Script"
echo "================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof &> /dev/null; then
        if lsof -i tcp:$port | grep LISTEN > /dev/null; then
            return 0  # Port is in use
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep ":$port " > /dev/null; then
            return 0  # Port is in use
        fi
    fi
    return 1  # Port is free
}

# Function to terminate process using a port
terminate_port_process() {
    local port=$1
    echo "Finding process using port $port..."
    local pid=""
    
    if command -v lsof &> /dev/null; then
        pid=$(lsof -i tcp:$port | grep LISTEN | awk '{print $2}')
    elif command -v netstat &> /dev/null; then
        pid=$(netstat -tulnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1)
    fi
    
    if [[ -n "$pid" ]]; then
        echo "Terminating process $pid using port $port..."
        kill -15 $pid 2>/dev/null || { echo "Failed to terminate process gently, requires admin privileges"; }
        sleep 2
        
        # Check if process still exists
        if ps -p $pid > /dev/null 2>&1; then
            echo "Process still running. You may need admin privileges to terminate it."
            echo "Try running: sudo kill -9 $pid"
            echo "Then run this script again."
            echo "Continuing with other fixes..."
        else
            echo "Process terminated."
        fi
    else
        echo "No process found using port $port."
    fi
}

# Function to create missing directories
create_directories() {
    echo "Creating required directories..."
    
    # Create uploads directory if it doesn't exist
    if [ ! -d "backend/uploads" ]; then
        mkdir -p backend/uploads
        echo "Created backend/uploads directory."
    fi
    
    # Set appropriate permissions
    chmod 755 backend/uploads
    echo "Set permissions for uploads directory."
}

# Function to fix port configuration
fix_port_configuration() {
    echo "Checking port configuration..."
    
    # Update backend port in app.py
    if grep -q "app.run(debug=True, host='0.0.0.0', port=5001)" backend/app.py; then
        echo "Changing backend port from 5001 to 5002..."
        
        # Use appropriate sed syntax based on OS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's/port=5001/port=5002/g' backend/app.py
        else
            # Linux
            sed -i 's/port=5001/port=5002/g' backend/app.py
        fi
        
        echo "Updating API_URL in frontend files..."
        # Find and update API_URL references in frontend JavaScript files
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            find frontend/src -type f -name "*.js" -exec sed -i '' 's|http://localhost:5001/api|http://localhost:5002/api|g' {} \;
        else
            # Linux
            find frontend/src -type f -name "*.js" -exec sed -i 's|http://localhost:5001/api|http://localhost:5002/api|g' {} \;
        fi
        
        echo "Port configuration updated. Backend will now use port 5002."
    else
        if grep -q "port=5002" backend/app.py; then
            echo "Backend already configured for port 5002."
        else
            echo "Could not find port configuration in app.py."
        fi
    fi
    
    # Check API_URL in frontend files
    if grep -q "http://localhost:5001/api" frontend/src/services/api.js 2>/dev/null; then
        echo "Updating API_URL in frontend/src/services/api.js..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's|http://localhost:5001/api|http://localhost:5002/api|g' frontend/src/services/api.js
        else
            # Linux
            sed -i 's|http://localhost:5001/api|http://localhost:5002/api|g' frontend/src/services/api.js
        fi
        echo "API URL updated in api.js."
    fi
}

# Function to install Python dependencies
install_dependencies() {
    echo "Checking Python dependencies..."
    
    # Check if virtual environment exists
    if [ ! -d "backend/venv" ]; then
        echo "Creating virtual environment..."
        cd backend
        python3 -m venv venv
        cd ..
    fi
    
    # Activate virtual environment and install dependencies
    echo "Installing/updating dependencies..."
    cd backend
    source venv/bin/activate
    
    echo "Installing core dependencies..."
    pip install flask flask-cors Werkzeug
    
    # Try to install PyMuPDF with more robust error handling
    echo "Attempting to install PyMuPDF..."
    pip install --upgrade "PyMuPDF>=1.22.0" || {
        echo "PyMuPDF installation failed, trying alternative methods..."
        
        # Try installing with specific pip flags for Apple Silicon
        if [[ "$OSTYPE" == "darwin"* ]] && [[ $(uname -m) == "arm64" ]]; then
            echo "Detected macOS on Apple Silicon, trying alternative installation..."
            pip install --no-cache-dir --no-binary :all: PyMuPDF || echo "Alternative PyMuPDF installation failed"
        fi
    }
    
    # Ensure PyPDF2 is installed as fallback
    echo "Installing PyPDF2 as fallback..."
    pip install --upgrade "PyPDF2>=3.0.0"
    
    # Install psutil for diagnostics (if available)
    pip install psutil || echo "psutil installation failed, some diagnostics will be limited"
    
    # Deactivate virtual environment
    deactivate
    cd ..
    
    echo "Dependencies installation completed."
}

# Function to clean up the uploads folder
clean_uploads() {
    echo "Cleaning up uploads folder..."
    
    if [ ! -d "backend/uploads" ]; then
        echo "Uploads folder does not exist."
        return
    fi
    
    # Count files
    file_count=$(find backend/uploads -type f | wc -l)
    
    if [ "$file_count" -gt 0 ]; then
        echo "Found $file_count files in uploads folder. Removing..."
        rm -f backend/uploads/*
        echo "Uploads folder cleaned."
    else
        echo "Uploads folder is already empty."
    fi
}

# Function to print configuration status
print_status() {
    echo "================================"
    echo "Configuration Status:"
    echo "================================"
    
    # Check backend port
    backend_port="Unknown"
    if grep -q "port=5002" backend/app.py 2>/dev/null; then
        backend_port="5002"
    elif grep -q "port=5001" backend/app.py 2>/dev/null; then
        backend_port="5001"
    fi
    echo "Backend port: $backend_port"
    
    # Check API URL in frontend
    api_url="Unknown"
    if grep -q "http://localhost:5002/api" frontend/src/services/api.js 2>/dev/null; then
        api_url="http://localhost:5002/api"
    elif grep -q "http://localhost:5001/api" frontend/src/services/api.js 2>/dev/null; then
        api_url="http://localhost:5001/api"
    fi
    echo "Frontend API URL: $api_url"
    
    # Check if PDF libraries are installed
    cd backend
    source venv/bin/activate
    echo "PDF libraries:"
    pip list | grep -E "PyMuPDF|PyPDF2" || echo "No PDF libraries found"
    deactivate
    cd ..
    
    echo "================================"
}

# Main execution

# 1. Check and terminate processes using ports
echo "Checking if ports are in use..."
if check_port 5001; then
    echo "Port 5001 is in use."
    terminate_port_process 5001
fi
if check_port 5002; then
    echo "Port 5002 is in use."
    terminate_port_process 5002
fi

# 2. Create missing directories
create_directories

# 3. Fix port configuration
fix_port_configuration

# 4. Install dependencies
install_dependencies

# 5. Clean uploads folder
clean_uploads

# 6. Print status
print_status

echo "================================"
echo "TypeSpark Fix Script Completed"
echo "================================"
echo "You can now start the application with:"
echo "  1. In one terminal: cd backend && source venv/bin/activate && python app.py"
echo "  2. In another terminal: cd frontend && npm start"
echo ""
echo "If you continue to have issues:"
echo "  - Try the Quick Start option first to test without PDF upload"
echo "  - Try with a very small PDF first (1-2 pages)"
echo "  - Check the backend console for specific error messages"

exit 0