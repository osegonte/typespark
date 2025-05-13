@app.route('/api/session/<session_id>/next', methods=['GET', 'OPTIONS'])
def get_next_item(session_id):
    """Get the next study item from the session with improved error handling"""
    # Handle pre-flight OPTIONS request
    if request.method == 'OPTIONS':
        response = make_response('', 200)
        response.headers.extend({
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
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
        
        return jsonify({
            'item': item,
            'progress': {
                'current': session['current_index'],
                'total': session['total_items']
            }
        })
    except Exception as e:
        print(f"Error getting next item: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': f'Server error: {str(e)}'}), 500
