import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import axios from 'axios';

function EnhancedConnectionTester() {
  const [status, setStatus] = useState('unknown');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [ipAddress, setIpAddress] = useState('');
  const [customEndpointUrl, setCustomEndpointUrl] = useState('http://localhost:5002/api/health');
  const [testResults, setTestResults] = useState([]);

  // Get IP address of the host machine
  useEffect(() => {
    try {
      const hostName = window.location.hostname;
      setIpAddress(hostName);
    } catch (error) {
      console.error("Could not get hostname:", error);
      setIpAddress('localhost');
    }
  }, []);

  // Test connection to backend with multiple approaches
  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults([]);
    
    const endpoints = [
      { label: 'localhost:5002', url: 'http://localhost:5002/api/health' },
      { label: 'localhost:5001', url: 'http://localhost:5001/api/health' },
      { label: '127.0.0.1:5002', url: 'http://127.0.0.1:5002/api/health' },
      { label: 'IP:5002', url: `http://${ipAddress}:5002/api/health` }
    ];
    
    const results = [];
    let anySuccess = false;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, { 
          timeout: 3000,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        results.push({
          endpoint: endpoint.label,
          url: endpoint.url,
          success: true,
          data: response.data
        });
        
        // If this is the first success, set the status
        if (!anySuccess) {
          setStatus('connected');
          setDetails(response.data);
          anySuccess = true;
        }
      } catch (error) {
        results.push({
          endpoint: endpoint.label,
          url: endpoint.url,
          success: false,
          error: error.message
        });
      }
    }
    
    if (!anySuccess) {
      setStatus('disconnected');
      setError('Could not connect to backend on any endpoint');
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  // Test custom endpoint
  const testCustomEndpoint = async () => {
    try {
      const response = await axios.get(customEndpointUrl, { 
        timeout: 3000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      setTestResults([
        ...testResults,
        {
          endpoint: 'Custom',
          url: customEndpointUrl,
          success: true,
          data: response.data
        }
      ]);
      
      setStatus('connected');
      setDetails(response.data);
    } catch (error) {
      setTestResults([
        ...testResults,
        {
          endpoint: 'Custom',
          url: customEndpointUrl,
          success: false,
          error: error.message
        }
      ]);
      
      setError(error.message);
    }
  };

  // Test connection on component mount
  useEffect(() => {
    testConnection();
  }, [ipAddress]);

  return (
    <div className="mb-8 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Enhanced Backend Connection Tester</h3>
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
          Test All Endpoints
        </button>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="mr-2">
          {status === 'connected' && <CheckCircle size={20} className="text-green-500" />}
          {status === 'disconnected' && <XCircle size={20} className="text-red-500" />}
          {status === 'unknown' && <RefreshCw size={20} className="animate-spin text-gray-500" />}
        </div>
        
        <div>
          {status === 'connected' && <span className="text-green-600 dark:text-green-400">Connected to backend</span>}
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
      
      <div className="mt-4 bg-gray-100 dark:bg-gray-900 rounded p-3">
        <h4 className="font-semibold mb-2">Connection Test Results</h4>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {testResults.map((result, index) => (
            <div 
              key={index} 
              className={`p-2 rounded text-sm ${result.success 
                ? 'bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800'}`}
            >
              <div className="flex items-center mb-1">
                {result.success 
                  ? <CheckCircle size={16} className="mr-1 text-green-500" /> 
                  : <XCircle size={16} className="mr-1 text-red-500" />}
                <span className="font-semibold">{result.endpoint}</span>
              </div>
              <div className="text-xs">URL: {result.url}</div>
              {result.success ? (
                <div className="mt-1 text-xs">
                  <button 
                    onClick={() => setShowDetails(!showDetails)} 
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    {showDetails ? 'Hide Response' : 'View Response'}
                  </button>
                  {showDetails && (
                    <pre className="mt-1 p-1 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Error: {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4">
        <h4 className="font-semibold mb-2">Test Custom Endpoint</h4>
        <div className="flex space-x-2">
          <input
            type="text"
            value={customEndpointUrl}
            onChange={(e) => setCustomEndpointUrl(e.target.value)}
            className="flex-1 bg-white dark:bg-darker-blue border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="Enter endpoint URL"
          />
          <button
            onClick={testCustomEndpoint}
            className="bg-accent-blue text-white px-3 py-1 rounded-md text-sm"
          >
            Test
          </button>
        </div>
      </div>
      
      {status === 'disconnected' && (
        <div className="mt-4 text-sm">
          <p className="font-semibold">Troubleshooting steps:</p>
          <ol className="list-decimal pl-5 mt-1">
            <li>Verify backend is running with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">python app.py --port=5002</code></li>
            <li>Update your application to use a working endpoint URL</li>
            <li>Check for any error messages in the backend console</li>
            <li>Make sure CORS is properly configured in the backend</li>
            <li>Try using the IP address instead of localhost: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">http://{ipAddress}:5002/api</code></li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default EnhancedConnectionTester;