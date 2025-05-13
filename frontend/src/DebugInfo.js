import React, { useState, useEffect } from 'react';

function DebugInfo() {
  const [backendInfo, setBackendInfo] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/health');
        if (!response.ok) {
          throw new Error(`Status: ${response.status}`);
        }
        const data = await response.json();
        setBackendInfo(data);
      } catch (err) {
        console.error("Backend connection error:", err);
        setError(err.message);
        
        // Try alternative port
        try {
          const altResponse = await fetch('http://localhost:5001/api/health');
          if (altResponse.ok) {
            const altData = await altResponse.json();
            setBackendInfo({...altData, note: "Connected via port 5001 instead of 5002"});
          }
        } catch (altErr) {
          console.error("Alt port failed too:", altErr);
        }
      }
    };
    
    checkBackend();
  }, []);

  return (
    <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Debug Information</h3>
      
      <div className="mb-2">
        <strong>Frontend URL:</strong> {window.location.href}
      </div>
      
      <div className="mb-2">
        <strong>API URL used:</strong> {window.API_URL || 'Not defined - using default'}
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-200 rounded mb-2">
          <strong>Backend Connection Error:</strong> {error}
        </div>
      )}
      
      {backendInfo && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-200 rounded">
          <strong>Backend Connected:</strong>
          <pre className="mt-2 text-xs overflow-auto max-h-40">
            {JSON.stringify(backendInfo, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-4">
        <p><strong>Instructions:</strong></p>
        <ol className="list-decimal pl-6">
          <li>If you see "Backend Connection Error", make sure the backend is running</li>
          <li>If API URL doesn't match your backend port, update it in frontend/src/services/api.js</li>
          <li>Check the console (F12) for more detailed errors</li>
        </ol>
      </div>
    </div>
  );
}

export default DebugInfo;