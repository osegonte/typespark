# Try to import PyMuPDF
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("PyMuPDF not available. Using simplified PDF parser.")
    
    # Try to import PyPDF2 as a fallback
    try:
        from PyPDF2 import PdfReader
        HAS_PYPDF2 = True
    except ImportError:
        HAS_PYPDF2 = False

import re
import uuid
import os

class PDFParser:
    """Parser to extract study content from PDFs"""
    
    def __init__(self, pdf_path):
        self.pdf_path = pdf_path
        self.raw_text = ""
    
    def extract_text(self):
        """Extract all text from the PDF"""
        if not os.path.exists(self.pdf_path):
            print(f"File not found: {self.pdf_path}")
            return self
            
        try:
            if HAS_PYMUPDF:
                # Use PyMuPDF if available
                with fitz.open(self.pdf_path) as doc:
                    # Extract text from each page
                    for page in doc:
                        self.raw_text += page.get_text("text")
            elif HAS_PYPDF2:
                # Use PyPDF2 as fallback
                with open(self.pdf_path, 'rb') as file:
                    reader = PdfReader(file)
                    for page in reader.pages:
                        self.raw_text += page.extract_text() + "\n\n"
            else:
                # No PDF library available
                self.raw_text = "PDF SUPPORT NOT AVAILABLE. Please install PyMuPDF or PyPDF2."
                print("No PDF parsing library available. Install PyMuPDF or PyPDF2.")
        except Exception as e:
            print(f"Error extracting text from PDF: {str(e)}")
        
        return self
    
    def extract_items(self):
        """Process PDF and extract study items"""
        # Extract text if not already done
        if not self.raw_text:
            self.extract_text()
            
        items = []
        
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
            items.append({
                'id': str(uuid.uuid4()),
                'prompt': "Type this text:",
                'content': self.raw_text[:500],  # Limit to first 500 chars
                'type': 'text',
                'context': 'PDF Content'
            })
        
        return items
    
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