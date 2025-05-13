#!/bin/bash
# TypeSpark Backend Fix Script
# This script fixes common upload and backend issues

echo "TypeSpark Backend Fix Script"
echo "============================="

# Check if running from the correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "Error: This script must be run from the TypeSpark root directory"
    echo "Please change to that directory and try again"
    exit 1
fi

# 1. Check and fix backend app.py file
echo "Checking backend/app.py..."

# Import time module if needed
if ! grep -q "import time" backend/app.py; then
    echo "Adding time module import..."
    sed -i '' '1s/^/import time\n/' backend/app.py
fi

# Check for quickstart endpoint
if ! grep -q "@app.route('/api/quickstart'" backend/app.py; then
    echo "Adding quickstart endpoint to backend/app.py..."
    cat >> backend/app.py << 'EOF'

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
        
        return jsonify({
            'session_id': session_id,
            'filename': 'quickstart.txt',
            'items_count': len(study_items)
        })
    except Exception as e:
        print(f"Error creating quick start session: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500
EOF
    echo "Added quickstart endpoint"
fi

# Check for health endpoint
if ! grep -q "@app.route('/api/health'" backend/app.py; then
    echo "Adding health endpoint to backend/app.py..."
    cat >> backend/app.py << 'EOF'

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the server is running"""
    return jsonify({
        'status': 'ok',
        'version': '1.0',
        'upload_folder': UPLOAD_FOLDER,
        'upload_folder_exists': os.path.exists(UPLOAD_FOLDER),
        'timestamp': time.time()
    })
EOF
    echo "Added health endpoint"
fi

# 2. Fix CORS settings
echo "Checking CORS settings..."
if ! grep -q "supports_credentials=True" backend/app.py; then
    echo "Updating CORS configuration..."
    # For macOS compatibility, use a different sed syntax
    sed -i '' 's/CORS(app)/CORS(app, supports_credentials=True)/' backend/app.py
fi

# 3. Fix upload route to handle OPTIONS request
if ! grep -q "methods=\['POST', 'OPTIONS'\]" backend/app.py && grep -q "@app.route('/api/upload'" backend/app.py; then
    echo "Fixing upload route to handle OPTIONS requests..."
    sed -i '' "s/@app.route('\/api\/upload', methods=\['POST'\])/@app.route('\/api\/upload', methods=['POST', 'OPTIONS'])/" backend/app.py
    
    # Add OPTIONS handling if not present
    if ! grep -q "if request.method == 'OPTIONS':" backend/app.py; then
        line_num=$(grep -n "def upload_file" backend/app.py | cut -d: -f1)
        if [ -n "$line_num" ]; then
            line_num=$((line_num + 2))
            
            # Insert options handling
            sed -i '' "${line_num}i\\
    # Handle pre-flight OPTIONS request\\
    if request.method == 'OPTIONS':\\
        return '', 200\\
" backend/app.py
        fi
    fi
fi

# 4. Create a python config file if needed
if [ ! -f "backend/config.py" ]; then
    echo "Creating backend/config.py..."
    cat > backend/config.py << 'EOF'
# TypeSpark Configuration

# Backend Port
BACKEND_PORT=5002

# Frontend Port 
FRONTEND_PORT=3000

# Maximum Content Size (in bytes)
# 10MB = 10 * 1024 * 1024
MAX_CONTENT_SIZE=10485760

# Maximum PDF Pages to Process
MAX_PDF_PAGES=10

# Maximum Content Size per Document (in bytes)
# 50KB = 50 * 1024
MAX_CONTENT_SIZE_PER_DOC=51200

# Upload Folder
UPLOAD_FOLDER="uploads"

# Allowed File Extensions
ALLOWED_EXTENSIONS=["pdf", "txt"]
EOF
    echo "Created config.py"
fi

# 5. Ensure uploads directory exists with proper permissions
echo "Checking uploads directory..."
if [ ! -d "backend/uploads" ]; then
    echo "Creating backend/uploads directory..."
    mkdir -p backend/uploads
    echo "Created uploads directory"
fi

# Set permissions
chmod 755 backend/uploads
echo "Set permissions for uploads directory"

# 6. Clean up any broken or partial files
echo "Cleaning upload folder of any potential problem files..."
rm -f backend/uploads/* 2>/dev/null
echo "Cleaned uploads folder"

# 7. Check PyMuPDF is installed
echo "Checking PyMuPDF installation..."
if [ -d "backend/venv" ]; then
    cd backend
    source venv/bin/activate
    if ! pip list | grep -q "PyMuPDF"; then
        echo "Installing PyMuPDF..."
        pip install PyMuPDF || echo "Failed to install PyMuPDF, will fall back to PyPDF2"
    fi
    
    # Ensure PyPDF2 is installed as fallback
    if ! pip list | grep -q "PyPDF2"; then
        echo "Installing PyPDF2 as fallback..."
        pip install PyPDF2
    fi
    
    # Make sure Flask-CORS is installed
    if ! pip list | grep -q "Flask-CORS"; then
        echo "Installing Flask-CORS..."
        pip install Flask-CORS
    fi
    
    deactivate
    cd ..
fi

echo "============================="
echo "Backend fixes completed."
echo ""
echo "To start the application:"
echo "1. In one terminal: cd backend && source venv/bin/activate && python app.py"
echo "2. In another terminal: cd frontend && npm start"
echo ""
echo "If you continue to have issues:"
echo "- Check the console for specific error messages"
echo "- Verify that your backend is running on port 5002"
echo "- Try the Quick Start option which doesn't require file uploads"