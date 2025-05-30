from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import os
import json
import uuid
import time
from werkzeug.utils import secure_filename
from pdf_parser import PDFParser

# Configuration - CONSISTENTLY using port 5002
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt'}
MAX_CONTENT_SIZE = 10 * 1024 * 1024  # 10MB limit
PORT = 5002  # Consistent port definition

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Improved CORS setup to handle all requests properly
CORS(app, 
     resources={r"/*": {"origins": "*"}},  # Apply to ALL routes 
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"])

# Add a CORS preflight handler for all routes
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Pre-flight OPTIONS handler for all routes
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    response = app.make_default_options_response()
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# Import diagnostic routes and register them
try:
    from app_diagnostics import register_diagnostic_routes
    register_diagnostic_routes(app, UPLOAD_FOLDER)
except ImportError:
    print("Warning: app_diagnostics module not found. Diagnostic routes will not be available.")

# Ensure upload directory exists and is writable
try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    if not os.access(UPLOAD_FOLDER, os.W_OK):
        print(f"Warning: Upload folder {UPLOAD_FOLDER} is not writable")
except Exception as e:
    print(f"Error creating upload folder: {str(e)}")

# Session data store (In-memory for demo, would use a database in production)
sessions = {}

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST', 'OPTIONS'])
def upload_file():
    """Handle file upload and process it for study content with better error handling"""
    # Handle pre-flight OPTIONS request
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        response.headers.extend({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        })
        return response
    
    print("=== Upload request received ===")
    print(f"Content-Type: {request.content_type}")
    print(f"Has file part: {'file' in request.files}")
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    print(f"Filename: {file.filename}")
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset file pointer
    print(f"File size: {file_size} bytes")
    
    if file_size > MAX_CONTENT_SIZE:
        return jsonify({'error': f'File too large. Maximum size is {MAX_CONTENT_SIZE/1024/1024}MB'}), 413
        
    if file and allowed_file(file.filename):
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            print(f"Saving to: {file_path}")
            file.save(file_path)
            print(f"File saved successfully")
            
            # Process the file based on type
            study_items = []
            if filename.lower().endswith('.pdf'):
                print("Processing PDF file...")
                parser = PDFParser(file_path)
                study_items = parser.extract_items()
                print(f"Extracted {len(study_items)} items from PDF")
            else:
                # For text files, use a more robust parser
                print("Processing text file...")
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        text = f.read()
                except UnicodeDecodeError:
                    # Try alternate encoding
                    with open(file_path, 'r', encoding='latin-1') as f:
                        text = f.read()
                
                # Create multiple study items by splitting text into paragraphs
                paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
                
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
                    # Limit to 20 paragraphs for performance
                    for i, paragraph in enumerate(paragraphs[:20]):
                        # Only use paragraphs with meaningful content
                        if len(paragraph) > 10:
                            study_items.append({
                                'id': str(uuid.uuid4()),
                                'prompt': f"Type this paragraph ({i+1}/{min(len(paragraphs), 20)}):",
                                'content': paragraph,
                                'type': 'text',
                                'context': 'Custom Text'
                            })
                
                # If still no items after filtering, create one with the entire text
                if not study_items:
                    study_items = [{
                        'id': str(uuid.uuid4()),
                        'prompt': 'Type this text:',
                        'content': text[:2000],  # Limit length for performance
                        'type': 'text',
                        'context': 'Custom Text'
                    }]
                
                print(f"Extracted {len(study_items)} items from text file")
            
            # Ensure we have at least one study item
            if not study_items:
                study_items = [{
                    'id': str(uuid.uuid4()),
                    'prompt': 'Type this text:',
                    'content': 'No content could be extracted. Here is a sample text.',
                    'type': 'text',
                    'context': 'Sample'
                }]
            
            # Ensure item content isn't too long (for performance)
            for item in study_items:
                if len(item['content']) > 1000:
                    item['content'] = item['content'][:1000] + '... (content truncated for performance)'
                
            # Create a session for this content
            session_id = str(uuid.uuid4())
            sessions[session_id] = {
                'items': study_items,
                'current_index': 0,
                'total_items': len(study_items),
                'filename': filename
            }
            
            result = {
                'session_id': session_id,
                'filename': filename,
                'items_count': len(study_items)
            }
            print(f"Session created successfully: {result}")
            
            response = jsonify(result)
            # Add explicit CORS header
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response
        except Exception as e:
            print(f"Error during upload process: {str(e)}")
            return jsonify({'error': f'Server error during upload: {str(e)}'}), 500
    
    print(f"Invalid file type: {file.filename}")
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/quickstart', methods=['GET'])
def quickstart():
    """Create a quick start session without file upload"""
    try:
        # Create sample study items
        study_items = [
            {
                'id': str(uuid.uuid4()),
                'prompt': 'Type this paragraph:',
                'content': 'The quick brown fox jumps over the lazy dog. This is a simple sentence for testing typing speed without needing to upload a file.',
                'type': 'text',
                'context': 'Quick Start'
            },
            {
                'id': str(uuid.uuid4()),
                'prompt': 'Type this paragraph:',
                'content': 'TypeSpark is a typing practice application designed to help you improve your typing skills while studying content from your documents.',
                'type': 'text',
                'context': 'Quick Start'
            },
            {
                'id': str(uuid.uuid4()),
                'prompt': 'Type this paragraph:',
                'content': 'Practice makes perfect. The more you type, the faster and more accurate you will become. Try to focus on accuracy first, then speed.',
                'type': 'text',
                'context': 'Quick Start'
            }
        ]
        
        # Create a session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            'items': study_items,
            'current_index': 0,
            'total_items': len(study_items),
            'filename': 'quickstart.txt'
        }
        
        response = jsonify({
            'session_id': session_id,
            'filename': 'quickstart.txt',
            'items_count': len(study_items)
        })
        # Add explicit CORS header
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
    except Exception as e:
        print(f"Error creating quick start session: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get session information"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
        
    response = jsonify(sessions[session_id])
    # Add explicit CORS header
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

@app.route('/api/session/<session_id>/next', methods=['GET', 'OPTIONS'])
def get_next_item(session_id):
    """Get the next study item from the session with improved error handling and CORS support"""
    # Handle pre-flight OPTIONS request
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        response.headers.extend({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        })
        return response
        
    try:
        # Log the request for debugging
        print(f"Next item request for session: {session_id}")
        
        if session_id not in sessions:
            print(f"Session not found: {session_id}")
            print(f"Available sessions: {list(sessions.keys())}")
            return jsonify({'error': 'Session not found'}), 404
            
        session = sessions[session_id]
        print(f"Session data: {session['current_index']}/{session['total_items']}")
        
        if session['current_index'] >= session['total_items']:
            print(f"No more items in session {session_id}")
            return jsonify({
                'error': 'No more items in session',
                'session_completed': True
            }), 400
            
        item = session['items'][session['current_index']]
        session['current_index'] += 1
        
        print(f"Returning item {session['current_index']}/{session['total_items']} for session {session_id}")
        
        response = jsonify({
            'item': item,
            'progress': {
                'current': session['current_index'],
                'total': session['total_items']
            }
        })
        
        # Explicitly add CORS headers to the response
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error getting next item: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/session/<session_id>/submit', methods=['POST', 'OPTIONS'])
def submit_answer(session_id):
    """Submit an answer for the current item with improved CORS support"""
    # Handle pre-flight OPTIONS request
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        response.headers.extend({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
        })
        return response
        
    try:
        print(f"Submit answer request for session: {session_id}")
        print(f"Request data: {request.json}")
        
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
        # Limit comparison length for performance
        max_compare_length = min(len(expected), len(user_answer), 1000)
        matches = sum(1 for a, b in zip(user_answer[:max_compare_length], expected[:max_compare_length]) if a == b)
        accuracy = matches / max(len(expected[:max_compare_length]), 1) if expected else 0
        
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
        print(f"Calculated result: {result}")
        
        response = jsonify({
            'result': result,
            'progress': {
                'current': session['current_index'],
                'total': session['total_items']
            }
        })
        
        # Explicitly add CORS headers to the response
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error submitting answer: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the server is running"""
    response = jsonify({
        'status': 'ok',
        'version': '1.0',
        'upload_folder': UPLOAD_FOLDER,
        'upload_folder_exists': os.path.exists(UPLOAD_FOLDER),
        'timestamp': time.time(),
        'port': PORT  # Include port info in health check
    })
    # Add explicit CORS header
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

# Serve React app
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.errorhandler(Exception)
def handle_exception(e):
    """Global error handler with CORS headers"""
    print(f"Unhandled exception: {str(e)}")
    response = jsonify({'error': 'An unexpected error occurred'})
    
    # Always add CORS headers to error responses
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    
    return response, 500

if __name__ == '__main__':
    import argparse
    
    # Add command-line arguments for customization
    parser = argparse.ArgumentParser(description='Run the TypeSpark backend server')
    parser.add_argument('--port', type=int, default=PORT, help='Port to run the server on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to run the server on')
    
    args = parser.parse_args()
    
    # Ensure uploads directory exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    
    print(f"Starting TypeSpark backend on port {args.port}")
    app.run(debug=args.debug, host=args.host, port=args.port)