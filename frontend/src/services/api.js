// Optimized api.js with better error handling and timeout configuration
import axios from 'axios';

// Configure the API URL based on current environment
// This must match the port in your backend app.py
const API_URL = 'http://localhost:5002/api';

// Create an axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 second timeout for PDF processing
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for global error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('Network error - server may be down');
      return Promise.reject(new Error('Server is unreachable. Please verify the backend server is running.'));
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

const api = {
  // Check backend connectivity
  checkHealth: async () => {
    try {
      const response = await axiosInstance.get('/health', { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
  
  // File upload with progress tracking
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log(`Starting upload: ${file.name} (${file.size / 1024} KB)`);
      
      const response = await axiosInstance.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
            onProgress(percentCompleted);
          }
        }
      });
      
      console.log('Upload completed successfully');
      return response.data;
    } catch (error) {
      console.error('Upload failed:', error.message);
      throw error;
    }
  },
  
  // Create a quick start session
  createQuickStart: async () => {
    try {
      const response = await axiosInstance.get('/quickstart');
      return response.data;
    } catch (error) {
      console.error('Quick start failed:', error);
      throw error;
    }
  },
  
  // Get session details
  getSession: async (sessionId) => {
    try {
      const response = await axiosInstance.get(`/session/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Get session failed:', error);
      throw error;
    }
  },
  
  // Get next item
  getNextItem: async (sessionId) => {
    try {
      const response = await axiosInstance.get(`/session/${sessionId}/next`);
      return response.data;
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
      const response = await axiosInstance.post(`/session/${sessionId}/submit`, {
        item_id: itemId,
        answer: answer,
        time_taken: timeTaken
      });
      return response.data;
    } catch (error) {
      console.error('Submit answer failed:', error);
      throw error;
    }
  },
  
  // System diagnostics
  getDiagnostics: async () => {
    try {
      const response = await axiosInstance.get('/diagnostics/system');
      return response.data;
    } catch (error) {
      // Silently fail for diagnostics
      console.error('Unable to retrieve system diagnostics:', error);
      return { error: 'Diagnostics unavailable' };
    }
  },
  
  // Check PDF support
  checkPdfSupport: async () => {
    try {
      const response = await axiosInstance.get('/diagnostics/pdf');
      return response.data;
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
      const response = await axiosInstance.post('/diagnostics/cleanup');
      return response.data;
    } catch (error) {
      console.error('Unable to clean uploads:', error);
      return { error: 'Cleanup failed' };
    }
  }
};

export default api;