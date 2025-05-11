import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

function HomePage({ setSessionData }) {
  const [file, setFile] = useState(null);
  const [customText, setCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSessionData(response.data);
      navigate('/practice');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomTextSubmit = async () => {
    if (!customText.trim()) {
      setError('Please enter some text for practice');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create a text file from the custom text
      const blob = new Blob([customText], { type: 'text/plain' });
      const textFile = new File([blob], 'custom-text.txt');
      
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('file', textFile);
      
      // Send the request
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSessionData(response.data);
      navigate('/practice');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during upload');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">TypeSpark Study App</h1>
        <p className="text-light-text-secondary dark:text-text-secondary text-lg">
          Build your typing speed and accuracy while learning valuable content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Panel - Upload Learning Material */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Upload className="mr-2" size={20} />
            Upload Learning Material
          </h2>
          <p className="text-light-text-secondary dark:text-text-secondary mb-6">
            Upload a text or PDF file to practice with
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
              {file && <p className="mt-3 text-accent-blue">{file.name}</p>}
            </label>
          </div>

          <button 
            className="btn btn-primary w-full mt-4"
            onClick={handleUpload}
            disabled={isLoading || !file}
          >
            {isLoading ? (
              <>
                <RefreshCw className="animate-spin mr-2" size={16} />
                Processing...
              </>
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
            onChange={(e) => setCustomText(e.target.value)}
          ></textarea>

          <button 
            className="btn btn-secondary w-full mt-4"
            onClick={handleCustomTextSubmit}
            disabled={isLoading || !customText.trim()}
          >
            Start Typing Practice
          </button>
        </div>
      </div>

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

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-500 text-red-700 dark:text-red-200 rounded">
          {error}
        </div>
      )}
    </div>
  );
}

export default HomePage;