/* ── File Integrity Checker — Frontend JS ── */

const API = {
  files:   '/api/files',
  alerts:  '/api/alerts',
  upload:  '/api/upload',
  dismiss: (id) => `/api/alerts/${id}`,
};

let expandedId = null;

/* ── Fetch & Render ── */

async function loadFiles() {
  const res  = await fetch(API.files);
  const data = await res.json();
  renderStats(data.stats);
  renderTable(data.files);
}

async function loadAlerts() {
  const res  = await fetch(API.alerts);
  const data = await res.json();
  renderAlerts(data.alerts);
}

function renderStats(stats) {
  document.getElementById('statTotal').textContent     = stats.total;
  document.getElementById('statSafe').textContent      = stats.safe;
  document.getElementById('statModified').textContent  = stats.modified;
  document.getElementById('statIntegrity').textContent = stats.integrity + '%';
}

function renderTable(files) {
  const tbody = document.getElementById('fileTableBody');
  const empty = document.getElementById('emptyTable');

  if (!files || files.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = files.map(f => {
    const expanded = expandedId === f.id;
    const isMod    = f.status === 'modified';
    const safeIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg>`;
    const modIcon  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

    const statusBadge = isMod
      ? `<span class="badge modified">${modIcon} MODIFIED</span>`
      : `<span class="badge safe">${safeIcon} SAFE</span>`;

    let hashRow = '';
    if (expanded) {
      const mismatch = f.original_hash !== f.current_hash;
      hashRow = `
        <tr class="hash-expand-row">
          <td colspan="4">
            <div class="hash-block">
              <div class="hash-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                Original SHA-256
                <button class="copy-btn" data-copy="${f.original_hash}">copy</button>
              </div>
              <div class="hash-val">${f.original_hash}</div>
            </div>

            <div class="hash-block" style="margin-top:12px">
              <div class="hash-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="${mismatch ? '#f87171' : '#22c55e'}" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                Current SHA-256
                <button class="copy-btn" data-copy="${f.current_hash}">copy</button>
              </div>
              <div class="hash-val ${mismatch ? 'mismatch' : ''}">${f.current_hash}</div>
            </div>

            ${f.md5 ? `
            <div class="hash-block" style="margin-top:12px">
              <div class="hash-label">MD5 <button class="copy-btn" data-copy="${f.md5}">copy</button></div>
              <div class="hash-val">${f.md5}</div>
            </div>` : ''}

            ${f.sha1 ? `
            <div class="hash-block" style="margin-top:12px">
              <div class="hash-label">SHA-1 <button class="copy-btn" data-copy="${f.sha1}">copy</button></div>
              <div class="hash-val">${f.sha1}</div>
            </div>` : ''}

            ${mismatch ? `<div class="mismatch-warn">⚠ HASH MISMATCH — FILE INTEGRITY COMPROMISED</div>` : ''}
          </td>
        </tr>`;
    }

    return `
      <tr class="file-row" data-id="${f.id}">
        <td><div class="fname">
          <span class="chevron ${expanded ? 'open' : ''}">▶</span>
          ${escHtml(f.name)}
        </div></td>
        <td>${f.size}</td>
        <td>${f.last_checked}</td>
        <td>${statusBadge}</td>
      </tr>
      ${hashRow}`;
  }).join('');

  // Row click toggle
  tbody.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      expandedId = expandedId === id ? null : id;
      const fileRes = fetch(API.files).then(r => r.json()).then(d => renderTable(d.files));
    });
  });

  // Copy buttons
  tbody.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.copy).then(() => {
        btn.textContent = '✓ copied';
        setTimeout(() => (btn.textContent = 'copy'), 1500);
      });
    });
  });
}

function renderAlerts(alerts) {
  const list  = document.getElementById('alertList');
  const badge = document.getElementById('alertBadge');
  badge.textContent = alerts.length;

  if (!alerts || alerts.length === 0) {
    list.innerHTML = '<div class="no-alerts">NO ACTIVE ALERTS</div>';
    return;
  }

  list.innerHTML = alerts.map(a => `
    <div class="alert-item" id="alert-${a.id}">
      <div class="alert-body">
        <div class="alert-msg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
          </svg>
          ${escHtml(a.message)}
        </div>
        <div class="alert-meta">${escHtml(a.file)} &middot; ${a.time}</div>
      </div>
      <button class="dismiss-btn" data-id="${a.id}" title="Dismiss">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.dismiss-btn').forEach(btn => {
    btn.addEventListener('click', () => dismissAlert(btn.dataset.id));
  });
}

async function dismissAlert(id) {
  await fetch(API.dismiss(id), { method: 'DELETE' });
  loadAlerts();
}

/* ── Upload ── */

async function handleUpload(file) {
  const dropContent = document.getElementById('dropContent');
  const uploadMsg   = document.getElementById('uploadMsg');

  // Show scanning state
  dropContent.innerHTML = `
    <div class="scanning-state">
      <div class="spinner"></div>
      <div>COMPUTING SHA-256 HASH...</div>
      <div class="scan-bar"><div class="scan-bar-fill"></div></div>
    </div>`;
  uploadMsg.textContent = '';
  uploadMsg.className   = 'upload-msg';

  const form = new FormData();
  form.append('file', file);

  try {
    const res  = await fetch(API.upload, { method: 'POST', body: form });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    uploadMsg.textContent = data.alert_generated
      ? `⚠ ${file.name} — HASH MISMATCH DETECTED`
      : `✓ ${file.name} scanned — integrity verified`;
    uploadMsg.className = 'upload-msg ' + (data.alert_generated ? 'error' : 'success');

    renderStats(data.stats);
    loadFiles();
    loadAlerts();
  } catch (err) {
    uploadMsg.textContent = '✗ Upload failed: ' + err.message;
    uploadMsg.className   = 'upload-msg error';
  } finally {
    // Restore drop zone
    dropContent.innerHTML = `
      <div class="drop-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <polyline points="12 18 12 12"/>
          <polyline points="9 15 12 12 15 15"/>
        </svg>
      </div>
      <div class="drop-text">Drag &amp; drop a file here, or click to browse</div>
      <button class="choose-btn" id="chooseBtn">Choose File</button>`;
    document.getElementById('chooseBtn').addEventListener('click', () =>
      document.getElementById('fileInput').click()
    );
  }
}

/* ── Event Listeners ── */

document.addEventListener('DOMContentLoaded', () => {
  loadFiles();
  loadAlerts();

  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const chooseBtn = document.getElementById('chooseBtn');

  chooseBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
    e.target.value = '';
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  });
});

/* ── Helpers ── */

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
