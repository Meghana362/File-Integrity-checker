# File Integrity Checker
A Flask-based security dashboard for monitoring file integrity using SHA-256, MD5, and SHA-1 hashing.

## Project Structure
```
file_integrity_checker/
├── app.py                  ← Flask backend (Python)
├── requirements.txt        ← Python dependencies
├── uploads/                ← Uploaded files stored here (auto-created)
├── templates/
│   └── index.html          ← HTML frontend
└── static/
    ├── css/
    │   └── style.css       ← Stylesheet
    └── js/
        └── app.js          ← Frontend JavaScript
```

## How to Run

### Step 1 — Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 2 — Run the Flask server
```bash
python app.py
```

### Step 3 — Open in browser
```
http://127.0.0.1:5000
```

## Features
- Real SHA-256 (+ MD5, SHA-1) hashing computed on the **Python backend**
- Upload any file via drag & drop or file picker
- Re-upload a file to detect tampering (hash mismatch = MODIFIED)
- Expandable rows showing Original vs Current hash
- Copy-to-clipboard for any hash value
- Dismissible security alerts panel
- Live stats: Total Files, Safe, Modified, Integrity %
- Sample data pre-loaded on first run
