import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configure API URL - consistently use port 5002
const API_URL = 'http://localhost:5002/api';

// Import a debugger to help with connection issues
const testBackendConnection = async () => {
  try {
    console.log("Testing backend connection to:", API_URL);
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log("Backend connection successful:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Backend connection failed:", error.message);
    
    // Try alternative port
    try {
      const altResponse = await axios.get('http://localhost:5001/api/health', { timeout: 3000 });
      console.log("Connected to port 5001 instead:", altResponse.data);
      return { 
        success: false, 
        error: "Connected to port 5001 instead of 5002. The backend is running on the wrong port.",
        altData: altResponse.data 
      };
    } catch (altError) {
      return { 
        success: false, 
        error: error.message,
        details: "Backend server may not be running or may be on a different port." 
      };
    }
  }
};

// Debug utility to fix common issues
const fixCommonIssues = () => {
  console.log("=== TypeSpark Connection Troubleshooting ===");
  console.log("1. Checking backend connectivity...");
  testBackendConnection().then(result => {
    if (result.success) {
      console.log("✅ Backend connection working on port 5002");
    } else {
      console.log("❌ Backend connection failed:", result.error);
      console.log("Troubleshooting tips:");
      console.log("- Make sure backend is running: cd backend && python app.py --port=5002");
      console.log("- Check browser console for CORS errors");
      console.log("- Run the fix script: ./fix_typespark.sh");
      
      if (result.altData) {
        console.log("⚠️ Found backend on port 5001 instead of 5002");
        console.log("Please restart backend with: python app.py --port=5002");
      }
    }
  });
};

// Add this to window for easy access from browser console
window.debugTypeSpark = { testBackendConnection, fixCommonIssues };

function DebugInfo() {
  const [backendInfo, setBackendInfo] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch(`${API_URL}/health`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
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
            setBackendInfo({
              ...altData, 
              note: "Connected via port 5001 instead of 5002. The backend is running on the wrong port."
            });
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
        <strong>API URL used:</strong> {API_URL}
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
          {backendInfo.note && (
            <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-500 text-yellow-700 dark:text-yellow-200 rounded">
              <strong>Note:</strong> {backendInfo.note}
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4">
        <p><strong>Troubleshooting Instructions:</strong></p>
        <ol className="list-decimal pl-6">
          <li>If you see "Backend Connection Error", make sure the backend is running on port 5002</li>
          <li>Run <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">python app.py --port=5002</code> in the backend directory</li>
          <li>If needed, run the fix script: <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">./fix_typespark.sh</code></li>
          <li>Check the console (F12) for more detailed errors</li>
        </ol>
      </div>
      
      <div className="mt-4">
        <button
          onClick={() => fixCommonIssues()}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Run Automatic Troubleshooter
        </button>
      </div>
    </div>
  );
}

export default DebugInfo;