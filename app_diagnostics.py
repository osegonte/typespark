"""
Diagnostic routes for TypeSpark backend
This module provides diagnostic endpoints for monitoring application status
"""

from flask import jsonify
import os
import sys
import platform
from pdf_parser import PDFParser

def register_diagnostic_routes(app, upload_folder):
    """Register diagnostic routes with the Flask application"""
    
    @app.route('/api/diagnostics/system', methods=['GET'])
    def system_info():
        """Return system information"""
        return jsonify({
            'python_version': sys.version,
            'platform': platform.platform(),
            'node': platform.node(),
            'upload_folder': upload_folder,
            'upload_folder_exists': os.path.exists(upload_folder),
            'upload_folder_writable': os.access(upload_folder, os.W_OK) if os.path.exists(upload_folder) else False
        })
    
    @app.route('/api/diagnostics/pdf', methods=['GET'])
    def pdf_support():
        """Return PDF support status"""
        return jsonify(PDFParser.get_pdf_support_status())
    
    @app.route('/api/diagnostics/storage', methods=['GET'])
    def storage_info():
        """Return storage information"""
        if not os.path.exists(upload_folder):
            return jsonify({
                'error': 'Upload folder does not exist'
            })
        
        files = []
        total_size = 0
        
        for filename in os.listdir(upload_folder):
            file_path = os.path.join(upload_folder, filename)
            if os.path.isfile(file_path):
                size = os.path.getsize(file_path)
                total_size += size
                files.append({
                    'name': filename,
                    'size': size,
                    'created': os.path.getctime(file_path)
                })
        
        return jsonify({
            'files_count': len(files),
            'total_size': total_size,
            'files': files[:20]  # Limit to 20 files for safety
        })