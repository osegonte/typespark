// Upload debugging helper
// Replace frontend/src/services/upload-debug.js

import axios from 'axios';

// Configure API base URL 
const API_URL = 'http://localhost:5002/api'; // Make sure this matches the port your backend is running on

// Special axios instance just for uploads with enhanced debugging
const uploadClient = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 second timeout for large files
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

// Add request interceptor for debugging
uploadClient.interceptors.request.use(request => {
  console.log('Upload Request:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    // Don't log the entire FormData content as it can be large
    data: request.data instanceof FormData ? 'FormData object' : request.data
  });
  return request;
});

// Add response interceptor for debugging
uploadClient.interceptors.response.use(
  response => {
    console.log('Upload Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('Upload Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// Enhanced file upload function with progress tracking
const uploadFile = async (file, onProgress) => {
  console.log('Starting upload for file:', {
    name: file.name,
    type: file.type,
    size: file.size
  });
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await uploadClient.post('/upload', formData, {
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
    console.error('Upload failed with error:', error.message);
    
    // Provide more detailed error information
    let errorMessage = 'Upload failed';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'The upload request timed out. Try with a smaller file or check your connection.';
    } else if (error.response) {
      // Server responded with an error
      errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
    } else if (error.request) {
      // Request was made but no response was received
      errorMessage = 'No response from server. Check if the backend server is running.';
    }
    
    throw new Error(errorMessage);
  }
};

// Check backend connectivity
const checkBackendConnection = async () => {
  try {
    // Try a simple GET request to check if backend is reachable
    await axios.get(`${API_URL}/health`, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Backend connection check failed:', error.message);
    return false;
  }
};

export { uploadFile, checkBackendConnection };