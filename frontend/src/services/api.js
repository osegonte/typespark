// Optimized api.js with better error handling and timeout configuration
import axios from 'axios';

// Configure the API URL based on current environment
// In production this might be different
const API_URL = 'http://localhost:5002/api';

// Create an axios instance with default configuration
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
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
      return Promise.reject(new Error('Server is unreachable. Please try again later.'));
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
  // File upload with progress tracking
  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axiosInstance.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Create a quick start session
  createQuickStart: async () => {
    try {
      const response = await axiosInstance.get('/quickstart');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get session details
  getSession: async (sessionId) => {
    try {
      const response = await axiosInstance.get(`/session/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get next item
  getNextItem: async (sessionId) => {
    try {
      const response = await axiosInstance.get(`/session/${sessionId}/next`);
      return response.data;
    } catch (error) {
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