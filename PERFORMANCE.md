/*
 * TypeSpark Performance README
 * 
 * This document explains the performance improvements made to TypeSpark
 * and how to use the application with optimal performance.
 */

# TypeSpark Performance Guide

## Performance Improvements

The TypeSpark application has been optimized to address loading time issues:

1. **PDF Processing Limitations**
   - Limited to first 10 pages of any PDF
   - Text content capped at 50KB per document
   - Processing timeouts implemented to prevent hanging

2. **Frontend Enhancements**
   - Added loading indicators with clearer feedback
   - Implemented timeout handling for API requests
   - Added Quick Start option that bypasses file upload
   - File size validation (10MB limit)

3. **Backend Optimizations**
   - Optimized text extraction algorithms
   - Added content chunking for better performance
   - Improved error handling and logging
   - Added diagnostic endpoints

## Using TypeSpark Efficiently

### For Best Performance

1. **Use the Quick Start option** for immediate practice without file uploads
   - Click the "Start Quick Practice" button on the homepage

2. **Prefer Text Files** over PDFs when possible
   - Text files process much faster than PDFs
   - Use small PDFs (under 10 pages) for best results

3. **Keep File Sizes Small**
   - Files under 1MB will process much faster
   - Break large content into smaller files

4. **Check System Diagnostics** if having issues
   - Open `http://localhost:5001/api/diagnostics/system` to view system info
   - Open `http://localhost:5001/api/diagnostics/pdf` to check PDF support status

## Troubleshooting

If you experience slow loading times:

1. **Clear the uploads folder** to free up space
   - Delete files in `backend/uploads/` directory

2. **Check PDF library support**
   - Ensure PyMuPDF or PyPDF2 is installed properly
   - Run `pip install PyMuPDF>=1.24.0` for better performance

3. **Restart the application**
   - Run the fix script: `./fix_typespark.sh`
   - Or manually restart both servers

4. **Configure memory limits**
   - Add `MAX_CONTENT_SIZE = 5 * 1024 * 1024` to `app.py` to lower the file size limit
   - Lower `self.max_pages` in `pdf_parser.py` for faster PDF processing

## Advanced Configuration

If you need to process larger files, you can modify these constants:

1. In `backend/pdf_parser.py`:
   ```python
   self.max_content_size = 50 * 1024  # Increase for larger content
   self.max_pages = 10  # Increase for more pages
   ```

2. In `backend/app.py`:
   ```python
   MAX_CONTENT_SIZE = 10 * 1024 * 1024  # Adjust file size limit
   ```

Remember that increasing these limits will result in longer processing times.