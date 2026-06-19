import { S } from './state.js';
import { save, render, getLangSvg, _submitCb } from './app.js';

export /** Business key fields for test cases: same TC number must be allowed across different modules. */
function normalizeTcRowId(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}
export function normalizeTcModule(v) {
  return v === undefined || v === null ? '' : String(v).trim();
}
export function normalizeStatus(v) {
  return v === undefined || v === null ? '' : String(v).trim().toLowerCase();
}
export function applyTheme() {
  document.documentElement.dataset.theme = S.currentTheme;
  localStorage.setItem('theme', S.currentTheme);
}
export function toggleTheme() {
  S.currentTheme = S.currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme();
  render();
}
export function formatDate(dStr) {
  if (!dStr || dStr === '—') return '—';
  let s = String(dStr);
  if (s.endsWith('Z')) {
    const d = new Date(s);
    if (!isNaN(d)) {
      const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      s = istDate.toISOString().slice(0, 19).replace('T', ' ');
    }
  }
  let clean = s.replace('T', ' ').replace(/\.\d{3}Z$/, '');
  const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}${m[4]}`;
  return clean;
}
export function now() {
  const d = new Date();
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().slice(0, 10);
}
export function nowFull() {
  const d = new Date();
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().slice(0, 19).replace('T', ' ');
}
export
// ─────────────────────────── TOAST ───────────────────────────
function toast(msg, type = 'info') {
  const c = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  el.innerHTML = `<span style="color:${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--accent)'}">${icons[type]}</span> ${msg}`;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─────────────────────────── CONFIRM ───────────────────────────
export let _confirmCb = null;
export function openConfirm(title, msg, cb, btnText = 'Delete permanently', btnClass = 'btn-danger', type = 'red') {
  const box = document.querySelector('.confirm-box');
  const titleEl = document.getElementById('confirm-title');
  const iconGreen = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  const iconRed = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: text-bottom; margin-right: 8px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  if (type === 'green') {
    box.style.borderColor = 'var(--green)';
    titleEl.style.color = 'var(--green)';
    titleEl.innerHTML = iconGreen + title;
  } else {
    box.style.borderColor = 'var(--red)';
    titleEl.style.color = 'var(--red)';
    titleEl.innerHTML = iconRed + title;
  }
  document.getElementById('confirm-msg').textContent = msg;
  _confirmCb = cb;
  const confirmBtn = document.getElementById('confirm-ok');
  confirmBtn.textContent = btnText;
  confirmBtn.className = `btn ${btnClass}`;
  document.getElementById('confirm-overlay').classList.add('open');
  confirmBtn.onclick = () => {
    closeConfirm();
    cb();
  };
}
export function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('open');
}
export function upgradeSelects(container) {
  const selects = container.querySelectorAll('select:not([data-customized])');
  selects.forEach(select => {
    select.setAttribute('data-customized', 'true');
    select.style.display = 'none';
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    if (select.classList.contains('filter-select')) wrapper.classList.add('inline');
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);
    const trigger = document.createElement('div');
    // Add classes from select to trigger for visual match
    trigger.className = 'custom-select-trigger ' + select.className.replace('custom-select', '').trim();
    const updateTrigger = () => {
      const selectedOpt = select.options[select.selectedIndex] || select.options[0];
      trigger.innerHTML = `<span>${selectedOpt ? selectedOpt.text : ''}</span><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
    };
    updateTrigger();
    wrapper.appendChild(trigger);
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    const updateOptions = () => {
      optionsList.innerHTML = '';
      Array.from(select.options).forEach((opt, idx) => {
        const div = document.createElement('div');
        div.className = 'custom-select-option' + (select.selectedIndex === idx ? ' selected' : '');
        div.textContent = opt.text;
        div.onclick = e => {
          e.stopPropagation();
          select.selectedIndex = idx;
          updateTrigger();
          optionsList.classList.remove('open');
          wrapper.classList.remove('open');
          Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
          div.classList.add('selected');
          select.dispatchEvent(new Event('change', {
            bubbles: true
          }));
        };
        optionsList.appendChild(div);
      });
    };
    updateOptions();

    // Allow programmatic updates to trigger visual sync
    select.addEventListener('custom-update', () => {
      updateTrigger();
      updateOptions();
    });

    // Setup MutationObserver to watch for dynamic option changes
    const observer = new MutationObserver(updateOptions);
    observer.observe(select, {
      childList: true
    });
    wrapper.appendChild(optionsList);
    if (select.disabled) {
      wrapper.classList.add('disabled');
      trigger.style.opacity = '0.45';
      trigger.style.cursor = 'not-allowed';
    } else {
      trigger.onclick = e => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('open');
        document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
        if (!isOpen) wrapper.classList.add('open');
      };
    }
  });
}
export function buildLoading() {
  const isLight = S.currentTheme === 'light';
  return `
  <div style="flex: 1; width: 100%; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(34,197,94,0.08), transparent 30%), var(--bg);">
    <div class="loader-wrapper">
      <div class="loader-ring"></div>
      <img src="${isLight ? 'assets/draft light.png' : 'assets/draft.png'}" class="loader-image" alt="Loading" />
    </div>
  </div>`;
}
export function navItem(id, icon, label, badge, badgeColor = 'var(--red)') {
  return `<div class="nav-item ${S.view === id ? 'active' : ''}" onclick="nav('${id}')" title="${label}">
    <span class="nav-icon">${icon}</span> <span class="nav-item-label">${label}</span>
    ${badge > 0 ? `<span class="nav-badge" style="background:${badgeColor}">${badge}</span>` : ''}
  </div>`;
}
export function topNavItem(id, label, iconHtml, badge = 0, badgeColor = 'var(--red)') {
  const isActive = S.view === id;
  const badgeHtml = badge > 0 ? `<span style="background:${badgeColor}; color:#fff; border-radius:100px; padding:2px 6px; font-size:10px; margin-left:6px; font-weight:700;">${badge}</span>` : '';
  const iconWrap = iconHtml ? `<span style="display:flex; align-items:center; width:14px; height:14px; margin-right:6px;">${iconHtml.replace('<svg', '<svg width="100%" height="100%"')}</span>` : '';
  return `<div onclick="nav('${id}')" style="cursor:pointer; height:32px; padding:0 16px; border-radius:100px; font-size:13px; font-weight:600; transition:all 0.2s; display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box; ${isActive ? 'background:var(--text); color:var(--bg); box-shadow:0 2px 8px rgba(0,0,0,0.1);' : 'color:var(--text2); background:transparent;'}" onmouseover="if(!${isActive}) { this.style.color='var(--text)'; this.style.background='var(--bg2)'; }" onmouseout="if(!${isActive}) { this.style.color='var(--text2)'; this.style.background='transparent'; }">${iconWrap}${label}${badgeHtml}</div>`;
}
export
// ─────────────────────────── BADGES ───────────────────────────
function statusBadge(s) {
  const m = {
    Pass: 'b-pass',
    Fail: 'b-fail',
    Hold: 'b-hold',
    Retest: 'b-retest',
    Blocked: 'b-blocked',
    Open: 'b-open',
    Fixed: 'b-fixed',
    Verified: 'b-verified',
    'Retest Failed': 'b-retest-fail',
    Escalated: 'b-escalated'
  };
  return `<span class="badge ${m[s] || 'b-blocked'}">${s}</span>`;
}
export function sevBadge(s) {
  const m = {
    High: 'b-high',
    Medium: 'b-medium',
    Low: 'b-low'
  };
  return `<span class="badge ${m[s] || 'b-medium'}">${s}</span>`;
}
export function escHtml(v) {
  return (v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function isHttpUrl(v) {
  return /^https?:\/\//i.test((v || '').trim());
}
export function showBannedModal() {
  const icon = `<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text);"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
  showModal('Access Denied', `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;text-align:center;">
        ${icon}
        <h3 style="margin-top:24px;color:var(--text);">Action Not Allowed</h3>
        <p style="color:var(--text2);margin-top:8px;">Only QA role can perform this action.</p>
      </div>`, null, true);
}
export function showModal(title, body, submitCb, viewOnly = false) {
  _submitCb = submitCb;
  const existing = document.getElementById('app-modal');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'app-modal';
  overlay.innerHTML = `<div class="modal">
    <div class="modal-hdr">
      <div class="modal-title">${title}</div>
      <button class="close-btn" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">${body}</div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">${viewOnly ? 'Close' : 'Cancel'}</button>
      ${!viewOnly ? `<button class="btn btn-ghost" onclick="modalSubmit()">Save</button>` : ''}
    </div>
  </div>`;
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  upgradeSelects(overlay);
}
export function modalSubmit() {
  if (_submitCb) _submitCb();
}
export function closeModal() {
  const m = document.getElementById('app-modal');
  if (m) m.remove();
}
export function nav(v) {
  if (v !== 'automation') {
    S.automationOutput = '';
    S.automationVideo = '';
  }
  S.view = v;
  S._lastHData = null;
  S._lastWPData = null;
  save();
}

// ─── INIT ───
export function viewScriptModal(tcId, module) {
  const scriptObj = S.automationScripts.find(s => s.testCaseId == tcId && s.module === module);
  if (!scriptObj) return;
  const modalHtml = `
        <div id="script-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px);">
          <div style="background:var(--bg2); width:800px; max-width:90%; border-radius:12px; box-shadow:0 20px 60px rgba(0,0,0,0.2); border:1px solid var(--border); overflow:hidden; display:flex; flex-direction:column; max-height:80vh;">
            <div style="padding:16px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:var(--bg3);">
              <div style="font-weight:600; font-size:16px; color:var(--text); display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Automation Script - ${tcId}
                <span style="font-size:12px; font-weight:normal; margin-left:8px; display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:12px; background:var(--bg3); color:var(--text2);">${getLangSvg(scriptObj.language)} ${scriptObj.language === 'python' ? 'Python' : scriptObj.language === 'javascript' ? 'JavaScript' : 'Java'}</span>
              </div>
              <button class="btn btn-ghost" onclick="document.getElementById('script-modal').remove()" style="padding:6px; border-radius:50%;"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div style="padding:24px; overflow:auto; background:var(--bg);">
              <div style="margin-bottom:16px; display:flex; gap:12px; align-items:center;">
                <span style="font-size:12px; font-weight:600; color:var(--text3); text-transform:uppercase;">Language:</span>
                <span style="font-size:13px; font-weight:600; color:var(--text2); background:var(--bg3); padding:4px 10px; border-radius:12px; display:inline-flex; align-items:center;">${getLangSvg(scriptObj.language)}${scriptObj.language === 'python' ? 'Python' : scriptObj.language === 'javascript' ? 'JavaScript' : 'Java'}</span>
              </div>
              <pre style="background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:16px; overflow:auto; font-size:13px; color:var(--text); line-height:1.5;"><code>${scriptObj.script.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
            </div>
          </div>
        </div>
      `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}