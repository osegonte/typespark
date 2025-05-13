"""
Diagnostic routes for TypeSpark backend with enhanced performance monitoring
This module provides diagnostic endpoints for monitoring application status
"""

from flask import jsonify, request
import os
import sys
import platform
import time
import psutil
import logging
from pdf_parser import PDFParser

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def register_diagnostic_routes(app, upload_folder):
    """Register diagnostic routes with the Flask application"""
    
    @app.route('/api/diagnostics/system', methods=['GET'])
    def system_info():
        """Return system information"""
        try:
            # Get memory usage
            memory = psutil.virtual_memory()
            memory_info = {
                'total_gb': round(memory.total / (1024 ** 3), 2),
                'available_gb': round(memory.available / (1024 ** 3), 2),
                'percent_used': memory.percent
            }
            
            # Get CPU info
            cpu_info = {
                'cores': psutil.cpu_count(logical=False),
                'logical_cores': psutil.cpu_count(logical=True),
                'current_usage_percent': psutil.cpu_percent(interval=0.1)
            }
            
            # Get disk info for the upload folder
            disk = psutil.disk_usage(os.path.dirname(upload_folder))
            disk_info = {
                'total_gb': round(disk.total / (1024 ** 3), 2),
                'free_gb': round(disk.free / (1024 ** 3), 2),
                'percent_used': disk.percent
            }
            
            return jsonify({
                'python_version': sys.version,
                'platform': platform.platform(),
                'node': platform.node(),
                'upload_folder': upload_folder,
                'upload_folder_exists': os.path.exists(upload_folder),
                'upload_folder_writable': os.access(upload_folder, os.W_OK) if os.path.exists(upload_folder) else False,
                'memory': memory_info,
                'cpu': cpu_info,
                'disk': disk_info,
                'server_time': time.time()
            })
        except Exception as e:
            logger.error(f"Error in system diagnostics: {str(e)}")
            return jsonify({
                'error': str(e),
                'python_version': sys.version,
                'platform': platform.platform(),
                'upload_folder': upload_folder,
                'upload_folder_exists': os.path.exists(upload_folder)
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
                    'size_kb': round(size / 1024, 2),
                    'created': os.path.getctime(file_path)
                })
        
        return jsonify({
            'files_count': len(files),
            'total_size': total_size,
            'total_size_kb': round(total_size / 1024, 2),
            'files': sorted(files, key=lambda x: x['created'], reverse=True)[:20]  # Limit to 20 files, sorted by newest
        })
    
    @app.route('/api/diagnostics/performance', methods=['GET'])
    def performance_test():
        """Run a simple performance test to check processing capabilities"""
        test_type = request.args.get('type', 'text')
        
        if test_type == 'text':
            # Generate sample text
            start_time = time.time()
            sample_text = "This is a sample paragraph for testing. " * 100
            
            # Create a temporary file
            temp_file = os.path.join(upload_folder, 'perf_test.txt')
            with open(temp_file, 'w') as f:
                f.write(sample_text)
            
            # Measure file creation time
            file_time = time.time() - start_time
            
            # Process the text
            start_proc = time.time()
            lines = len(sample_text.splitlines())
            words = len(sample_text.split())
            chars = len(sample_text)
            proc_time = time.time() - start_proc
            
            # Clean up
            try:
                os.remove(temp_file)
            except:
                pass
            
            return jsonify({
                'test_type': 'text',
                'file_operation_ms': round(file_time * 1000, 2),
                'processing_ms': round(proc_time * 1000, 2),
                'total_ms': round((file_time + proc_time) * 1000, 2),
                'sample_size': {
                    'lines': lines,
                    'words': words,
                    'characters': chars,
                    'kb': round(len(sample_text) / 1024, 2)
                },
                'processing_rate': {
                    'kb_per_second': round(len(sample_text) / 1024 / proc_time, 2) if proc_time > 0 else 'N/A'
                }
            })
        
        elif test_type == 'pdf':
            # Check if PyMuPDF is available
            pdf_support = PDFParser.get_pdf_support_status()
            if not pdf_support['pdf_support']:
                return jsonify({
                    'error': 'PDF support not available',
                    'pdf_libraries': pdf_support
                })
            
            # Return information about PDF support without actual test
            # (actual PDF test would require creating a PDF which adds dependency)
            return jsonify({
                'test_type': 'pdf',
                'pdf_support': pdf_support,
                'note': 'PDF performance test requires content. Upload a real PDF and check processing time.'
            })
        
        else:
            return jsonify({
                'error': 'Invalid test type',
                'valid_types': ['text', 'pdf']
            })
    
    @app.route('/api/diagnostics/cleanup', methods=['POST'])
    def cleanup_uploads():
        """Clean up old uploads to free space"""
        try:
            if not os.path.exists(upload_folder):
                return jsonify({
                    'error': 'Upload folder does not exist'
                })
            
            files_deleted = 0
            bytes_freed = 0
            
            for filename in os.listdir(upload_folder):
                file_path = os.path.join(upload_folder, filename)
                if os.path.isfile(file_path):
                    # Check if the file is older than 1 hour
                    file_age = time.time() - os.path.getmtime(file_path)
                    if file_age > 3600:  # 1 hour in seconds
                        size = os.path.getsize(file_path)
                        os.remove(file_path)
                        files_deleted += 1
                        bytes_freed += size
            
            return jsonify({
                'success': True,
                'files_deleted': files_deleted,
                'space_freed_kb': round(bytes_freed / 1024, 2)
            })
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
            return jsonify({
                'error': str(e)
            })