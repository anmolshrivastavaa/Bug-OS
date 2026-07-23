import { socket } from './api.js';
import { formatDate, openConfirm, showModal, toast } from './utils.js';
import { render } from './app.js';

let uploads = [];
let currentPage = 1;
let totalPages = 1;
let searchQuery = '';
let isInitializing = false;

export async function fetchUploads(page = 1, search = '') {
  try {
    const res = await fetch(`/api/uploads?page=${page}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    if (data.success) {
      uploads = data.data;
      currentPage = data.page;
      totalPages = data.pages;
      render();
    }
  } catch (err) {
    console.error('Failed to fetch uploads:', err);
    toast('Error fetching uploads', 'error');
  }
}

let searchTimeout;
export function searchUploads(q) {
  searchQuery = q;
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchUploads(1, searchQuery);
  }, 300);
}

export function changeUploadPage(page) {
  if (page >= 1 && page <= totalPages) {
    fetchUploads(page, searchQuery);
  }
}

export async function deleteUpload(id) {
  openConfirm('Delete Upload', 'Are you sure you want to delete this file? This cannot be undone.', async () => {
    try {
      const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast('Upload deleted', 'success');
        fetchUploads(currentPage, searchQuery);
      } else {
        toast(data.error || 'Delete failed', 'error');
      }
    } catch (err) {
      toast('Error deleting upload', 'error');
    }
  });
}

export async function viewUpload(id) {
  try {
    const res = await fetch(`/api/uploads/${id}`);
    const data = await res.json();
    if (data.success) {
      const doc = data.data;
      const body = `
        <div style="font-size:14px; color:var(--text2);">
          <p><strong>Filename:</strong> ${doc.filename}</p>
          <p><strong>Uploaded At:</strong> ${formatDate(doc.uploadedAt)}</p>
          <p><strong>Size:</strong> ${(doc.size / 1024).toFixed(2)} KB</p>
          <p><strong>MIME Type:</strong> ${doc.mimeType}</p>
          <p><strong>IP Address:</strong> ${doc.requestIp || 'N/A'}</p>
          <p style="margin-top:16px;">
            <a href="${doc.cloudinaryUrl}" target="_blank" class="btn btn-primary">Open File in Browser</a>
            <a href="/api/uploads/${doc._id}/download" class="btn btn-ghost" target="_blank">Download File</a>
          </p>
        </div>
      `;
      showModal('Upload Details', body);
    } else {
      toast('Failed to load metadata', 'error');
    }
  } catch(err) {
    toast('Error loading metadata', 'error');
  }
}

// Socket event listeners
socket.on('newTransformationUpload', (newUpload) => {
  toast(`New Transformation Upload: ${newUpload.filename}`, 'success');
  if (currentPage === 1 && !searchQuery) {
    uploads.unshift(newUpload);
    if (uploads.length > 50) uploads.pop();
    render();
  }
});

socket.on('deletedTransformationUpload', (id) => {
  uploads = uploads.filter(u => u._id !== id);
  render();
});

// Initialization hook
export function initUploads() {
  fetchUploads(1, '');
}

export function buildUploads() {
  if (uploads.length === 0 && !searchQuery && currentPage === 1) {
    // maybe we just haven't fetched yet
    if (!isInitializing) {
      isInitializing = true;
      setTimeout(initUploads, 0);
    }
  }

  const rows = uploads.map(u => `
    <tr>
      <td class="td-truncate">${u.filename}</td>
      <td>${formatDate(u.uploadedAt)}</td>
      <td>${(u.size / 1024).toFixed(2)} KB</td>
      <td>
        <div style="display:flex; gap:6px; align-items:center;">
          <button class="btn btn-ghost btn-sm" onclick="window.uploadsModule.viewUpload('${u._id}')">View</button>
          <a class="btn btn-primary btn-sm" href="/api/uploads/${u._id}/download" target="_blank">Download</a>
          <button class="btn btn-danger btn-sm" onclick="window.uploadsModule.deleteUpload('${u._id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  const tableHtml = uploads.length === 0 
    ? `<div style="text-align:center; padding:40px; color:var(--text2);">No uploads found.</div>`
    : `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Uploaded Time</th>
              <th>Size</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;

  const paginationHtml = totalPages > 1 ? `
    <div style="display:flex; justify-content:center; gap:8px; margin-top:16px;">
      <button class="btn btn-ghost btn-sm" onclick="window.uploadsModule.changeUploadPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
      <span style="font-size:14px; display:flex; align-items:center;">Page ${currentPage} of ${totalPages}</span>
      <button class="btn btn-ghost btn-sm" onclick="window.uploadsModule.changeUploadPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
    </div>
  ` : '';

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div style="font-size:28px;font-weight:700;color:var(--text);">Transformation Uploads</div>
      <div style="display:flex; align-items:center; gap:16px;">
        <div class="search-box">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="uploadSearch" placeholder="Search filename..." value="${searchQuery}" oninput="window.uploadsModule.searchUploads(this.value)">
        </div>
      </div>
    </div>
    ${tableHtml}
    ${paginationHtml}
  `;
}
