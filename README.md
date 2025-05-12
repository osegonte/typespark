# TypeSpark Study App

A beautiful and functional typing practice application that helps you study content from PDFs while improving your typing skills.

## Features

- Upload and parse PDF documents for study content
- Practice typing with extracted content
- Track progress with WPM and accuracy metrics
- Clean, modern dark-themed UI

## Setup

### Prerequisites

- Python 3.7+ installed
- Node.js 16+ installed
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment:
   ```
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```
   - On Windows:
     ```
     venv\Scripts\activate
     ```

4. Install dependencies:
   ```
   pip install -r ../requirements.txt
   ```

5. Run the backend:
   ```
   python app.py
   ```
   
   The backend will run on http://localhost:5001

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```
   
   The frontend will run on http://localhost:3000

## Using the App

1. Open http://localhost:3000 in your browser
2. Upload a PDF or enter custom text
3. Start typing practice
4. View your typing statistics

## Project Structure

```
typespark/
├── backend/            # Flask API
│   ├── app.py          # Main Flask application
│   ├── pdf_parser.py   # PDF parsing functionality
│   └── uploads/        # Uploaded files directory
├── frontend/           # React UI
│   ├── public/
│   └── src/
│       ├── components/ # Reusable components
│       ├── pages/      # App pages
│       └── services/   # API services
└── requirements.txt    # Python dependencies
```

## Technologies Used

- **Backend**: Flask, PyMuPDF
- **Frontend**: React, Tailwind CSS
- **API Communication**: Axios

## Deployment

For local use, follow the setup instructions above. For production deployment, additional configurations would be needed for proper security and performance.