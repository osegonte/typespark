"""
PDF parser module for TypeSpark with improved version compatibility and performance.
This version works with both PyMuPDF (fitz) and PyPDF2 as fallback.
It includes critical performance optimizations to prevent long loading times.
"""

import os
import re
import uuid
import platform
import logging
import time
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import PyMuPDF
HAS_PYMUPDF = False
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
    logger.info(f"Using PyMuPDF version: {fitz.version}")
except ImportError:
    logger.warning("PyMuPDF not available. Will try PyPDF2 as fallback.")
    
# Try to import PyPDF2 as a fallback
HAS_PYPDF2 = False
try:
    # Handle different PyPDF2 versions
    try:
        from PyPDF2 import PdfReader  # Newer versions
        logger.info("Using newer PyPDF2 with PdfReader")
    except ImportError:
        from PyPDF2 import PdfFileReader  # Older versions
        # Create a compatibility layer
        class PdfReader:
            def __init__(self, file_obj):
                self.reader = PdfFileReader(file_obj)
                self.pages = [Page(self.reader, i) for i in range(self.reader.getNumPages())]
                
        class Page:
            def __init__(self, reader, page_num):
                self.reader = reader
                self.page_num = page_num
                
            def extract_text(self):
                return self.reader.getPage(self.page_num).extractText()
                
        logger.info("Using older PyPDF2 with compatibility layer")
        
    HAS_PYPDF2 = True
except ImportError:
    logger.warning("PyPDF2 not available.")

class PDFParser:
    """Parser to extract study content from PDFs with improved version compatibility and performance"""
    
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.raw_text = ""
        self.processing_time = 0
        logger.info(f"Initializing PDF parser for: {pdf_path}")
        
        # Check if file exists
        if not os.path.exists(self.pdf_path):
            logger.error(f"File not found: {self.pdf_path}")
            return
            
        # Maximum content size to prevent memory issues (50KB)
        self.max_content_size = 50 * 1024
        
        # Maximum pages to process
        self.max_pages = 10
        
        # Processing timeout in seconds
        self.timeout = 30
    
    def extract_text(self):
        """Extract text from the PDF, handling different PDF libraries with performance optimizations"""
        if not os.path.exists(self.pdf_path):
            logger.error(f"File not found: {self.pdf_path}")
            return self
        
        # Get file size
        file_size = os.path.getsize(self.pdf_path)
        logger.info(f"PDF file size: {file_size / 1024:.2f} KB")
        
        # Start timing
        start_time = time.time()
        
        try:
            if HAS_PYMUPDF:
                logger.info("Extracting text with PyMuPDF")
                # Use PyMuPDF if available - the most efficient option
                with fitz.open(self.pdf_path) as doc:
                    # Get total pages
                    total_pages = len(doc)
                    logger.info(f"PDF has {total_pages} pages, limiting to {self.max_pages}")
                    
                    # Set up progress tracking
                    page_count = 0
                    total_text_size = 0
                    timeout_reached = False
                    
                    # Extract text from each page, with limits
                    for page_idx, page in enumerate(doc):
                        # Check processing time for timeout
                        current_time = time.time()
                        if current_time - start_time > self.timeout:
                            logger.warning(f"Processing timeout reached after {self.timeout} seconds")
                            self.raw_text += "\n\n[Processing timeout: document too complex]"
                            timeout_reached = True
                            break
                            
                        # Check if we've reached the max pages
                        if page_idx >= self.max_pages:
                            self.raw_text += "\n\n[Content truncated: only first 10 pages processed for performance]"
                            break
                            
                        # Extract text and add to raw_text
                        try:
                            page_text = page.get_text("text")
                            # Clean the text slightly - handle common issues
                            page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', page_text)
                            self.raw_text += page_text
                            page_count += 1
                            total_text_size += len(page_text)
                        except Exception as e:
                            logger.error(f"Error processing page {page_idx}: {str(e)}")
                            continue
                            
                        # Check if we've reached our content size limit
                        if len(self.raw_text) > self.max_content_size:
                            self.raw_text = self.raw_text[:self.max_content_size]
                            self.raw_text += "\n\n[Content truncated: maximum content size reached]"
                            break
                            
                        # Log progress periodically
                        if page_idx % 5 == 0 and page_idx > 0:
                            logger.info(f"Processed {page_idx} pages so far")
                            
                    if not timeout_reached:
                        logger.info(f"Extracted {len(self.raw_text)} characters from {page_count} pages with PyMuPDF")
            elif HAS_PYPDF2:
                logger.info("Extracting text with PyPDF2")
                # Use PyPDF2 as fallback
                with open(self.pdf_path, 'rb') as file:
                    try:
                        reader = PdfReader(file)
                        total_pages = len(reader.pages)
                        logger.info(f"PDF has {total_pages} pages, limiting to {self.max_pages}")
                        
                        # Set up progress tracking
                        page_count = 0
                        timeout_reached = False
                        
                        # Extract text with page limit
                        for page_idx, page in enumerate(reader.pages):
                            # Check processing time for timeout
                            current_time = time.time()
                            if current_time - start_time > self.timeout:
                                logger.warning(f"Processing timeout reached after {self.timeout} seconds")
                                self.raw_text += "\n\n[Processing timeout: document too complex]"
                                timeout_reached = True
                                break
                                
                            # Check if we've reached the max pages
                            if page_idx >= self.max_pages:
                                self.raw_text += "\n\n[Content truncated: only first 10 pages processed for performance]"
                                break
                                
                            # Extract text and add to raw_text
                            try:
                                page_text = page.extract_text()
                                # Clean the text slightly
                                if page_text:
                                    page_text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\xff]', '', page_text)
                                    self.raw_text += page_text + "\n\n"
                                    page_count += 1
                            except Exception as e:
                                logger.error(f"Error processing page {page_idx}: {str(e)}")
                                continue
                                
                            # Check if we've reached our content size limit
                            if len(self.raw_text) > self.max_content_size:
                                self.raw_text = self.raw_text[:self.max_content_size]
                                self.raw_text += "\n\n[Content truncated: maximum content size reached]"
                                break
                                
                        if not timeout_reached:
                            logger.info(f"Extracted {len(self.raw_text)} characters from {page_count} pages with PyPDF2")
                    except Exception as e:
                        logger.error(f"Error with PyPDF2 processing: {str(e)}")
                        self.raw_text = f"ERROR EXTRACTING TEXT: {str(e)}"
            else:
                # No PDF library available
                error_msg = "PDF SUPPORT NOT AVAILABLE. Please install PyMuPDF or PyPDF2."
                logger.error(error_msg)
                self.raw_text = error_msg
        except Exception as e:
            error_str = str(e)
            logger.error(f"Error extracting text from PDF: {error_str}")
            logger.error(traceback.format_exc())
            self.raw_text = f"ERROR EXTRACTING TEXT: {error_str}"
        
        # Log processing time
        end_time = time.time()
        self.processing_time = end_time - start_time
        logger.info(f"PDF processing took {self.processing_time:.2f} seconds")
        
        return self
    
    def extract_items(self):
        """Process PDF and extract study items with performance optimizations"""
        # Extract text if not already done
        if not self.raw_text:
            self.extract_text()
            
        items = []
        
        # If extraction failed with an error message, return a study item with the error
        if self.raw_text.startswith("ERROR EXTRACTING TEXT") or self.raw_text.startswith("PDF SUPPORT NOT AVAILABLE"):
            items.append({
                'id': str(uuid.uuid4()),
                'prompt': "Error processing PDF:",
                'content': self.raw_text,
                'type': 'error',
                'context': 'Error'
            })
            return items
        
        # Start timing item extraction
        start_time = time.time()
        
        # If the content is empty or very short, create a simple item
        if not self.raw_text or len(self.raw_text) < 50:
            items.append({
                'id': str(uuid.uuid4()),
                'prompt': "No text content found in PDF:",
                'content': "This PDF appears to be empty or contains no extractable text. It may be an image-based PDF that requires OCR processing.",
                'type': 'error',
                'context': 'Empty Content'
            })
            return items
            
        # For very large content, just split into chunks rather than trying complex parsing
        if len(self.raw_text) > 30000:
            logger.info("Content is large, using simple chunk splitting for performance")
            chunks = self._split_into_chunks(self.raw_text, 500)
            for i, chunk in enumerate(chunks[:20]):  # Limit to 20 chunks
                if len(chunk.strip()) > 50:  # Only include meaningful chunks
                    items.append({
                        'id': str(uuid.uuid4()),
                        'prompt': f"Type this text (part {i+1}/{min(len(chunks), 20)}):",
                        'content': chunk,
                        'type': 'text',
                        'context': 'PDF Content'
                    })
            
            logger.info(f"Created {len(items)} chunks from large content")
            return items
        
        # For smaller content, try regular extraction methods, but with timeouts
        try:
            # Extract definitions (term-definition pairs)
            items.extend(self._extract_definitions())
            
            # Extract paragraphs for general typing practice
            items.extend(self._extract_paragraphs())
            
            # Extract key concepts based on formatting hints
            items.extend(self._extract_key_concepts())
            
            # Extract lists (numbered or bulleted)
            items.extend(self._extract_lists())
        except Exception as e:
            logger.error(f"Error during item extraction: {str(e)}")
            logger.error(traceback.format_exc())
            # Fall back to simple content
            items = []
        
        # If no items were found or an error occurred, create a simple one with the raw text
        if not items:
            # Split into manageable chunks
            chunks = self._split_into_chunks(self.raw_text, 500)
            for i, chunk in enumerate(chunks[:10]):  # Limit to 10 chunks
                if len(chunk.strip()) > 50:  # Only include meaningful chunks
                    items.append({
                        'id': str(uuid.uuid4()),
                        'prompt': f"Type this text (part {i+1}/{min(len(chunks), 10)}):",
                        'content': chunk,
                        'type': 'text',
                        'context': 'PDF Content'
                    })
        
        # Log extraction time
        end_time = time.time()
        logger.info(f"Item extraction took {end_time - start_time:.2f} seconds, found {len(items)} items")
        
        return items
    
    def _split_into_chunks(self, text, max_length):
        """Split text into chunks of approximately max_length characters, trying to break at paragraph or sentence boundaries"""
        if len(text) <= max_length:
            return [text]
            
        chunks = []
        remaining = text
        
        # Safety counter to prevent infinite loops
        max_iterations = 1000
        iteration = 0
        
        while len(remaining) > 0 and iteration < max_iterations:
            iteration += 1
            
            if len(remaining) <= max_length:
                chunks.append(remaining)
                break
                
            # Try to find a paragraph break
            para_break = remaining.rfind('\n\n', 0, max_length)
            
            if para_break != -1:
                # Found paragraph break
                chunks.append(remaining[:para_break].strip())
                remaining = remaining[para_break:].strip()
            else:
                # Try to find sentence break (period followed by space)
                sentence_break = remaining.rfind('. ', 0, max_length)
                
                if sentence_break != -1 and sentence_break > max_length // 2:
                    # Found good sentence break
                    chunks.append(remaining[:sentence_break+1].strip())
                    remaining = remaining[sentence_break+1:].strip()
                else:
                    # Just break at maximum length
                    chunks.append(remaining[:max_length].strip())
                    remaining = remaining[max_length:].strip()
        
        return chunks
    
    def _extract_definitions(self):
        """Extract term-definition pairs with timeout protection"""
        if not self.raw_text:
            return []
            
        items = []
        
        # Simplified pattern for better performance
        definition_pattern = r'([A-Z][a-zA-Z\s]{2,40})(?::|-)([^\.]+\.)'
        
        try:
            # Limit processing to a reasonable size
            text_to_process = self.raw_text[:30000]
            
            matches = re.findall(definition_pattern, text_to_process)
            
            # Limit the number of definitions to prevent performance issues
            for term, definition in matches[:15]:
                term = term.strip()
                definition = definition.strip()
                
                # Create a study item for term->definition
                if len(term) > 2 and len(definition) > 10:
                    items.append({
                        'id': str(uuid.uuid4()),
                        'prompt': f"Define the term: {term}",
                        'content': definition,
                        'type': 'definition',
                        'context': 'Terminology'
                    })
        except Exception as e:
            logger.error(f"Error extracting definitions: {str(e)}")
        
        return items
    
    def _extract_paragraphs(self):
        """Extract paragraphs for typing practice with performance enhancements"""
        if not self.raw_text:
            return []
            
        items = []
        
        try:
            # Limit processing to a reasonable size
            text_to_process = self.raw_text[:30000]
            
            # Split text into paragraphs
            paragraphs = re.split(r'\n\s*\n', text_to_process)
            
            # Limit the number of paragraphs to prevent performance issues
            paragraph_count = 0
            for paragraph in paragraphs:
                # Skip after processing enough paragraphs
                if paragraph_count >= 10:
                    break
                    
                # Clean up the paragraph
                paragraph = paragraph.strip()
                
                # Skip very short paragraphs or chapter markers
                if len(paragraph) < 50 or len(paragraph.split()) < 10:
                    continue
                
                # Create a study item
                items.append({
                    'id': str(uuid.uuid4()),
                    'prompt': "Type this paragraph:",
                    'content': paragraph,
                    'type': 'paragraph',
                    'context': 'Content'
                })
                
                paragraph_count += 1
        except Exception as e:
            logger.error(f"Error extracting paragraphs: {str(e)}")
        
        return items
    
    def _extract_key_concepts(self):
        """Extract key concepts based on formatting hints with performance enhancements"""
        if not self.raw_text:
            return []
            
        items = []
        
        try:
            # Limit processing to a reasonable size
            text_to_process = self.raw_text[:20000]
            
            # Look for sentences with key indicator phrases
            key_phrases = ["important", "key concept", "remember", "critical", "note that"]
            sentences = re.split(r'\.', text_to_process)
            
            # Limit number of concepts
            concept_count = 0
            for sentence in sentences:
                # Stop after finding enough concepts
                if concept_count >= 5:
                    break
                    
                for phrase in key_phrases:
                    if phrase.lower() in sentence.lower():
                        # Found a potential key concept
                        concept = sentence.strip()
                        if len(concept) > 20:  # Ensure it's meaningful
                            items.append({
                                'id': str(uuid.uuid4()),
                                'prompt': "Type this key concept:",
                                'content': concept,
                                'type': 'key_concept',
                                'context': 'Key Concepts'
                            })
                            concept_count += 1
                            break  # Move to next sentence after finding a concept
        except Exception as e:
            logger.error(f"Error extracting key concepts: {str(e)}")
        
        return items
    
    def _extract_lists(self):
        """Extract numbered or bulleted lists with performance enhancements"""
        if not self.raw_text:
            return []
            
        items = []
        
        try:
            # Limit processing to a reasonable size
            text_to_process = self.raw_text[:20000]
            
            # Match numbered lists (e.g., "1. Item\n2. Item\n3. Item")
            list_pattern = r'((\d+\.\s*[^\n]+\n){2,})'
            matches = re.findall(list_pattern, text_to_process)
            
            # Limit number of lists
            list_count = 0
            for match in matches:
                # Stop after finding enough lists
                if list_count >= 3:
                    break
                    
                list_text = match[0].strip()
                if len(list_text) > 30:  # Ensure it's a meaningful list
                    items.append({
                        'id': str(uuid.uuid4()),
                        'prompt': "Type out this list in order:",
                        'content': list_text,
                        'type': 'list',
                        'context': 'Lists'
                    })
                    list_count += 1
            
            # Match bulleted lists (e.g., "• Item\n• Item\n• Item")
            if list_count < 3:  # Only if we haven't found enough lists already
                list_pattern = r'(([•\-\*]\s*[^\n]+\n){2,})'
                matches = re.findall(list_pattern, text_to_process)
                
                for match in matches:
                    # Stop after finding enough lists
                    if list_count >= 3:
                        break
                        
                    list_text = match[0].strip()
                    if len(list_text) > 30:  # Ensure it's a meaningful list
                        items.append({
                            'id': str(uuid.uuid4()),
                            'prompt': "Type out this list in order:",
                            'content': list_text,
                            'type': 'list',
                            'context': 'Lists'
                        })
                        list_count += 1
        except Exception as e:
            logger.error(f"Error extracting lists: {str(e)}")
        
        return items
    
    @staticmethod
    def get_pdf_support_status():
        """Returns a dictionary with information about PDF support"""
        status = {
            'pymupdf_available': HAS_PYMUPDF,
            'pypdf2_available': HAS_PYPDF2,
            'pdf_support': HAS_PYMUPDF or HAS_PYPDF2,
            'recommended_library': 'PyMuPDF' if HAS_PYMUPDF else 'PyPDF2' if HAS_PYPDF2 else None,
            'system': platform.system(),
            'python_version': platform.python_version(),
        }
        
        if HAS_PYMUPDF:
            try:
                status['pymupdf_version'] = fitz.version
            except:
                status['pymupdf_version'] = "Unknown"
        
        return status