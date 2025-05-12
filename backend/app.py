from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import uuid
from werkzeug.utils import secure_filename
from pdf_parser import PDFParser

app = Flask(__name__, static_folder='../frontend/build')
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

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
