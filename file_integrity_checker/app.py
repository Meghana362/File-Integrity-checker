from flask import Flask, request, jsonify, render_template
import hashlib
import os
import json
from datetime import datetime

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

# In-memory store (replace with DB for production)
file_registry = {}  # { filename: { original_hash, current_hash, size, status, last_checked } }
alerts = []

# Preload sample data
SAMPLE_FILES = [
    {
        "id": "1",
        "name": "config.yaml",
        "size": "2.4 KB",
        "last_checked": "2026-04-01 09:15:22",
        "status": "safe",
        "original_hash": "a3f2b8c91d4e6f0a7b5c3d2e1f09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
        "current_hash":  "a3f2b8c91d4e6f0a7b5c3d2e1f09a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1",
    },
    {
        "id": "2",
        "name": "database.env",
        "size": "1.1 KB",
        "last_checked": "2026-04-01 09:14:58",
        "status": "modified",
        "original_hash": "e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6",
        "current_hash":  "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    },
    {
        "id": "3",
        "name": "auth_keys.pem",
        "size": "3.2 KB",
        "last_checked": "2026-04-01 09:12:03",
        "status": "safe",
        "original_hash": "f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2",
        "current_hash":  "f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2",
    },
]

SAMPLE_ALERTS = [
    {
        "id": "a1",
        "message": "File integrity compromised — hash mismatch detected",
        "file": "database.env",
        "time": "09:14:58",
    }
]

# Initialize with sample data
scanned_files = list(SAMPLE_FILES)
active_alerts = list(SAMPLE_ALERTS)


def compute_sha256(file_bytes):
    return hashlib.sha256(file_bytes).hexdigest()

def compute_md5(file_bytes):
    return hashlib.md5(file_bytes).hexdigest()

def compute_sha1(file_bytes):
    return hashlib.sha1(file_bytes).hexdigest()

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes/1024:.1f} KB"
    else:
        return f"{size_bytes/(1024*1024):.2f} MB"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/files', methods=['GET'])
def get_files():
    safe = sum(1 for f in scanned_files if f['status'] == 'safe')
    modified = sum(1 for f in scanned_files if f['status'] == 'modified')
    total = len(scanned_files)
    integrity = round((safe / total) * 100) if total > 0 else 100
    return jsonify({
        'files': scanned_files,
        'stats': {
            'total': total,
            'safe': safe,
            'modified': modified,
            'integrity': integrity
        }
    })


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    return jsonify({'alerts': active_alerts})


@app.route('/api/alerts/<alert_id>', methods=['DELETE'])
def dismiss_alert(alert_id):
    global active_alerts
    active_alerts = [a for a in active_alerts if a['id'] != alert_id]
    return jsonify({'success': True})


@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    file_bytes = file.read()
    sha256 = compute_sha256(file_bytes)
    md5    = compute_md5(file_bytes)
    sha1   = compute_sha1(file_bytes)
    size   = format_size(len(file_bytes))
    now    = datetime.now()
    ts     = now.strftime('%Y-%m-%d %H:%M:%S')

    # Check if file already registered — compare hash to detect tampering
    existing = next((f for f in scanned_files if f['name'] == file.filename), None)

    if existing:
        is_modified = existing['original_hash'] != sha256
        existing['current_hash'] = sha256
        existing['last_checked'] = ts
        existing['status'] = 'modified' if is_modified else 'safe'
        existing['size'] = size
        existing['md5'] = md5
        existing['sha1'] = sha1
        entry = existing
    else:
        # New file — register its hash as baseline
        entry = {
            'id': str(int(now.timestamp() * 1000)),
            'name': file.filename,
            'size': size,
            'last_checked': ts,
            'status': 'safe',
            'original_hash': sha256,
            'current_hash': sha256,
            'md5': md5,
            'sha1': sha1,
        }
        scanned_files.insert(0, entry)

    # Generate alert if modified
    if entry['status'] == 'modified':
        new_alert = {
            'id': 'a' + entry['id'],
            'message': 'File integrity compromised — hash mismatch detected',
            'file': file.filename,
            'time': now.strftime('%H:%M:%S'),
        }
        # Avoid duplicate alerts
        if not any(a['file'] == file.filename for a in active_alerts):
            active_alerts.insert(0, new_alert)

    # Save to disk
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    with open(save_path, 'wb') as f:
        f.write(file_bytes)

    safe = sum(1 for f in scanned_files if f['status'] == 'safe')
    modified = sum(1 for f in scanned_files if f['status'] == 'modified')
    total = len(scanned_files)
    integrity = round((safe / total) * 100) if total > 0 else 100

    return jsonify({
        'file': entry,
        'stats': {
            'total': total,
            'safe': safe,
            'modified': modified,
            'integrity': integrity
        },
        'alert_generated': entry['status'] == 'modified'
    })


if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    print("=" * 50)
    print("  File Integrity Checker - Flask Backend")
    print("  Running at: https://meghana362.github.io/File-Integrity-checker/")
    print("=" * 50)
    app.run(debug=True)
