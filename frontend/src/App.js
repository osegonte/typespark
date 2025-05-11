import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PracticePage from './pages/PracticePage';
import StatsPage from './pages/StatsPage';
import Header from './components/Header';

function App() {
  const [sessionData, setSessionData] = useState(null);

  return (
    <div className="min-h-screen bg-dark-blue text-text-primary">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage setSessionData={setSessionData} />} />
          <Route path="/practice" element={<PracticePage sessionData={sessionData} />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
      <footer className="py-4 text-center text-text-secondary text-sm">
        <p>TypeSpark Study Edition - Designed for maximum comfort and learning efficiency</p>
      </footer>
    </div>
  );
}

export default App;