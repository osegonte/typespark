#!/bin/bash

# This script will fix the TypeSpark backend and frontend connection issues

echo "TypeSpark Connection Fix Script"
echo "==============================="
echo

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if required tools are available
if ! command_exists python; then
  echo "❌ Python not found. Please install Python 3.7+"
  exit 1
fi

if ! command_exists npm; then
  echo "❌ Node.js/npm not found. Please install Node.js"
  exit 1
fi

# 1. Fix backend port in app.py
echo "1. Updating backend port to 5002 in app.py..."
if [ -f "backend/app.py" ]; then
  if grep -q "app.run.*port=5001" backend/app.py; then
    # Replace port 5001 with 5002
    sed -i.bak 's/port=5001/port=5002/g' backend/app.py
    echo "✅ Updated port in app.py"
  elif grep -q "app.run.*port=5002" backend/app.py; then
    echo "✅ Port already set to 5002 in app.py"
  else
    # Add the correct port if not found
    echo -e "\n# Modified by fix script\nif __name__ == '__main__':\n    app.run(debug=True, host='0.0.0.0', port=5002)" >> backend/app.py
    echo "✅ Added port configuration to app.py"
  fi
else
  echo "❌ backend/app.py not found"
fi

# 2. Fix backend run.sh script
echo "2. Updating backend run.sh script..."
if [ -f "backend/run.sh" ]; then
  if grep -q "port=5001" backend/run.sh; then
    # Replace port 5001 with 5002
    sed -i.bak 's/port=5001/port=5002/g' backend/run.sh
    echo "✅ Updated port in backend/run.sh"
  elif grep -q "port=5002" backend/run.sh; then
    echo "✅ Port already set to 5002 in backend/run.sh"
  else
    # Create correct run.sh if needed
    echo -e "#!/bin/bash\nexport FLASK_APP=app.py\nexport FLASK_ENV=development\nflask run --host=0.0.0.0 --port=5002" > backend/run.sh
    chmod +x backend/run.sh
    echo "✅ Created backend/run.sh with port 5002"
  fi
else
  # Create run.sh if it doesn't exist
  echo -e "#!/bin/bash\nexport FLASK_APP=app.py\nexport FLASK_ENV=development\nflask run --host=0.0.0.0 --port=5002" > backend/run.sh
  chmod +x backend/run.sh
  echo "✅ Created backend/run.sh with port 5002"
fi

# 3. Fix frontend API URL in all relevant files
echo "3. Updating API URL in frontend files..."
API_FILES=(
  "frontend/src/services/api.js"
  "frontend/src/pages/HomePage.js"
  "frontend/src/pages/PracticePage.js"
  "frontend/src/DebugInfo.js"
)

for file in "${API_FILES[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "localhost:5001/api" "$file"; then
      # Replace port 5001 with 5002
      sed -i.bak 's/localhost:5001\/api/localhost:5002\/api/g' "$file"
      echo "✅ Updated API URL in $file"
    elif grep -q "localhost:5002/api" "$file"; then
      echo "✅ API URL already using port 5002 in $file"
    else
      echo "⚠️ API URL pattern not found in $file"
    fi
  else
    echo "⚠️ $file not found, skipping"
  fi
done

# 4. Add ConnectionTester component directory
echo "4. Creating ConnectionTester component..."
mkdir -p frontend/src/components
if [ ! -f "frontend/src/components/ConnectionTester.js" ]; then
  cat > frontend/src/components/ConnectionTester.js << 'EOL'
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import axios from 'axios';

// API URL for testing - Consistently use port 5002
const API_URL = 'http://localhost:5002/api';

function ConnectionTester() {
  const [status, setStatus] = useState('unknown');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Test connection to backend
  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/health`, { timeout: 5000 });
      setStatus('connected');
      setDetails(response.data);
      console.log('Backend connection success:', response.data);
    } catch (error) {
      console.error('Backend connection error:', error);
      setStatus('disconnected');
      
      // Try alternative port
      try {
        const altResponse = await axios.get('http://localhost:5001/api/health', { timeout: 3000 });
        setError('Wrong port: Connected to port 5001 instead of 5002. Update your backend to use port 5002.');
        setDetails(altResponse.data);
      } catch (altError) {
        setError(error.message || 'Could not connect to backend');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Test connection on component mount
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="mb-8 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Backend Connection</h3>
        <button 
          onClick={testConnection} 
          className="flex items-center bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <RefreshCw size={16} className="mr-1 animate-spin" />
          ) : (
            <RefreshCw size={16} className="mr-1" />
          )}
          Test Connection
        </button>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="mr-2">
          {status === 'connected' && <CheckCircle size={20} className="text-green-500" />}
          {status === 'disconnected' && <XCircle size={20} className="text-red-500" />}
          {status === 'unknown' && <RefreshCw size={20} className="animate-spin text-gray-500" />}
        </div>
        
        <div>
          {status === 'connected' && <span className="text-green-600 dark:text-green-400">Connected to backend at {API_URL}</span>}
          {status === 'disconnected' && <span className="text-red-600 dark:text-red-400">Could not connect to backend</span>}
          {status === 'unknown' && <span className="text-gray-600 dark:text-gray-400">Checking connection...</span>}
        </div>
      </div>
      
      {error && (
        <div className="mb-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 rounded text-sm">
          <div className="flex items-start">
            <AlertTriangle size={16} className="mr-1 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {status === 'connected' && (
        <div className="mt-2">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-accent-blue text-sm hover:underline"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          {showDetails && details && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono overflow-x-auto">
              <pre>{JSON.stringify(details, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      {status === 'disconnected' && (
        <div className="mt-2 text-sm">
          <p className="font-semibold">Troubleshooting steps:</p>
          <ol className="list-decimal pl-5 mt-1">
            <li>Verify backend is running with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">python app.py</code></li>
            <li>Ensure backend is using port 5002</li>
            <li>Check for any error messages in the backend console</li>
            <li>Restart both frontend and backend</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default ConnectionTester;
EOL
  echo "✅ Created ConnectionTester component"
else
  echo "✅ ConnectionTester component already exists"
fi

# 5. Update CORS configuration in app.py
echo "5. Updating CORS configuration in app.py..."
if [ -f "backend/app.py" ]; then
  # Check if CORS is already correctly configured
  if grep -q "CORS(app, resources={r\"/api/\*\": {\"origins\": \"\*\"}" backend/app.py; then
    echo "✅ CORS already properly configured"
  else
    # Add or replace CORS configuration
    if grep -q "CORS(app" backend/app.py; then
      # Replace existing CORS config
      sed -i.bak 's/CORS(app.*)/CORS(app, \
     resources={r"\/api\/*": {"origins": "*"}}, \
     supports_credentials=True,\
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],\
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"])/' backend/app.py
    else
      # Add CORS if not present
      sed -i.bak '/from flask import/a \
from flask_cors import CORS\
\
# Improved CORS setup\
CORS(app, \
     resources={r"/api/*": {"origins": "*"}}, \
     supports_credentials=True,\
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],\
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"])' backend/app.py
    fi
    echo "✅ Updated CORS configuration"
  fi
  
  # Add after_request handler for CORS headers if not present
  if ! grep -q "def after_request" backend/app.py; then
    sed -i.bak '/CORS(app/a \
\
# Add a CORS preflight handler for all routes\
@app.after_request\
def after_request(response):\
    response.headers.add("Access-Control-Allow-Origin", "*")\
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")\
    response.headers.add("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")\
    return response' backend/app.py
    echo "✅ Added CORS after_request handler"
  else
    echo "✅ CORS after_request handler already exists"
  fi
else
  echo "❌ backend/app.py not found"
fi

# 6. Update or add imports in HomePage.js
echo "6. Updating HomePage.js imports..."
if [ -f "frontend/src/pages/HomePage.js" ]; then
  # Check if ConnectionTester is already imported
  if ! grep -q "import ConnectionTester" frontend/src/pages/HomePage.js; then
    # Add ConnectionTester import
    sed -i.bak '/import axios/a import ConnectionTester from "../components/ConnectionTester";' frontend/src/pages/HomePage.js
    echo "✅ Added ConnectionTester import to HomePage.js"
  else
    echo "✅ ConnectionTester already imported in HomePage.js"
  fi
  
  # Check if ConnectionTester component is used
  if ! grep -q "<ConnectionTester />" frontend/src/pages/HomePage.js; then
    # Add ConnectionTester component
    sed -i.bak '/<div className="max-w-4xl mx-auto">/a \\n      {/* Connection Tester Component */}\n      <ConnectionTester />' frontend/src/pages/HomePage.js
    echo "✅ Added ConnectionTester component to HomePage.js"
  else
    echo "✅ ConnectionTester component already used in HomePage.js"
  fi
else
  echo "❌ frontend/src/pages/HomePage.js not found"
fi

# 7. Fix or update backend app.py main block
echo "7. Ensuring app.py has correct main block..."
if [ -f "backend/app.py" ]; then
  # Replace existing main block or add it if missing
  if grep -q "if __name__ == '__main__':" backend/app.py; then
    # Replace existing main block
    sed -i.bak '/if __name__ == .main.:/,/app.run/ c\
if __name__ == "__main__":\
    import argparse\
    \
    # Add command-line arguments for customization\
    parser = argparse.ArgumentParser(description="Run the TypeSpark backend server")\
    parser.add_argument("--port", type=int, default=5002, help="Port to run the server on")\
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")\
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")\
    \
    args = parser.parse_args()\
    \
    # Ensure uploads directory exists\
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)\
    \
    print(f"Starting TypeSpark backend on port {args.port}")\
    app.run(debug=args.debug, host=args.host, port=args.port)' backend/app.py
  else
    # Add main block if missing
    echo '
if __name__ == "__main__":
    import argparse
    
    # Add command-line arguments for customization
    parser = argparse.ArgumentParser(description="Run the TypeSpark backend server")
    parser.add_argument("--port", type=int, default=5002, help="Port to run the server on")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to run the server on")
    
    args = parser.parse_args()
    
    # Ensure uploads directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    print(f"Starting TypeSpark backend on port {args.port}")
    app.run(debug=args.debug, host=args.host, port=args.port)' >> backend/app.py
  fi
  echo "✅ Updated main block in app.py"
else
  echo "❌ backend/app.py not found"
fi

# 8. Create uploads directory if it doesn't exist
echo "8. Ensuring uploads directory exists..."
if [ ! -d "backend/uploads" ]; then
  mkdir -p backend/uploads
  echo "✅ Created backend/uploads directory"
else
  echo "✅ backend/uploads directory already exists"
fi

# 9. Create a main run.sh script if it doesn't exist
echo "9. Creating/updating main run.sh script..."
if [ -f "run.sh" ]; then
  # Update existing run.sh script
  sed -i.bak 's/http:\/\/localhost:5001/http:\/\/localhost:5002/g' run.sh
  echo "✅ Updated port references in run.sh"
else
  # Create new run.sh script
  cat > run.sh << 'EOL'
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
EOL
  chmod +x run.sh
  echo "✅ Created main run.sh script"
fi

echo
echo "✅ TypeSpark connection fix script completed!"
echo
echo "Next steps:"
echo "1. Restart both frontend and backend:"
echo "   ./run.sh"
echo "2. Or start them separately:"
echo "   cd backend && python app.py --port=5002"
echo "   cd frontend && npm start"
echo
echo "If issues persist, check the console logs for errors."