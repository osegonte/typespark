import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Code } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

function Header() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <header className="bg-light-card dark:bg-darker-blue py-4 px-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="flex items-center space-x-2">
        <div className="text-accent-blue">
          <Code size={24} />
        </div>
        <Link to="/" className="text-xl font-semibold flex items-center">
          TypeSpark <span className="ml-2 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">Study Edition</span>
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-light-text-secondary dark:text-text-secondary hover:text-light-text hover:dark:text-text-primary">Home</Link>
        <Link to="/stats" className="text-light-text-secondary dark:text-text-secondary hover:text-light-text hover:dark:text-text-primary">Stats</Link>
        
        {/* Theme toggle buttons */}
        <div className="flex ml-4">
          <button 
            className={`p-2 rounded-full ${!isDarkMode ? 'bg-yellow-100 text-yellow-600' : 'bg-transparent text-yellow-400 hover:bg-gray-800'}`}
            onClick={() => isDarkMode && toggleTheme()}
            aria-label="Light mode"
          >
            <Sun size={18} />
          </button>
          
          <button 
            className={`p-2 rounded-full ml-2 ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-transparent text-gray-500 hover:bg-gray-200'}`}
            onClick={() => !isDarkMode && toggleTheme()}
            aria-label="Dark mode"
          >
            <Moon size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;