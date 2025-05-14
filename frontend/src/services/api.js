// api.js - Updated to try multiple connection methods
import axios from 'axios';

// Try several possible URLs for the backend - we'll figure out which one works
// Order of preference: IP (if available) > localhost > 127.0.0.1
const getApiUrl = () => {
  // Get hostname of current page (will be localhost or IP address)
  const hostName = window.location.hostname;
  
  // Try using IP from window.location first
  if (hostName !== 'localhost' && hostName !== '127.0.0.1') {
    return `http://${hostName}:5002/api`;
  }
  
  // If running on localhost, use that
  return 'http://localhost:5002/api';
};

// Configure the API URL based on current environment
const API_URL = getApiUrl();
console.log('Using API URL:', API_URL);

// Create an axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 second timeout for PDF processing
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Add response interceptor for global error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Log all errors for debugging
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('Network error - server may be down');
      return Promise.reject(new Error('Server is unreachable. Please verify the backend server is running on port 5002.'));
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
      return Promise.reject(new Error('Request timed out. Try a smaller file or the Quick Start option.'));
    }
    
    // Return the more detailed error message when available
    if (error.response && error.response.data && error.response.data.error) {
      return Promise.reject(new Error(error.response.data.error));
    }
    
    return Promise.reject(error);
  }
);

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  config => {
    console.log(`Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Backup function to try multiple endpoints if the primary one fails
const tryMultipleEndpoints = async (path, method = 'GET', data = null, config = {}) => {
  // List of possible base URLs to try
  const baseUrls = [
    `http://${window.location.hostname}:5002/api`, // Current hostname
    'http://localhost:5002/api',                   // localhost
    'http://127.0.0.1:5002/api'                    // IP loopback
  ];
  
  // Try each endpoint until one works
  for (const baseUrl of baseUrls) {
    try {
      const url = `${baseUrl}${path}`;
      console.log(`Trying endpoint: ${url}`);
      
      let response;
      if (method === 'GET') {
        response = await axios.get(url, {
          ...config,
          timeout: 3000 // Short timeout for quick testing
        });
      } else if (method === 'POST') {
        response = await axios.post(url, data, {
          ...config,
          timeout: 3000
        });
      }
      
      console.log(`Success with endpoint: ${baseUrl}`);
      
      // Update the axiosInstance baseURL if we found a working endpoint
      if (baseUrl !== API_URL) {
        console.log(`Updating API_URL from ${API_URL} to ${baseUrl}`);
        axiosInstance.defaults.baseURL = baseUrl;
      }
      
      return response.data;
    } catch (error) {
      console.warn(`Failed with endpoint ${baseUrl}:`, error.message);
      // Continue to try the next endpoint
    }
  }
  
  // If all endpoints failed, throw an error
  throw new Error('Could not connect to any backend endpoint. Please check if the server is running.');
};

const api = {
  // Check backend connectivity - tries multiple endpoints
  checkHealth: async () => {
    try {
      return await tryMultipleEndpoints('/health');
    } catch (error) {
      console.error('Health check failed with all endpoints:', error);
      throw error;
    }
  },
  
  // File upload with progress tracking
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log(`Starting upload: ${file.name} (${file.size / 1024} KB)`);
      
      // Try multiple endpoints for upload
      const baseUrls = [
        `http://${window.location.hostname}:5002/api`,
        'http://localhost:5002/api',
        'http://127.0.0.1:5002/api'
      ];
      
      let uploadError = null;
      
      for (const baseUrl of baseUrls) {
        try {
          const url = `${baseUrl}/upload`;
          console.log(`Trying upload to: ${url}`);
          
          const response = await axios.post(url, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: progressEvent => {
              if (onProgress && progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log(`Upload progress: ${percentCompleted}%`);
                onProgress(percentCompleted);
              }
            },
            timeout: 60000 // 60 second timeout
          });
          
          console.log('Upload completed successfully:', response.data);
          
          // Update axiosInstance baseURL if we found a working endpoint
          if (baseUrl !== API_URL) {
            console.log(`Updating API_URL from ${API_URL} to ${baseUrl}`);
            axiosInstance.defaults.baseURL = baseUrl;
          }
          
          return response.data;
        } catch (error) {
          console.warn(`Upload failed to ${baseUrl}:`, error.message);
          uploadError = error;
          // Continue to try the next endpoint
        }
      }
      
      // If we got here, all endpoints failed
      console.error('Upload failed to all endpoints');
      
      let errorMessage = 'Upload failed to all endpoints';
      
      if (uploadError.code === 'ECONNABORTED') {
        errorMessage = 'Upload timed out. Try a smaller file or check the backend server.';
      } else if (uploadError.response) {
        errorMessage = uploadError.response.data?.error || `Server error: ${uploadError.response.status}`;
      } else if (uploadError.request) {
        errorMessage = 'No response from server. Check if the backend is running on port 5002.';
      } else {
        errorMessage = uploadError.message || 'Unknown upload error';
      }
      
      throw new Error(errorMessage);
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },
  
  // Create a quick start session
  createQuickStart: async () => {
    try {
      return await tryMultipleEndpoints('/quickstart');
    } catch (error) {
      console.error('Quick start failed:', error);
      throw error;
    }
  },
  
  // Get session details
  getSession: async (sessionId) => {
    try {
      return await tryMultipleEndpoints(`/session/${sessionId}`);
    } catch (error) {
      console.error('Get session failed:', error);
      throw error;
    }
  },
  
  // Get next item
  getNextItem: async (sessionId) => {
    try {
      return await tryMultipleEndpoints(`/session/${sessionId}/next`);
    } catch (error) {
      // Special handling for "no more items" error (expected behavior)
      if (error.response && error.response.status === 400) {
        return { error: 'No more items', session_completed: true };
      }
      console.error('Get next item failed:', error);
      throw error;
    }
  },
  
  // Submit answer
  submitAnswer: async (sessionId, itemId, answer, timeTaken) => {
    try {
      return await tryMultipleEndpoints(
        `/session/${sessionId}/submit`, 
        'POST', 
        {
          item_id: itemId,
          answer: answer,
          time_taken: timeTaken
        }
      );
    } catch (error) {
      console.error('Submit answer failed:', error);
      throw error;
    }
  },
  
  // System diagnostics
  getDiagnostics: async () => {
    try {
      return await tryMultipleEndpoints('/diagnostics/system');
    } catch (error) {
      // Silently fail for diagnostics
      console.error('Unable to retrieve system diagnostics:', error);
      return { error: 'Diagnostics unavailable' };
    }
  },
  
  // Check PDF support
  checkPdfSupport: async () => {
    try {
      return await tryMultipleEndpoints('/diagnostics/pdf');
    } catch (error) {
      console.error('PDF support check failed:', error);
      return { 
        pdf_support: false,
        error: 'Unable to check PDF support'
      };
    }
  },
  
  // Clean uploads
  cleanUploads: async () => {
    try {
      return await tryMultipleEndpoints('/diagnostics/cleanup', 'POST');
    } catch (error) {
      console.error('Unable to clean uploads:', error);
      return { error: 'Cleanup failed' };
    }
  }
};

export default api;