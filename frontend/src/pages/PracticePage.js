import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, Home, AlertCircle } from 'lucide-react';
import statsStorage from '../services/statsStorage';
import DebugInfo from '../DebugInfo';
import axios from 'axios';

// Ensure consistent API URL
const API_URL = 'http://localhost:5002/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

function PracticePage({ sessionData }) {
  const navigate = useNavigate();
  const [currentItem, setCurrentItem] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [results, setResults] = useState(null);
  const [phase, setPhase] = useState(1); // 1: In progress, 2: Result shown
  const [stats, setStats] = useState({ wpm: 0, accuracy: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(null);
  const sessionProcessed = useRef(false);
  const isUnmounted = useRef(false);
  const isLoadingRef = useRef(true);

  // Toggle debug panel with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+D to toggle debug panel
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isUnmounted.current = true;
      clearInterval(timerInterval.current);
    };
  }, []);

  // Timer functions wrapped in useCallback
  const startTimer = useCallback(() => {
    setIsActive(true);
    startTime.current = Date.now();
    timerInterval.current = setInterval(() => {
      if (!isUnmounted.current) {
        setTimer(Math.floor((Date.now() - startTime.current) / 1000));
      }
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimer(0);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  }, []);

  // Log session data for debugging
  useEffect(() => {
    console.log("Session Data:", sessionData);
  }, [sessionData]);

  // Load next item from the session
  const loadNextItem = useCallback(async () => {
    if (isLoadingRef.current || !sessionData || !sessionData.session_id) {
      return;
    }
    
    isLoadingRef.current = true;
    if (!isUnmounted.current) {
      setLoading(true);
      setError(null);
    }
    
    try {
      console.log("Loading next item for session:", sessionData.session_id);
      
      // Use axios instead of fetch for better error handling
      const response = await api.get(`/session/${sessionData.session_id}/next`);
      console.log("Next item response:", response.data);
      
      if (!isUnmounted.current) {
        setCurrentItem(response.data.item);
        setProgress(response.data.progress);
        setUserInput('');
        setResults(null);
        setPhase(1);
        resetTimer();
        startTimer();
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading next item:', error);
      
      // Handle the "no more items" case
      if (error.response && error.response.status === 400) {
        console.log('No more items, going to stats');
          
        // Record session stats
        if (!sessionProcessed.current && stats.wpm > 0) {
          sessionProcessed.current = true;
          statsStorage.recordSession({
            date: new Date().toISOString(),
            duration: timer,
            items: progress.current,
            wpm: stats.wpm,
            accuracy: stats.accuracy
          });
        }
        
        // Navigate to stats after delay
        setTimeout(() => {
          if (!isUnmounted.current) {
            navigate('/stats');
          }
        }, 300);
        
        return;
      }
      
      if (!isUnmounted.current) {
        setLoading(false);
        setError(`Could not load practice item: ${error.message || 'Unknown error'}`);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [sessionData, navigate, stats, timer, progress, resetTimer, startTimer]);

  // Initialize the practice session
  useEffect(() => {
    // Redirect if no session data
    if (!sessionData || !sessionData.session_id) {
      console.log("No session data, redirecting to home");
      navigate('/');
      return;
    }
    
    console.log("Initializing practice with session:", sessionData);
    
    // Reset flags
    isUnmounted.current = false;
    sessionProcessed.current = false;
    
    // Load the first item
    loadNextItem();
    
    // Focus on input field
    setTimeout(() => {
      if (inputRef.current && !isUnmounted.current) {
        inputRef.current.focus();
      }
    }, 300);
    
    // Cleanup when unmounting
    return () => {
      isUnmounted.current = true;
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [sessionData, navigate, loadNextItem]);

  // Handle submission of user's answer
  const handleSubmit = useCallback(async () => {
    if (phase !== 1 || !isActive || !currentItem) return;
    
    setIsActive(false);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    try {
      console.log("Submitting answer for session:", sessionData.session_id);
      
      // Use axios instead of fetch
      const response = await api.post(`/session/${sessionData.session_id}/submit`, {
        item_id: currentItem.id,
        answer: userInput,
        time_taken: timer
      });
      
      console.log("Submit response:", response.data);
      
      if (!isUnmounted.current) {
        setResults(response.data.result);
        setPhase(2);
        
        // Calculate stats
        const result = response.data.result;
        const wpm = Math.round(result.wpm);
        const accuracy = Math.round(result.accuracy * 100);
        
        setStats({ wpm, accuracy });
        
        // Record session if this is the last item
        if (response.data.progress.current >= response.data.progress.total) {
          if (!sessionProcessed.current) {
            sessionProcessed.current = true;
            statsStorage.recordSession({
              date: new Date().toISOString(),
              duration: timer,
              items: response.data.progress.current,
              wpm: wpm,
              accuracy: accuracy
            });
          }
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      
      if (!isUnmounted.current) {
        setError('Could not submit your answer: ' + (error.message || 'Unknown error'));
        setIsActive(true); // Re-enable typing
        startTimer(); // Restart timer
      }
    }
  }, [currentItem, isActive, phase, sessionData, timer, userInput, startTimer]);

  // Format time display (mm:ss)
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Render character-by-character feedback
  const renderFeedback = () => {
    if (!currentItem || !currentItem.content) return null;

    const content = currentItem.content;
    
    return (
      <div className="mt-4 h-8">
        {content && userInput && (
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {content.split('').slice(0, 25).map((char, index) => {
              let bgColor = "bg-gray-200 dark:bg-gray-800";
              let textColor = "text-gray-600 dark:text-gray-400";

              if (index < userInput.length) {
                if (userInput[index] === char) {
                  bgColor = "bg-green-100 dark:bg-green-900/30";
                  textColor = "text-green-600 dark:text-green-400";
                } else {
                  bgColor = "bg-red-100 dark:bg-red-900/30";
                  textColor = "text-red-600 dark:text-red-400";
                }
              }

              return (
                <div 
                  key={index} 
                  className={`${bgColor} ${textColor} w-6 h-6 flex items-center justify-center rounded`}
                >
                  {char === ' ' ? '␣' : char}
                </div>
              );
            })}
            {content.length > 25 && (
              <div className="text-gray-500 ml-2 flex items-center">
                ...
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (loading && !currentItem) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin mb-4">
          <Clock size={40} className="mx-auto text-accent-blue" />
        </div>
        <p>Loading practice session...</p>
        
        {/* Debug information */}
        <button 
          className="mt-4 px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
          onClick={() => setShowDebug(prev => !prev)}
        >
          Show Debug Info
        </button>
        
        {showDebug && <DebugInfo />}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4 flex flex-col items-center">
          <AlertCircle size={40} className="mb-2" />
          <p className="text-xl font-bold">Error</p>
          <p>{error}</p>
        </div>
        <button 
          className="btn btn-primary mt-4"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
        
        {/* Debug information */}
        <button 
          className="ml-4 mt-4 px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
          onClick={() => setShowDebug(prev => !prev)}
        >
          Show Debug Info
        </button>
        
        {showDebug && <DebugInfo />}
      </div>
    );
  }

  // No session data
  if (!sessionData || !currentItem) {
    return (
      <div className="text-center py-12">
        <p>No practice session found. Start a new practice session from the home page.</p>
        <p className="text-sm text-gray-500 mt-2">Session ID: {sessionData?.session_id || 'None'}</p>
        <button 
          className="btn btn-primary mt-4"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
        
        {/* Debug information */}
        <button 
          className="ml-4 px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
          onClick={() => setShowDebug(prev => !prev)}
        >
          Show Debug Info
        </button>
        
        {showDebug && <DebugInfo />}
      </div>
    );
  }

  // Main render - practice session
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Typing Practice</h1>
        <div className="flex items-center space-x-2 text-light-text-secondary dark:text-text-secondary">
          <Clock size={18} />
          <span>{formatTime(timer)}</span>
        </div>
      </div>

      <div className="card mb-8">
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-light-text-secondary dark:text-text-secondary">Phase {phase} of 2</span>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-800 rounded-full mt-1">
              <div 
                className="h-2 bg-accent-blue rounded-full" 
                style={{ width: `${(phase / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center text-light-text-secondary dark:text-text-secondary">
            <span>Progress: {progress.current}/{progress.total}</span>
          </div>
        </div>

        {/* Context and Prompt */}
        <div className="mb-6">
          <div className="text-light-text-secondary dark:text-text-secondary text-sm mb-2">
            {currentItem.context} • {currentItem.type}
          </div>
          <div className="text-lg font-semibold">
            {currentItem.prompt}
          </div>
        </div>

        {/* Reference Text */}
        <div className="bg-white dark:bg-darker-blue border border-gray-300 dark:border-gray-800 rounded-md p-4 mb-6 font-mono">
          {currentItem.content}
        </div>

        {/* User Input - Phase 1 */}
        {phase === 1 ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-light-text-secondary dark:text-text-secondary mb-2">
                Your Answer
              </label>
              <textarea
                ref={inputRef}
                className="w-full h-32 bg-white dark:bg-darker-blue border border-gray-300 dark:border-gray-700 rounded-md p-4 font-mono focus:outline-none focus:ring-2 focus:ring-accent-blue"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={!isActive}
                onKeyDown={(e) => {
                  // Submit on Ctrl+Enter or Cmd+Enter
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    handleSubmit();
                  }
                }}
              ></textarea>
            </div>

            {renderFeedback()}

            <div className="flex justify-end mt-8">
              <button 
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!userInput.trim() || !isActive}
              >
                Submit
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Results - Phase 2 */}
            <div className="bg-gray-100 dark:bg-gray-900/30 rounded-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Results</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-accent-blue mb-2">
                    {stats.wpm}
                  </div>
                  <div className="text-light-text-secondary dark:text-text-secondary">WPM</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-accent-secondary mb-2">
                    {stats.accuracy}%
                  </div>
                  <div className="text-light-text-secondary dark:text-text-secondary">Accuracy</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-yellow-500 mb-2">
                    {timer}s
                  </div>
                  <div className="text-light-text-secondary dark:text-text-secondary">Time Taken</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button 
                className="btn bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-light-text dark:text-text-secondary"
                onClick={() => navigate('/')}
              >
                <Home size={18} className="mr-2" />
                Back to Home
              </button>
              
              <button 
                className="btn btn-primary"
                onClick={loadNextItem}
              >
                Next Item
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* Debug button and information */}
      <div className="text-center">
        <button 
          className="px-3 py-1 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-sm"
          onClick={() => setShowDebug(prev => !prev)}
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>
      </div>
      
      {showDebug && <DebugInfo />}
    </div>
  );
}

export default PracticePage;