#!/bin/bash
# Direct Fix Script for Practice Page Loading Issues

echo "TypeSpark Practice Page Loading Fix Script"
echo "=========================================="

# 1. Update the port in API_URL if needed
echo "Checking API URL configuration..."

# Check if frontend is using port 3001
if [ -f "frontend/.env" ] && grep -q "PORT=3001" frontend/.env; then
    echo "Frontend is configured to use port 3001"
    
    # Check API URL in files
    if grep -q "http://localhost:5001/api" frontend/src/pages/PracticePage.js; then
        echo "Updating API_URL in PracticePage.js..."
        sed -i.bak 's|http://localhost:5001/api|http://localhost:5002/api|g' frontend/src/pages/PracticePage.js
    fi
else
    echo "Frontend port not explicitly set to 3001 in .env"
fi

# 2. Create a CORS test file
echo "Creating CORS test..."
cat > backend/cors-test.py << 'EOF_CORS'
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
EOF_CORS

# 3. Ensure we're handling preflight requests correctly in app.py
echo "Checking OPTIONS handling in app.py..."
if ! grep -q "methods=\['GET', 'OPTIONS'\]" backend/app.py || ! grep -q "if request.method == 'OPTIONS':" backend/app.py; then
    echo "Adding OPTIONS handling to session route..."
    
    # Use appropriate sed syntax based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's|@app.route("/api/session/<session_id>/next", methods=\["GET"\])|@app.route("/api/session/<session_id>/next", methods=["GET", "OPTIONS"])|g' backend/app.py
    else
        # Linux
        sed -i 's|@app.route("/api/session/<session_id>/next", methods=\["GET"\])|@app.route("/api/session/<session_id>/next", methods=["GET", "OPTIONS"])|g' backend/app.py
    fi
    
    # Find the next_item function and add OPTIONS handling
    if grep -q "def get_next_item" backend/app.py; then
        line_num=$(grep -n "def get_next_item" backend/app.py | cut -d: -f1)
        if [ -n "$line_num" ]; then
            line_num=$((line_num + 2))
            
            # Insert options handling
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "${line_num}i\\
    # Handle pre-flight OPTIONS request\\
    if request.method == 'OPTIONS':\\
        return '', 200\\
" backend/app.py
            else
                # Linux
                sed -i "${line_num}i\\
    # Handle pre-flight OPTIONS request\\
    if request.method == 'OPTIONS':\\
        return '', 200\\
" backend/app.py
            fi
            
            echo "Added OPTIONS handling to get_next_item function"
        fi
    fi
fi

# 4. Check session handling in the backend
echo "Checking session handling in app.py..."

line_num=$(grep -n "sessions\[session_id\]" backend/app.py | head -1 | cut -d: -f1)
if [ -n "$line_num" ]; then
    echo "Found session initialization at line $line_num"
    
    # Add debug output for sessions after this line
    debug_line=$((line_num + 5))
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "${debug_line}i\\
    # Debug: Log session creation\\
    print(f\"Created session {session_id} with {len(study_items)} items\")\\
" backend/app.py
    else
        # Linux
        sed -i "${debug_line}i\\
    # Debug: Log session creation\\
    print(f\"Created session {session_id} with {len(study_items)} items\")\\
" backend/app.py
    fi
    
    echo "Added session debugging output"
fi

# 5. Clean up uploads folder
echo "Cleaning uploads folder..."
rm -f backend/uploads/* 2>/dev/null

echo "=========================================="
echo "Fix script completed!"
echo ""
echo "Next steps:"
echo "1. Stop any running servers with Ctrl+C"
echo "2. Restart both backend and frontend:"
echo "   - Terminal 1: cd backend && source venv/bin/activate && python app.py"
echo "   - Terminal 2: cd frontend && npm start"
echo "3. Try the Quick Start option first to confirm session handling works"
echo "4. After that, try a simple text file (not PDF) upload"
echo "5. Finally, try a small PDF"
echo ""
echo "If you still have issues, use the new debug panel (visible in loading/error screens)"
