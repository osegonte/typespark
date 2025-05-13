"""
PDF parser module for TypeSpark with improved version compatibility.
This version works with both PyMuPDF (any available version) and PyPDF2 as fallback.
"""

import os
import re
import uuid
import platform
import logging

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
    """Parser to extract study content from PDFs with improved version compatibility"""
    
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.raw_text = ""
        logger.info(f"Initializing PDF parser for: {pdf_path}")
        
        # Check if file exists
        if not os.path.exists(self.pdf_path):
            logger.error(f"File not found: {self.pdf_path}")
    
    def extract_text(self):
        """Extract all text from the PDF, handling different PDF libraries"""
        if not os.path.exists(self.pdf_path):
            logger.error(f"File not found: {self.pdf_path}")
            return self
            
        try:
            if HAS_PYMUPDF:
                logger.info("Extracting text with PyMuPDF")
                # Use PyMuPDF if available
                with fitz.open(self.pdf_path) as doc:
                    # Extract text from each page
                    for page in doc:
                        page_text = page.get_text("text")
                        self.raw_text += page_text
                        
                    logger.info(f"Extracted {len(self.raw_text)} characters with PyMuPDF")
            elif HAS_PYPDF2:
                logger.info("Extracting text with PyPDF2")
                # Use PyPDF2 as fallback
                with open(self.pdf_path, 'rb') as file:
                    reader = PdfReader(file)
                    for page in reader.pages:
                        self.raw_text += page.extract_text() + "\n\n"
                        
                    logger.info(f"Extracted {len(self.raw_text)} characters with PyPDF2")
            else:
                # No PDF library available
                self.raw_text = "PDF SUPPORT NOT AVAILABLE. Please install PyMuPDF or PyPDF2."
                logger.error("No PDF parsing library available. Install PyMuPDF or PyPDF2.")
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            self.raw_text = f"ERROR EXTRACTING TEXT: {str(e)}"
        
        return self
    
    def extract_items(self):
        """Process PDF and extract study items"""
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
            
        # Extract definitions (Term - Definition or Term: Definition)
        items.extend(self._extract_definitions())
        
        # Extract paragraphs for general typing practice
        items.extend(self._extract_paragraphs())
        
        # Extract key concepts based on formatting hints
        items.extend(self._extract_key_concepts())
        
        # Extract lists (numbered or bulleted)
        items.extend(self._extract_lists())
        
        # If no items were found, create a simple one with the raw text
        if not items and self.raw_text:
            # Split into manageable chunks if text is long
            if len(self.raw_text) > 500:
                chunks = self._split_into_chunks(self.raw_text, 500)
                for i, chunk in enumerate(chunks):
                    items.append({
                        'id': str(uuid.uuid4()),
                        'prompt': f"Type this text (part {i+1}/{len(chunks)}):",
                        'content': chunk,
                        'type': 'text',
                        'context': 'PDF Content'
                    })
            else:
                items.append({
                    'id': str(uuid.uuid4()),
                    'prompt': "Type this text:",
                    'content': self.raw_text,
                    'type': 'text',
                    'context': 'PDF Content'
                })
        
        logger.info(f"Extracted {len(items)} study items from PDF")
        return items
    
    def _split_into_chunks(self, text, max_length):
        """Split text into chunks of approximately max_length characters, trying to break at paragraph or sentence boundaries"""
        if len(text) <= max_length:
            return [text]
            
        chunks = []
        remaining = text
        
        while len(remaining) > 0:
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
        """Extract term-definition pairs"""
        if not self.raw_text:
            return []
            
        items = []
        
        # Patterns for definitions (Term: Definition or Term - Definition)
        definition_patterns = [
            r'([A-Z][a-zA-Z\s]{2,40}):([^\.]+\.)',
            r'([A-Z][a-zA-Z\s]{2,40})\s-\s([^\.]+\.)'
        ]
        
        for pattern in definition_patterns:
            matches = re.findall(pattern, self.raw_text)
            
            for term, definition in matches:
                term = term.strip()
                definition = definition.strip()
                
                # Create a study item for term->definition
                items.append({
                    'id': str(uuid.uuid4()),
                    'prompt': f"Define the term: {term}",
                    'content': definition,
                    'type': 'definition',
                    'context': 'Terminology'
                })
        
        return items
    
    def _extract_paragraphs(self):
        """Extract paragraphs for typing practice"""
        if not self.raw_text:
            return []
            
        items = []
        
        # Split text into paragraphs
        paragraphs = re.split(r'\n\s*\n', self.raw_text)
        
        for paragraph in paragraphs:
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
        
        return items
    
    def _extract_key_concepts(self):
        """Extract key concepts based on formatting hints"""
        if not self.raw_text:
            return []
            
        items = []
        
        # Look for sentences with key indicator phrases
        key_phrases = ["important", "key concept", "remember", "critical", "note that"]
        sentences = re.split(r'\.', self.raw_text)
        
        for sentence in sentences:
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
        
        return items
    
    def _extract_lists(self):
        """Extract numbered or bulleted lists"""
        if not self.raw_text:
            return []
            
        items = []
        
        # Match numbered lists (e.g., "1. Item\n2. Item\n3. Item")
        list_pattern = r'((\d+\.\s*[^\n]+\n){2,})'
        matches = re.findall(list_pattern, self.raw_text)
        
        for match in matches:
            list_text = match[0].strip()
            if len(list_text) > 30:  # Ensure it's a meaningful list
                items.append({
                    'id': str(uuid.uuid4()),
                    'prompt': "Type out this list in order:",
                    'content': list_text,
                    'type': 'list',
                    'context': 'Lists'
                })
        
        # Match bulleted lists (e.g., "• Item\n• Item\n• Item")
        list_pattern = r'(([•\-\*]\s*[^\n]+\n){2,})'
        matches = re.findall(list_pattern, self.raw_text)
        
        for match in matches:
            list_text = match[0].strip()
            if len(list_text) > 30:  # Ensure it's a meaningful list
                items.append({
                    'id': str(uuid.uuid4()),
                    'prompt': "Type out this list in order:",
                    'content': list_text,
                    'type': 'list',
                    'context': 'Lists'
                })
        
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
            status['pymupdf_version'] = fitz.version
        
        return status