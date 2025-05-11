import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Clock, TrendingUp, Check } from 'lucide-react';

function StatsPage() {
  const [stats, setStats] = useState({
    averageWpm: 0,
    accuracy: 0,
    practiceTime: 0,
    currentStreak: 0
  });
  
  // Mock data for recent sessions
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    // In a real app, we would fetch this data from the backend
    // For now, we'll use mock data
    setStats({
      averageWpm: 45,
      accuracy: 92,
      practiceTime: 25,
      currentStreak: 3
    });

    setRecentSessions([
      { date: '2025-05-11', duration: '12 mins', wpm: 48, accuracy: 94 },
      { date: '2025-05-10', duration: '8 mins', wpm: 42, accuracy: 90 },
      { date: '2025-05-08', duration: '15 mins', wpm: 45, accuracy: 93 }
    ]);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Performance Statistics</h1>
        <p className="text-text-secondary text-lg">
          Track your typing progress over time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <div className="card flex flex-col items-center justify-center py-6">
          <div className="flex justify-center mb-2 text-accent-blue">
            <BarChart2 size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.averageWpm}</p>
          <p className="text-text-secondary">Average WPM</p>
        </div>

        <div className="card flex flex-col items-center justify-center py-6">
          <div className="flex justify-center mb-2 text-accent-secondary">
            <Check size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.accuracy}%</p>
          <p className="text-text-secondary">Accuracy</p>
        </div>

        <div className="card flex flex-col items-center justify-center py-6">
          <div className="flex justify-center mb-2 text-yellow-500">
            <Clock size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.practiceTime}</p>
          <p className="text-text-secondary">Practice Time (mins)</p>
        </div>

        <div className="card flex flex-col items-center justify-center py-6">
          <div className="flex justify-center mb-2 text-green-500">
            <TrendingUp size={32} />
          </div>
          <p className="text-3xl font-bold mb-1">{stats.currentStreak}</p>
          <p className="text-text-secondary">Current Streak (days)</p>
        </div>
      </div>

      {/* WPM and Accuracy Progress Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">WPM Progress</h2>
          <p className="text-text-secondary mb-4">Your typing speed over time</p>
          
          {/* Placeholder for chart - in a real app, use a charting library */}
          <div className="bg-gray-900 h-64 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">WPM chart will be displayed here</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Accuracy</h2>
          <p className="text-text-secondary mb-4">Your typing accuracy over time</p>
          
          {/* Placeholder for chart */}
          <div className="bg-gray-900 h-64 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Accuracy chart will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card mb-12">
        <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
        <p className="text-text-secondary mb-6">Your last 5 typing practice sessions</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-800">
                <th className="pb-3 pr-6">Date</th>
                <th className="pb-3 pr-6">Duration</th>
                <th className="pb-3 pr-6">WPM</th>
                <th className="pb-3">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((session, index) => (
                <tr key={index} className="border-b border-gray-800/50">
                  <td className="py-3 pr-6">{session.date}</td>
                  <td className="py-3 pr-6">{session.duration}</td>
                  <td className="py-3 pr-6">{session.wpm}</td>
                  <td className="py-3">{session.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start New Practice Button */}
      <div className="text-center">
        <Link to="/" className="btn btn-primary px-8 py-3">
          Start New Practice Session
        </Link>
      </div>
    </div>
  );
}

export default StatsPage;