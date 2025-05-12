#!/bin/bash

# Fix all issues with TypeSpark app

echo "Fixing TypeSpark app issues..."

# Create directories if they don't exist
mkdir -p frontend/src/contexts
mkdir -p frontend/src/services

# Move contexts directory if needed
if [ -d "frontend/src/components/contexts" ]; then
  echo "Moving ThemeContext to correct location..."
  mv frontend/src/components/contexts/ThemeContext.js frontend/src/contexts/
fi

# Update backend app.py
echo "Updating backend/app.py for better text handling..."
cat > backend/app.py << 'EOL'
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import uuid
from werkzeug.utils import secure_filename
from pdf_parser import PDFParser

app = Flask(__name__, static_folder='../frontend/build')
CORS(app)  # Enable Cross-Origin Resource Sharing

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Session data store (In-memory for demo, would use a database in production)
sessions = {}

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and process it for study content"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Process the file based on type
        if filename.lower().endswith('.pdf'):
            parser = PDFParser(file_path)
            study_items = parser.extract_items()
        else:
            # For text files, use a more robust parser
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                
                # Create multiple study items by splitting text into paragraphs
                paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
                study_items = []
                
                # If no paragraphs found or text is very short, use the entire text as one item
                if not paragraphs or len(text) < 100:
                    study_items = [{
                        'id': str(uuid.uuid4()),
                        'prompt': 'Type this text:',
                        'content': text,
                        'type': 'text',
                        'context': 'Custom Text'
                    }]
                else:
                    for i, paragraph in enumerate(paragraphs):
                        # Only use paragraphs with meaningful content
                        if len(paragraph) > 10:
                            study_items.append({
                                'id': str(uuid.uuid4()),
                                'prompt': f"Type this paragraph ({i+1}/{len(paragraphs)}):",
                                'content': paragraph,
                                'type': 'text',
                                'context': 'Custom Text'
                            })
                
                # If still no items after filtering, create one with the entire text
                if not study_items:
                    study_items = [{
                        'id': str(uuid.uuid4()),
                        'prompt': 'Type this text:',
                        'content': text,
                        'type': 'text',
                        'context': 'Custom Text'
                    }]
            except Exception as e:
                print(f"Error processing text file: {str(e)}")
                # Fallback to simple text item
                study_items = [{
                    'id': str(uuid.uuid4()),
                    'prompt': 'Type this text:',
                    'content': 'Sample text for typing practice.',
                    'type': 'text',
                    'context': 'Custom Text'
                }]
        
        # Create a session for this content
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            'items': study_items,
            'current_index': 0,
            'total_items': len(study_items),
            'filename': filename
        }
        
        return jsonify({
            'session_id': session_id,
            'filename': filename,
            'items_count': len(study_items)
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get session information"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
        
    return jsonify(sessions[session_id])

@app.route('/api/session/<session_id>/next', methods=['GET'])
def get_next_item(session_id):
    """Get the next study item from the session"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
        
    session = sessions[session_id]
    if session['current_index'] >= session['total_items']:
        return jsonify({'error': 'No more items in session'}), 400
        
    item = session['items'][session['current_index']]
    session['current_index'] += 1
    
    return jsonify({
        'item': item,
        'progress': {
            'current': session['current_index'],
            'total': session['total_items']
        }
    })

@app.route('/api/session/<session_id>/submit', methods=['POST'])
def submit_answer(session_id):
    """Submit an answer for the current item"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    data = request.json
    if not data or 'answer' not in data or 'item_id' not in data:
        return jsonify({'error': 'Missing answer or item_id'}), 400
    
    # Find the item by ID
    session = sessions[session_id]
    item_id = data['item_id']
    user_answer = data['answer']
    
    item = None
    for i in session['items']:
        if i['id'] == item_id:
            item = i
            break
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    # Calculate accuracy
    expected = item['content']
    matches = sum(1 for a, b in zip(user_answer, expected) if a == b)
    accuracy = matches / max(len(expected), 1) if expected else 0
    
    # Calculate WPM (words per minute)
    time_taken = data.get('time_taken', 60)  # Default to 60 seconds if not provided
    words = len(expected.split())
    wpm = (words / time_taken) * 60 if time_taken > 0 else 0
    
    # Store results
    result = {
        'item_id': item_id,
        'accuracy': accuracy,
        'wpm': wpm,
        'time_taken': time_taken
    }
    
    # In a real app, we'd store this result in a database
    
    return jsonify({
        'result': result,
        'progress': {
            'current': session['current_index'],
            'total': session['total_items']
        }
    })

# Serve React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
EOL

# Update backend/run.sh
echo "Updating backend/run.sh to use port 5001..."
cat > backend/run.sh << 'EOL'
#!/bin/bash
export FLASK_APP=app.py
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5001
EOL
chmod +x backend/run.sh

# Update frontend HomePage.js
echo "Updating HomePage.js for better text input handling..."
cat > frontend/src/pages/HomePage.js << 'EOL'
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

      if (response.data && response.data.items_count > 0) {
        setSessionData(response.data);
        navigate('/practice');
      } else {
        setError('No content could be extracted from the file.');
      }
    } catch (err) {
      console.error('Upload error:', err);
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
      // Format text to ensure paragraphs
      const formattedText = customText
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2

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
        }
      });
      
      if (response.data && response.data.items_count > 0) {
        setSessionData(response.data);
        navigate('/practice');
      } else {
        setError('No content could be extracted from the text.');
      }
    } catch (err) {
      console.error('Text upload error:', err);
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
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin mr-2" size={16} />
                <span>Processing...</span>
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
            onChange={(e) => setCustomText(e.target.value)}
          ></textarea>

          <button 
            className="btn btn-secondary w-full mt-4"
            onClick={handleCustomTextSubmit}
            disabled={isLoading || !customText.trim()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <RefreshCw className="animate-spin mr-2" size={16} />
                <span>Processing...</span>
              </div>
            ) : 'Start Typing Practice'}
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
EOL

# Create or update ThemeContext.js
echo "Creating ThemeContext.js in the correct location..."
mkdir -p frontend/src/contexts
cat > frontend/src/contexts/ThemeContext.js << 'EOL'
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode

  // Load theme preference from localStorage on initial render
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Update localStorage and apply theme when it changes
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Apply theme to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a'; // dark-blue from our theme
      document.body.style.color = '#FFFFFF'; // text-primary from our theme
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#FFFFFF';
      document.body.style.color = '#1C1C1E'; // dark text for light mode
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
EOL

# Update requirements.txt
echo "Updating requirements.txt..."
cat > requirements.txt << 'EOL'
flask==2.3.3
flask-cors==4.0.0
PyMuPDF==1.22.5
Werkzeug==2.3.7
gunicorn==21.2.0
python-dotenv==1.0.0
EOL

# Reinstall python dependencies
echo "Reinstalling Python dependencies..."
if [ -d "backend/venv" ]; then
  cd backend
  source venv/bin/activate
  pip install -r ../requirements.txt
  deactivate
  cd ..
fi

echo "All fixes applied! Please restart your application with ./run.sh"