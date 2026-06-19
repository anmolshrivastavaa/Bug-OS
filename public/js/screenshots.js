import { toast, escHtml, isHttpUrl } from './utils.js';

export function isImageEvidence(v) {
  const ev = (v || '').trim();
  return /^data:image\//i.test(ev) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(ev);
}
export function renderEvidenceCell(evidence) {
  const ev = (evidence || '').trim();
  if (!ev) return '—';
  if (/^data:image\//i.test(ev)) {
    return `<a href="${ev}" target="_blank" rel="noopener noreferrer" title="Open attached image" style="display:inline-block;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><img src="${ev}" alt="Evidence" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--border);border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.05);"></a>`;
  }
  if (isHttpUrl(ev)) {
    const safe = escHtml(ev);
    const isImg = isImageEvidence(ev);
    const text = isImg ? 'Image' : 'Link';
    const icon = isImg ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>` : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="table-link-pill">${icon} ${text}</a>`;
  }
  return `<span style="color:var(--text2);">${escHtml(ev)}</span>`;
}
export function renderEvidencePreview(previewId, evidence) {
  const container = document.getElementById(previewId);
  if (!container) return;
  const ev = (evidence || '').trim();
  if (!ev) {
    container.innerHTML = '';
    return;
  }
  if (/^data:image\//i.test(ev) || isHttpUrl(ev) && isImageEvidence(ev)) {
    const safe = /^data:image\//i.test(ev) ? ev : escHtml(ev);
    container.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;"><img src="${safe}" alt="Evidence preview" style="max-width:160px;max-height:100px;object-fit:cover;border:1px solid var(--border2);border-radius:4px;"></a>`;
    return;
  }
  if (isHttpUrl(ev)) {
    const safe = escHtml(ev);
    container.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--text);text-decoration:none;">Open evidence link</a>`;
    return;
  }
  container.innerHTML = `<div style="font-size:12px;color:var(--text3);">${escHtml(ev)}</div>`;
}
export function handleEvidenceUpload(inputEl, textInputId, hiddenInputId, previewId) {
  const file = inputEl && inputEl.files && inputEl.files[0];
  if (!file) return;
  if (!/^image\//i.test(file.type || '')) {
    toast('Please upload an image file for evidence', 'error');
    inputEl.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e && e.target && e.target.result || '';
    const hidden = document.getElementById(hiddenInputId);
    const text = document.getElementById(textInputId);
    if (hidden) hidden.value = dataUrl;
    if (text) text.value = file.name;
    renderEvidencePreview(previewId, dataUrl);
  };
  reader.readAsDataURL(file);
}
export function onEvidenceTextChange(textInputId, hiddenInputId, previewId) {
  const text = document.getElementById(textInputId);
  const hidden = document.getElementById(hiddenInputId);
  const txt = text && text.value ? text.value.trim() : '';
  if (hidden) hidden.value = '';
  renderEvidencePreview(previewId, txt);
}

// ─────────────────────────── MODALS ───────────────────────────