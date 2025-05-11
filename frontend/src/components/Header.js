import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Code } from 'lucide-react';

function Header() {
  return (
    <header className="bg-darker-blue py-4 px-6 flex items-center justify-between border-b border-gray-800">
      <div className="flex items-center space-x-2">
        <div className="text-accent-blue">
          <Code size={24} />
        </div>
        <Link to="/" className="text-xl font-semibold flex items-center">
          TypeSpark <span className="ml-2 text-sm bg-gray-800 text-gray-300 px-2 py-0.5 rounded">Study Edition</span>
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        <Link to="/" className="text-text-secondary hover:text-text-primary">Home</Link>
        <Link to="/stats" className="text-text-secondary hover:text-text-primary">Stats</Link>
        
        <button className="ml-4 p-2 rounded-full bg-darker-blue hover:bg-gray-800">
          <Sun size={18} className="text-yellow-400" />
        </button>
        
        <button className="p-2 rounded-full bg-gray-800">
          <Moon size={18} className="text-gray-400" />
        </button>
      </div>
    </header>
  );
}

export default Header;