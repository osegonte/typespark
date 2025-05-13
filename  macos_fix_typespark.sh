#!/bin/bash
# TypeSpark Fix Script for macOS
# This script resolves common issues with the TypeSpark application setup

echo "================================"
echo "TypeSpark Fix Script (macOS version)"
echo "================================"

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -i tcp:$port | grep LISTEN > /dev/null; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to terminate process using a port
terminate_port_process() {
    local port=$1
    echo "Finding process using port $port..."
    local pid=$(lsof -i tcp:$port | grep LISTEN | awk '{print $2}')
    
    if [[ -n "$pid" ]]; then
        echo "Terminating process $pid using port $port..."
        kill -15 $pid 2>/dev/null || { echo "Failed to terminate process gently, requires admin privileges"; }
        sleep 2
        
        # Check if process still exists and suggest sudo if needed
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

# Function to fix app_diagnostics issue
fix_diagnostics() {
    echo "Checking for app_diagnostics.py..."
    
    # Copy app_diagnostics to backend directory if it exists at root
    if [ -f "app_diagnostics.py" ] && [ ! -f "backend/app_diagnostics.py" ]; then
        echo "Found app_diagnostics.py at root. Copying to backend directory..."
        cp app_diagnostics.py backend/
        echo "app_diagnostics.py copied to backend directory."
    elif [ ! -f "backend/app_diagnostics.py" ] && [ ! -f "app_diagnostics.py" ]; then
        echo "app_diagnostics.py not found. Creating file in backend directory..."
        cat > backend/app_diagnostics.py << 'EOF'
"""
Diagnostic routes for TypeSpark backend with enhanced performance monitoring
This module provides diagnostic endpoints for monitoring application status
"""

from flask import jsonify, request
import os
import sys
import platform
import time
import logging
from pdf_parser import PDFParser

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def register_diagnostic_routes(app, upload_folder):
    """Register diagnostic routes with the Flask application"""
    
    @app.route('/api/diagnostics/system', methods=['GET'])
    def system_info():
        """Return system information"""
        try:
            # Get memory info using os module instead of psutil
            mem_info = {}
            try:
                import psutil
                memory = psutil.virtual_memory()
                mem_info = {
                    'total_gb': round(memory.total / (1024 ** 3), 2),
                    'available_gb': round(memory.available / (1024 ** 3), 2),
                    'percent_used': memory.percent
                }
                
                # Get CPU info
                cpu_info = {
                    'cores': psutil.cpu_count(logical=False),
                    'logical_cores': psutil.cpu_count(logical=True),
                    'current_usage_percent': psutil.cpu_percent(interval=0.1)
                }
                
                # Get disk info for the upload folder
                disk = psutil.disk_usage(os.path.dirname(upload_folder))
                disk_info = {
                    'total_gb': round(disk.total / (1024 ** 3), 2),
                    'free_gb': round(disk.free / (1024 ** 3), 2),
                    'percent_used': disk.percent
                }
            except ImportError:
                # Fallback if psutil not available
                mem_info = {
                    'note': 'psutil not available - limited information available'
                }
                cpu_info = {
                    'note': 'psutil not available - limited information available'
                }
                disk_info = {
                    'note': 'psutil not available - limited information available'
                }
            
            return jsonify({
                'python_version': sys.version,
                'platform': platform.platform(),
                'node': platform.node(),
                'upload_folder': upload_folder,
                'upload_folder_exists': os.path.exists(upload_folder),
                'upload_folder_writable': os.access(upload_folder, os.W_OK) if os.path.exists(upload_folder) else False,
                'memory': mem_info,
                'cpu': cpu_info,
                'disk': disk_info,
                'server_time': time.time()
            })
        except Exception as e:
            logger.error(f"Error in system diagnostics: {str(e)}")
            return jsonify({
                'error': str(e),
                'python_version': sys.version,
                'platform': platform.platform(),
                'upload_folder': upload_folder,
                'upload_folder_exists': os.path.exists(upload_folder)
            })
    
    @app.route('/api/diagnostics/pdf', methods=['GET'])
    def pdf_support():
        """Return PDF support status"""
        return jsonify(PDFParser.get_pdf_support_status())
    
    @app.route('/api/diagnostics/storage', methods=['GET'])
    def storage_info():
        """Return storage information"""
        if not os.path.exists(upload_folder):
            return jsonify({
                'error': 'Upload folder does not exist'
            })
        
        files = []
        total_size = 0
        
        for filename in os.listdir(upload_folder):
            file_path = os.path.join(upload_folder, filename)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                total_size += size
                files.append({
                    'name': filename,
                    'size': size,
                    'size_kb': round(size / 1024, 2),
                    'created': os.path.getctime(file_path)
                })
        
        return jsonify({
            'files_count': len(files),
            'total_size': total_size,
            'total_size_kb': round(total_size / 1024, 2),
            'files': sorted(files, key=lambda x: x['created'], reverse=True)[:20]  # Limit to 20 files, sorted by newest
        })
    
    @app.route('/api/diagnostics/cleanup', methods=['POST'])
    def cleanup_uploads():
        """Clean up old uploads to free space"""
        try:
            if not os.path.exists(upload_folder):
                return jsonify({
                    'error': 'Upload folder does not exist'
                })
            
            files_deleted = 0
            bytes_freed = 0
            
            for filename in os.listdir(upload_folder):
                file_path = os.path.join(upload_folder, filename)
                if os.path.isfile(file_path):
                    # Check if the file is older than 1 hour
                    file_age = time.time() - os.path.getmtime(file_path)
                    if file_age > 3600:  # 1 hour in seconds
                        size = os.path.getsize(file_path)
                        os.remove(file_path)
                        files_deleted += 1
                        bytes_freed += size
            
            return jsonify({
                'success': True,
                'files_deleted': files_deleted,
                'space_freed_kb': round(bytes_freed / 1024, 2)
            })
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return jsonify({
                'error': str(e)
            })
EOF
        echo "Created app_diagnostics.py in backend directory."
    else
        echo "app_diagnostics.py already exists in backend directory."
    fi
}

# Function to check and install required Python packages
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
    
    # Install psutil for diagnostics (if available)
    pip install psutil || echo "psutil installation failed, some diagnostics will be limited"
    
    # Try to install PyMuPDF with improved compatibility
    echo "Attempting to install PyMuPDF..."
    pip install --upgrade "PyMuPDF>=1.22.0" || echo "PyMuPDF installation failed, will fall back to PyPDF2"
    
    # Ensure PyPDF2 is installed as fallback
    pip install --upgrade "PyPDF2>=3.0.0"
    
    # Install other required packages
    pip install flask flask-cors Werkzeug gunicorn python-dotenv
    
    # Deactivate virtual environment
    deactivate
    cd ..
    
    echo "Dependencies installation completed."
}

# Function to update port configuration
update_ports() {
    echo "Updating port configuration..."
    
    # Check current backend port
    if grep -q "app.run(debug=True, host='0.0.0.0', port=5001)" backend/app.py; then
        echo "Changing backend port from 5001 to 5002..."
        # Use sed with compatible syntax for macOS
        sed -i '' 's/port=5001/port=5002/g' backend/app.py
        
        # Also update API_URL in frontend files
        echo "Updating API_URL in frontend files..."
        find frontend/src -type f -name "*.js" -exec sed -i '' 's|http://localhost:5001/api|http://localhost:5002/api|g' {} \;
        
        echo "Port configuration updated. Backend will now use port 5002."
    else
        echo "Backend port is not 5001 or could not find port configuration."
    fi
}

# Function to clean up the uploads folder
clean_uploads() {
    echo "Cleaning up uploads folder..."
    
    if [ -d "backend/uploads" ]; then
        # Count files first
        file_count=$(find backend/uploads -type f | wc -l | tr -d ' ')
        
        if [ "$file_count" -gt 0 ]; then
            echo "Found $file_count files in uploads folder. Removing..."
            rm -f backend/uploads/*
            echo "Uploads folder cleaned."
        else
            echo "Uploads folder is already empty."
        fi
    else
        echo "Uploads folder does not exist."
    fi
}

# Main execution

# 1. Check and terminate processes using port 5001
echo "Checking if port 5001 is in use..."
if check_port 5001; then
    echo "Port 5001 is in use."
    terminate_port_process 5001
else
    echo "Port 5001 is not in use."
fi

# 2. Create missing directories
create_directories

# 3. Fix app_diagnostics issue
fix_diagnostics

# 4. Install dependencies
install_dependencies

# 5. Update port configuration
update_ports

# 6. Clean uploads folder
clean_uploads

echo "================================"
echo "TypeSpark Fix Script Completed"
echo "================================"
echo "You can now start the application with:"
echo "  1. In one terminal: cd backend && source venv/bin/activate && python app.py"
echo "  2. In another terminal: cd frontend && npm start"
echo ""
echo "If you still encounter issues with port 5001 being in use, try:"
echo "  sudo lsof -i :5001"
echo "  sudo kill -9 <PID>"
echo "where <PID> is the process ID using port 5001."

exit 0