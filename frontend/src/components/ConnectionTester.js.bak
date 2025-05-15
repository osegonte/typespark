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
      console.log('Testing connection to backend at:', API_URL);
      const response = await axios.get(`${API_URL}/health`, { 
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
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
        // If alternate port also fails, show the original error
        if (error.response) {
          setError(`Server error: ${error.response.status} - ${error.response.statusText}`);
        } else if (error.request) {
          setError('No response received from server. Make sure the backend is running.');
        } else {
          setError(error.message || 'Could not connect to backend');
        }
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
            <li>Verify backend is running with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">python app.py --port=5002</code></li>
            <li>Ensure backend is using port 5002</li>
            <li>Check for any error messages in the backend console</li>
            <li>Run the fix script: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">./fix_typespark.sh</code></li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default ConnectionTester;