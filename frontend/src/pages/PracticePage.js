import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, ArrowRight, BarChart2, Home } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

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
  const inputRef = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(null);

  // Redirect if no session data
  useEffect(() => {
    if (!sessionData) {
      navigate('/');
      return;
    }

    // Load the first item
    loadNextItem();

    // Focus on input field
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return () => {
      // Cleanup timer
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [sessionData, navigate]);

  const loadNextItem = async () => {
    try {
      const response = await axios.get(`${API_URL}/session/${sessionData.session_id}/next`);
      setCurrentItem(response.data.item);
      setProgress(response.data.progress);
      setUserInput('');
      setResults(null);
      setPhase(1);
      resetTimer();
      startTimer();
    } catch (error) {
      console.error('Error loading next item:', error);
      // If no more items, show completion message
      if (error.response?.status === 400) {
        navigate('/stats');
      }
    }
  };

  const startTimer = () => {
    setIsActive(true);
    startTime.current = Date.now();
    timerInterval.current = setInterval(() => {
      setTimer(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimer(0);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }
  };

  const handleSubmit = async () => {
    // Stop timer
    setIsActive(false);
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
    }

    try {
      const response = await axios.post(`${API_URL}/session/${sessionData.session_id}/submit`, {
        item_id: currentItem.id,
        answer: userInput,
        time_taken: timer
      });

      setResults(response.data.result);
      setPhase(2);

      // Calculate stats
      const result = response.data.result;
      setStats({
        wpm: Math.round(result.wpm),
        accuracy: Math.round(result.accuracy * 100)
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const renderFeedback = () => {
    if (!currentItem) return null;

    const content = currentItem.content;
    
    return (
      <div className="mt-4 h-8">
        {content && userInput && (
          <div className="flex space-x-1 overflow-x-auto pb-2">
            {content.split('').map((char, index) => {
              let bgColor = "bg-gray-800";
              let textColor = "text-gray-400";

              if (index < userInput.length) {
                if (userInput[index] === char) {
                  bgColor = "bg-green-900/30";
                  textColor = "text-green-400";
                } else {
                  bgColor = "bg-red-900/30";
                  textColor = "text-red-400";
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
          </div>
        )}
      </div>
    );
  };

  if (!sessionData || !currentItem) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin mb-4">
          <Clock size={40} className="mx-auto text-accent-blue" />
        </div>
        <p>Loading practice session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Typing Practice</h1>
        <div className="flex items-center space-x-2 text-text-secondary">
          <Clock size={18} />
          <span>{formatTime(timer)}</span>
        </div>
      </div>

      <div className="card mb-8">
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-text-secondary">Phase {phase} of 2</span>
            <div className="w-32 h-2 bg-gray-800 rounded-full mt-1">
              <div 
                className="h-2 bg-accent-blue rounded-full" 
                style={{ width: `${(phase / 2) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="flex items-center text-text-secondary">
            <span>Progress: {progress.current}/{progress.total}</span>
          </div>
        </div>

        {/* Context and Prompt */}
        <div className="mb-6">
          <div className="text-text-secondary text-sm mb-2">
            {currentItem.context} • {currentItem.type}
          </div>
          <div className="text-lg font-semibold">
            {currentItem.prompt}
          </div>
        </div>

        {/* Reference Text */}
        <div className="bg-darker-blue border border-gray-800 rounded-md p-4 mb-6 font-mono">
          {currentItem.content}
        </div>

        {/* User Input */}
        {phase === 1 ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Your Answer
              </label>
              <textarea
                ref={inputRef}
                className="w-full h-32 bg-darker-blue border border-gray-700 rounded-md p-4 font-mono focus:outline-none focus:ring-2 focus:ring-accent-blue"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={!isActive}
              ></textarea>
            </div>

            {renderFeedback()}

            <div className="flex justify-end mt-8">
              <button 
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!userInput.trim()}
              >
                Submit
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="bg-gray-900/30 rounded-md p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">Results</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-accent-blue mb-2">
                    {stats.wpm}
                  </div>
                  <div className="text-text-secondary">WPM</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-accent-secondary mb-2">
                    {stats.accuracy}%
                  </div>
                  <div className="text-text-secondary">Accuracy</div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-yellow-500 mb-2">
                    {timer}s
                  </div>
                  <div className="text-text-secondary">Time Taken</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button 
                className="btn bg-gray-800 text-text-secondary hover:bg-gray-700"
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
    </div>
  );
}

export default PracticePage;