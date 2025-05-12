import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Clock, TrendingUp, Check, FileText } from 'lucide-react';
import statsStorage from '../services/statsStorage';
import { useTheme } from '../contexts/ThemeContext';

function StatsPage() {
  // We're not using isDarkMode directly, but it's okay to leave it here
  // since we may need it in the future for theme-specific adjustments
  const { isDarkMode } = useTheme();
  
  const [stats, setStats] = useState({
    averageWpm: 0,
    accuracy: 0,
    practiceTime: 0,
    currentStreak: 0,
    totalItems: 0
  });
  
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    // Load stats from storage
    const savedStats = statsStorage.getStats();
    setStats(savedStats);
    
    // Load recent sessions
    const savedSessions = statsStorage.getSessions();
    setRecentSessions(savedSessions);
  }, []);

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Performance Statistics</h1>
        <p className="text-light-text-secondary dark:text-text-secondary text-lg">
          Track your typing progress over time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg flex flex-col items-center justify-center">
          <div className="flex justify-center mb-2 text-accent-blue">
            <BarChart2 size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.averageWpm.toFixed(1)}</p>
          <p className="text-light-text-secondary dark:text-text-secondary">Average WPM</p>
        </div>

        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg flex flex-col items-center justify-center">
          <div className="flex justify-center mb-2 text-accent-secondary">
            <Check size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.accuracy.toFixed(1)}%</p>
          <p className="text-light-text-secondary dark:text-text-secondary">Accuracy</p>
        </div>

        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg flex flex-col items-center justify-center">
          <div className="flex justify-center mb-2 text-yellow-500">
            <Clock size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.practiceTime.toFixed(0)}</p>
          <p className="text-light-text-secondary dark:text-text-secondary">Practice Time (mins)</p>
        </div>

        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg flex flex-col items-center justify-center">
          <div className="flex justify-center mb-2 text-green-500">
            <TrendingUp size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.currentStreak}</p>
          <p className="text-light-text-secondary dark:text-text-secondary">Current Streak (days)</p>
        </div>
      </div>

      {/* Info Card */}
      {recentSessions.length === 0 && (
        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg mb-12 text-center">
          <FileText size={40} className="mx-auto mb-4 text-accent-blue" />
          <h2 className="text-xl font-semibold mb-2">No Practice Data Yet</h2>
          <p className="text-light-text-secondary dark:text-text-secondary mb-4">
            Complete some typing practice sessions to see your statistics here.
          </p>
          <Link 
            to="/" 
            className="inline-block px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Start Practice Session
          </Link>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="bg-light-card dark:bg-darker-blue rounded-lg p-6 shadow-lg mb-12">
          <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
          <p className="text-light-text-secondary dark:text-text-secondary mb-6">Your last {recentSessions.length} typing practice sessions</p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-300 dark:border-gray-800">
                  <th className="pb-3 pr-6">Date</th>
                  <th className="pb-3 pr-6">Duration</th>
                  <th className="pb-3 pr-6">Items</th>
                  <th className="pb-3 pr-6">WPM</th>
                  <th className="pb-3">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-gray-800/50">
                    <td className="py-3 pr-6">{formatDate(session.date)}</td>
                    <td className="py-3 pr-6">{formatDuration(session.duration)}</td>
                    <td className="py-3 pr-6">{session.items || '-'}</td>
                    <td className="py-3 pr-6">{session.wpm.toFixed(1)}</td>
                    <td className="py-3">{session.accuracy.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Start New Practice Button */}
      <div className="text-center">
        <Link to="/" className="inline-block px-8 py-3 bg-accent-blue text-white rounded-md hover:bg-blue-600 transition-colors">
          Start New Practice Session
        </Link>
      </div>
    </div>
  );
}

export default StatsPage;