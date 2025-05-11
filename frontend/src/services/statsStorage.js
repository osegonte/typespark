// Stats storage service using localStorage
const STORAGE_KEY = 'typespark_stats';
const SESSIONS_KEY = 'typespark_sessions';

// Get or initialize stats
const getStats = () => {
  const stats = localStorage.getItem(STORAGE_KEY);
  if (stats) {
    return JSON.parse(stats);
  }
  
  // Default stats
  return {
    averageWpm: 0,
    accuracy: 0,
    practiceTime: 0,
    currentStreak: 0,
    lastPracticeDate: null,
    totalItems: 0
  };
};

// Get or initialize sessions
const getSessions = () => {
  const sessions = localStorage.getItem(SESSIONS_KEY);
  if (sessions) {
    return JSON.parse(sessions);
  }
  
  return [];
};

// Save stats
const saveStats = (stats) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
};

// Save sessions
const saveSessions = (sessions) => {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

// Record a new practice session
const recordSession = (session) => {
  // Get current stats and sessions
  const stats = getStats();
  const sessions = getSessions();
  
  // Add the new session
  sessions.unshift(session); // Add to beginning of array
  
  // Keep only the last 20 sessions
  if (sessions.length > 20) {
    sessions.length = 20;
  }
  
  // Update stats
  const totalSessions = sessions.length;
  if (totalSessions > 0) {
    stats.averageWpm = sessions.reduce((sum, s) => sum + s.wpm, 0) / totalSessions;
    stats.accuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions;
    stats.practiceTime += session.duration / 60; // Convert seconds to minutes
    stats.totalItems += session.items || 0;
    
    // Update streak
    const today = new Date().toDateString();
    const lastDate = stats.lastPracticeDate;
    
    if (lastDate) {
      // Convert to Date objects for comparison
      const lastDay = new Date(lastDate).toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();
      
      if (today === lastDay) {
        // Already practiced today, streak unchanged
      } else if (yesterdayString === lastDay) {
        // Practiced yesterday, streak continues
        stats.currentStreak += 1;
      } else {
        // Streak broken
        stats.currentStreak = 1;
      }
    } else {
      // First practice
      stats.currentStreak = 1;
    }
    
    stats.lastPracticeDate = today;
  }
  
  // Save updated data
  saveStats(stats);
  saveSessions(sessions);
  
  return { stats, sessions };
};

const statsStorage = {
  getStats,
  getSessions,
  recordSession
};

export default statsStorage;