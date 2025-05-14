import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, RefreshCw, AlertCircle, Zap } from 'lucide-react';
import axios from 'axios';
import ConnectionTester from '../components/ConnectionTester';

// Configure API URL - consistently use port 5002
const API_URL = 'http://localhost:5002/api';

// Configure Axios with defaults and timeout
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 60000 // 60 second timeout for long operations
});

function HomePage({ setSessionData }) {
  // State variables
  const [file, setFile] = useState(null);
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingTime, setProcessingTime] = useState(null);
  const [error, setError] = useState('');
  const [backendStatus, setBackendStatus] = useState('unknown'); // 'unknown', 'connected', 'disconnected'
  const navigate = useNavigate();

  // Check backend connectivity on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await axios.get(`${API_URL}/health`, { timeout: 5000 });
        setBackendStatus('connected');
      } catch (error) {
        console.error('Backend connection check failed:', error.message);
        setBackendStatus('disconnected');
      }
    };
    
    checkConnection();
  }, []);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Size check (client-side validation)
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) { // 10MB
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    
    setFile(selectedFile);
    setError(''); // Clear any previous errors
  };

  // Handle file upload with improved error handling
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setError('');
    setProcessingTime(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    // Log request details for debugging
    console.log('Uploading file:', {
      name: file.name,
      type: file.type,
      size: Math.round(file.size / 1024) + ' KB'
    });
    console.log('API URL:', API_URL);

    try {
      const startTime = Date.now();
      
      // Send the upload request with explicit timeout and headers
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
            setUploadProgress(percentCompleted);
          }
        },
        timeout: 60000 // 60 second timeout
      });
      
      const endTime = Date.now();
      setProcessingTime(endTime - startTime);
      
      console.log('Upload response:', response.data);

      if (response.data && response.data.session_id) {
        // Store session data and navigate to practice page
        console.log('Setting session data:', response.data);
        setSessionData(response.data);
        navigate('/practice');
      } else {
        setError('No content could be extracted from the file.');
      }
    } catch (err) {
      console.error('Upload error details:', err);
      
      // More detailed error logging
      if (err.response) {
        console.error('Error response:', { 
          status: err.response.status,
          headers: err.response.headers,
          data: err.response.data
        });
      }
      
      // Provide more user-friendly error messages
      if (err.code === 'ECONNABORTED') {
        setError('The request took too long. Please try a smaller file or use the Quick Start option.');
      } else if (err.response) {
        setError(err.response.data?.error || `Error: ${err.response.status} - ${err.response.statusText}`);
      } else if (err.request) {
        setError(`No response from server at ${API_URL}. Please check if the backend is running.`);
      } else {
        setError(err.message || 'An error occurred during upload');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle custom text submission
  const handleCustomTextSubmit = async () => {
    if (!customText.trim()) {
      setError('Please enter some text for practice');
      return;
    }

    setIsLoading(true);
    setError('');
    setUploadProgress(0);

    try {
      console.log('Processing custom text');
      
      // Limit text length for performance
      const limitedText = customText.length > 20000 
        ? customText.substring(0, 20000) + '\n\n(Text truncated to 20,000 characters for performance)'
        : customText;
      
      // Format text to ensure paragraphs
      const formattedText = limitedText
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2

      console.log('Formatted text length:', formattedText.length);

      // Create a text file from the custom text
      const blob = new Blob([formattedText], { type: 'text/plain' });
      const textFile = new File([blob], 'custom-text.txt');
      
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('file', textFile);
      
      // Send the request
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      
      console.log('Custom text upload response:', response.data);
      
      if (response.data && response.data.session_id) {
        // Store session data and navigate to practice page
        setSessionData(response.data);
        navigate('/practice');
      } else {
        setError('No content could be extracted from the text.');
      }
    } catch (err) {
      console.error('Text upload error:', err);
      if (err.code === 'ECONNABORTED') {
        setError('The request took too long. Please try a smaller text or use the Quick Start option.');
      } else if (err.response) {
        setError(err.response.data?.error || `Error: ${err.response.status}`);
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running on port 5002.');
      } else {
        setError(err.message || 'An error occurred during upload');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // New function for quick start option
  const handleQuickStart = async () => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Starting quick practice session');
      const response = await axios.get(`${API_URL}/quickstart`);
      console.log('Quick start response:', response.data);
      
      if (response.data && response.data.session_id) {
        // Store session data and navigate to practice page
        setSessionData(response.data);
        navigate('/practice');
      } else {
        setError('Could not create quick start session.');
      }
    } catch (err) {
      console.error('Quick start error:', err);
      if (err.response) {
        setError(err.response.data?.error || `Error: ${err.response.status}`);
      } else if (err.request) {
        setError('No response from server. Please check if the backend is running on port 5002.');
      } else {
        setError(err.message || 'An error occurred during quick start');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Connection Tester Component - Added for debugging */}
      <ConnectionTester />

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">TypeSpark Study App</h1>
        <p className="text-light-text-secondary dark:text-text-secondary text-lg">
          Build your typing speed and accuracy while learning valuable content
        </p>
      </div>

      {/* Backend Status Indicator */}
      {backendStatus === 'disconnected' && (
        <div className="mb-8 p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-200 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend server not connected</p>
            <p className="text-sm">The backend server appears to be offline. Make sure it's running on port 5002.</p>
          </div>
        </div>
      )}

      {/* Quick Start Button */}
      <div className="mb-8 card p-6 text-center">
        <h2 className="text-xl font-semibold mb-4 flex items-center justify-center">
          <Zap className="mr-2 text-yellow-500" size={24} />
          Quick Start
        </h2>
        <p className="mb-4 text-light-text-secondary dark:text-text-secondary">
          Start practicing immediately with pre-loaded sample text
        </p>
        <button 
          className="btn bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md"
          onClick={handleQuickStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <RefreshCw className="animate-spin mr-2" size={16} />
              <span>Loading...</span>
            </div>
          ) : 'Start Quick Practice'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Panel - Upload Learning Material */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" size={20} />
            Upload Learning Material
          </h2>
          <p className="text-light-text-secondary dark:text-text-secondary mb-2">
            Upload a text or PDF file to practice with
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mb-4">
            Note: Large PDFs may take longer to process. Limit to 10MB or 10 pages for best performance.
          </p>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload size={40} className="text-gray-500 mb-3" />
              <p>Drag and drop your file here or click to browse</p>
              {file && <p className="mt-3 text-accent-blue">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
            </label>
          </div>

          <button 
            className="btn btn-primary w-full mt-4"
            onClick={handleUpload}
            disabled={isLoading || !file}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin mr-2" size={16} />
                <span>Processing... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
              </div>
            ) : 'Start Typing Practice'}
          </button>
        </div>

        {/* Right Panel - Custom Text */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2" size={20} />
            Custom Text
          </h2>
          <p className="text-light-text-secondary dark:text-text-secondary mb-6">
            Paste or type the text you want to practice
          </p>

          <textarea
            className="w-full h-48 bg-white dark:bg-darker-blue border border-gray-300 dark:border-gray-700 rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="Paste or type your practice text here..."
            value={customText}
            onChange={(e) => {
              setCustomText(e.target.value);
              setError(''); // Clear any previous errors
            }}
          ></textarea>

          <button 
            className="btn btn-secondary w-full mt-4"
            onClick={handleCustomTextSubmit}
            disabled={isLoading || !customText.trim()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin mr-2" size={16} />
                <span>Processing... {uploadProgress > 0 ? `${uploadProgress}%` : ''}</span>
              </div>
            ) : 'Start Typing Practice'}
          </button>
        </div>
      </div>

      {/* Processing Time Information */}
      {processingTime && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 text-green-700 dark:text-green-200 rounded">
          <p className="text-sm">File processed in {(processingTime / 1000).toFixed(1)} seconds</p>
        </div>
      )}

      {/* Why TypeSpark Section */}
      <div className="mt-16 card">
        <h2 className="text-xl font-semibold mb-6">Why TypeSpark?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4">
            <h3 className="font-semibold mb-2">Learn While Typing</h3>
            <p className="text-light-text-secondary dark:text-text-secondary">
              Practice with study materials to improve retention
            </p>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-light-text-secondary dark:text-text-secondary">
              View detailed stats on typing speed and accuracy
            </p>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold mb-2">Build Consistency</h3>
            <p className="text-light-text-secondary dark:text-text-secondary">
              Track daily streaks and practice minutes
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-200 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-500 text-blue-700 dark:text-blue-200 rounded flex items-start">
          <RefreshCw className="animate-spin mr-2 flex-shrink-0 mt-0.5" size={20} />
          <span>Processing your content... This may take up to 30 seconds for large files.</span>
        </div>
      )}
    </div>
  );
}

export default HomePage;