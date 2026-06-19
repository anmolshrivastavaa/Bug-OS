import { socket } from './api.js';
import { normalizeStatus, formatDate, now, toast, openConfirm, statusBadge, sevBadge, showModal, closeModal } from './utils.js';
import { testcaseKeysMatch } from './testcases.js';
import { S } from './state.js';
import { save, textMatchesQuery, liveFilter, render, switchEscTab, generateUniqueBugId } from './app.js';
import { audit } from './auth.js';
import { renderEvidenceCell } from './screenshots.js';

export function buildEscalations() {
  S.escTab = S.escTab || 'all';
  const tabStyle = isActive => isActive ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);` : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
  const escModF = (document.getElementById('escModF') || {
    value: ''
  }).value;
  const escSevF = (document.getElementById('escSevF') || {
    value: ''
  }).value;
  const escDevF = (document.getElementById('escDevF') || {
    value: ''
  }).value;
  const escQ = (document.getElementById('escQ') || {
    value: ''
  }).value.toLowerCase();
  const getDev = b => {
    if (b.escalatedTo) return b.escalatedTo;
    if (b.history) {
      const escEvents = b.history.filter(h => h.event && h.event.startsWith('Escalated to '));
      if (escEvents.length > 0) {
        const last = escEvents[escEvents.length - 1];
        const match = last.event.match(/^Escalated to (.*?)\. Reason:/);
        if (match && match[1] !== 'Backend') return match[1];
      }
    }
    return null;
  };
  let bugs = S.bugs.filter(b => b.status === 'Escalated');
  if (S.escTab === 'my' && S.role === 'dev') {
    bugs = bugs.filter(b => getDev(b) === S.auth.user);
  }
  const tabTotal = bugs.length;
  if (escDevF && S.role === 'admin') {
    bugs = bugs.filter(b => getDev(b) === escDevF);
  }
  if (escModF) bugs = bugs.filter(b => b.module === escModF);
  if (escSevF) bugs = bugs.filter(b => b.severity === escSevF);
  if (escQ) {
    bugs = bugs.filter(b => {
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
        id: b.tcId,
        module: b.module
      }));
      return [b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.escalationReason, b.devNotes, linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes].some(v => textMatchesQuery(v, escQ));
    });
  }
  const modOpts = S.modules.map(m => `<option value="${m}"${escModF === m ? ' selected' : ''}>${m}</option>`).join('');
  const devUsers = S.users.filter(u => u.role === 'dev');
  const escDevOpts = devUsers.map(u => `<option value="${u.username}"${escDevF === u.username ? ' selected' : ''}>${u.username}</option>`).join('');
  const isDev = S.role === 'dev';
  const rows = bugs.map(b => {
    const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
      id: b.tcId,
      module: b.module
    }));
    let actions = `<button class="btn btn-ghost btn-sm" onclick="viewBug('${b.id}')">View Details</button>`;
    return `<tr>
      <td class="td-id">${b.id}</td>
      <td class="td-id">${b.tcId}</td>
      <td><div class="td-title">${b.testCase}</div></td>
      <td class="td-truncate">${linkedTc?.scenario || '—'}</td>
      <td>${b.module}</td>
      <td>${b.screen || '—'}</td>
      <td class="td-truncate">${linkedTc?.steps || '—'}</td>
      <td class="td-truncate">${linkedTc?.expected || '—'}</td>
      <td class="td-truncate">${linkedTc?.actual || '—'}</td>
      <td>${statusBadge(b.status)}</td>
      <td>${sevBadge(b.severity)}</td>

      <td><div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">
        ${actions}
        ${isDev ? `<button class="btn btn-success btn-sm" onclick="markFixed('${b.id}')">Mark Fixed</button>` : ''}
      </div></td>
    </tr>`;
  }).join('');
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Backend Escalations</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div onclick="switchEscTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.escTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.escTab === 'all' ? '1' : '0.8'}'">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
      All Backend Bugs
    </div>
    ${S.role === 'dev' ? `
    <div onclick="switchEscTab('my')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.escTab === 'my')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.escTab === 'my' ? '1' : '0.8'}'">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      My Backend Bugs
    </div>
    ` : ''}
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">${S.escTab === 'my' ? 'My Backend Bugs' : 'Backend Escalations'}</div><div class="section-meta">${bugs.length} Shown · ${tabTotal} Total</div></div>
      <div style="font-size:12px;color:var(--text);position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;">${isDev ? 'Escalated by Frontend Team' : 'Waiting for Backend Team to resolve'}</div>
      <div class="filters">
        ${S.role === 'admin' ? `
        <select class="filter-select${escDevF ? ' filter-active' : ''}" id="escDevF" onchange="render()">
          <option value="">All Dev Users</option>${escDevOpts}
        </select>
        ` : ''}
        <select class="filter-select${escModF ? ' filter-active' : ''}" id="escModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select${escSevF ? ' filter-active' : ''}" id="escSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${escSevF === 'High' ? ' selected' : ''}>High</option>
          <option${escSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${escSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select${escQ ? ' filter-active' : ''}" id="escQ" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search escalations..." value="${escQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    ${bugs.length === 0 ? S.bugs.filter(b => b.status === 'Escalated').length > 0 ? `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>No escalated bugs matches filters</div>` : `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>No escalations. All bugs are frontend-resolvable!</div>` : `<div class="tbl-wrap scrollable"><table>
          <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
  </div>`;
}

// ─────────────────────────── MODULE-WISE TRACKER ───────────────────────────
export
// ─────────────────────────── BUGS ───────────────────────────
function buildBugs() {
  const bugModF = (document.getElementById('bugModF') || {
    value: ''
  }).value;
  const bugStF = (document.getElementById('bugStF') || {
    value: ''
  }).value;
  const bugTcStF = (document.getElementById('bugTcStF') || {
    value: ''
  }).value;
  const bugSevF = (document.getElementById('bugSevF') || {
    value: ''
  }).value;
  const bugQ = (document.getElementById('bugQ') || {
    value: ''
  }).value.toLowerCase();
  let data = [...S.bugs];
  data = data.filter(b => b.status !== 'Verified');
  if (bugModF) data = data.filter(b => b.module === bugModF);
  if (bugStF) data = data.filter(b => b.status === bugStF);
  if (bugTcStF) data = data.filter(b => {
    const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
      id: b.tcId,
      module: b.module
    }));
    return linkedTc?.status === bugTcStF;
  });
  if (bugSevF) data = data.filter(b => b.severity === bugSevF);
  if (bugQ) {
    data = data.filter(b => {
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
        id: b.tcId,
        module: b.module
      }));
      return [b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes, b.escalationReason, linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes, linkedTc?.evidence].some(v => textMatchesQuery(v, bugQ));
    });
  }
  const modOpts = S.modules.map(m => `<option value="${m}"${bugModF === m ? ' selected' : ''}>${m}</option>`).join('');
  const rows = data.map(b => {
    const isQA = S.role === 'qa';
    const isDev = S.role === 'dev';
    const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
      id: b.tcId,
      module: b.module
    }));
    let actions = `<button class="btn btn-ghost btn-sm" onclick="viewBug('${b.id}')">View</button>`;
    if (isDev && (b.status === 'Open' || b.status === 'Retest Failed')) {
      actions += ` <button class="btn btn-success btn-sm" data-id="${b.id}" onclick="markFixed(this.dataset.id)">Mark Fixed</button>`;
      actions += ` <button class="btn btn-sm" style="background:var(--purple-bg);color:var(--purple);border:1px solid var(--purple-border);" data-id="${b.id}" onclick="escalateBug(this.dataset.id)">Escalate</button>`;
    }
    if (isQA) actions += ` <button class="btn btn-danger btn-sm" data-id="${b.id}" onclick="deleteBug(this.dataset.id)">Delete</button>`;
    return `<tr>
      <td class="td-id">${b.id}</td>
      <td class="td-id">${b.tcId}</td>
      <td><div class="td-title">${b.testCase}</div></td>
      <td class="td-truncate">${linkedTc?.scenario || '—'}</td>
      <td>${b.module}</td>
      <td>${b.screen || '—'}</td>
      <td class="td-truncate">${linkedTc?.steps || '—'}</td>
      <td class="td-truncate">${linkedTc?.expected || '—'}</td>
      <td class="td-truncate">${linkedTc?.actual || '—'}</td>
      <td>${statusBadge(b.status)}</td>
      <td>${statusBadge(linkedTc?.status)}</td>
      <td>${sevBadge(b.severity)}</td>
      <td class="td-truncate">${renderEvidenceCell(linkedTc?.evidence)}</td><td class="td-truncate">${renderEvidenceCell(linkedTc?.evidence2)}</td>
      <td class="td-truncate">${linkedTc?.notes || '—'}</td>
      <td><div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">${actions}</div></td>
    </tr>`;
  }).join('');
  const openCount = S.bugs.filter(b => b.status === 'Open' || b.status === 'Retest Failed' || b.status === 'Escalated').length;
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Bug Reports</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>
      All Bug Reports
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Bug Reports</div><div class="section-meta">${data.length} Shown </div></div>
      <div class="filters">
        <select class="filter-select${bugModF ? ' filter-active' : ''}" id="bugModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select${bugStF ? ' filter-active' : ''}" id="bugStF" onchange="render()">
          <option value="">All Bug Status</option>
          <option${bugStF === 'Open' ? ' selected' : ''}>Open</option>
          <option${bugStF === 'Escalated' ? ' selected' : ''}>Escalated</option>
          <option${bugStF === 'Fixed' ? ' selected' : ''}>Fixed</option>
        </select>
        <select class="filter-select${bugTcStF ? ' filter-active' : ''}" id="bugTcStF" onchange="render()">
          <option value="">All Test Status</option>
          
          <option${bugTcStF === 'Fail' ? ' selected' : ''}>Fail</option>
          <option${bugTcStF === 'Hold' ? ' selected' : ''}>Hold</option>
        </select>
        <select class="filter-select${bugSevF ? ' filter-active' : ''}" id="bugSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${bugSevF === 'High' ? ' selected' : ''}>High</option>
          <option${bugSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${bugSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="bugQ" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search bug reports..." value="${bugQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Bug Status</th><th>Status</th><th>Severity</th><th>Evidence-1</th><th>Evidence-2</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="15" class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg></div>No bugs matches filters</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

// ─────────────────────────── RETEST QUEUE ───────────────────────────
export function switchRetestTab(tabId) {
  S.retestTab = tabId;
  render();
}
export function buildRetest() {
  S.retestTab = S.retestTab || 'all';
  const tabStyle = isActive => isActive ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);` : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
  const rtModF = (document.getElementById('rtModF') || {
    value: ''
  }).value;
  const rtSevF = (document.getElementById('rtSevF') || {
    value: ''
  }).value;
  const rtQaF = (document.getElementById('rtQaF') || {
    value: ''
  }).value;
  const rtQ = (document.getElementById('rtQ') || {
    value: ''
  }).value.toLowerCase();
  let bugs = S.bugs.filter(b => normalizeStatus(b.status) === 'fixed');
  if (S.retestTab === 'my' && S.role === 'qa') {
    bugs = bugs.filter(b => {
      const isBugCreator = b.history && b.history.length > 0 && b.history[0].actor === S.auth.user;
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
        id: b.tcId,
        module: b.module
      }));
      const isTcCreator = linkedTc && linkedTc.createdBy === S.auth.user;
      return isBugCreator || isTcCreator;
    });
  }
  const tabTotal = bugs.length;
  if (rtQaF && S.role === 'admin') {
    bugs = bugs.filter(b => {
      const isBugCreator = b.history && b.history.length > 0 && b.history[0].actor === rtQaF;
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
        id: b.tcId,
        module: b.module
      }));
      const isTcCreator = linkedTc && linkedTc.createdBy === rtQaF;
      return isBugCreator || isTcCreator;
    });
  }
  if (rtModF) bugs = bugs.filter(b => b.module === rtModF);
  if (rtSevF) bugs = bugs.filter(b => b.severity === rtSevF);
  if (rtQ) {
    bugs = bugs.filter(b => {
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
        id: b.tcId,
        module: b.module
      }));
      return [b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes, linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes, linkedTc?.evidence].some(v => textMatchesQuery(v, rtQ));
    });
  }
  const rtModOpts = S.modules.map(m => `<option value="${m}"${rtModF === m ? ' selected' : ''}>${m}</option>`).join('');
  const qaUsers = S.users.filter(u => u.role === 'qa');
  const rtQaOpts = qaUsers.map(u => `<option value="${u.username}"${rtQaF === u.username ? ' selected' : ''}>${u.username}</option>`).join('');
  const rows = bugs.map(b => {
    const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
      id: b.tcId,
      module: b.module
    }));
    return `<tr>
      <td class="td-id">${b.id}</td>
      <td class="td-id">${b.tcId}</td>
      <td><div class="td-title">${b.testCase}</div></td>
      <td class="td-truncate">${linkedTc?.scenario || '—'}</td>
      <td>${b.module}</td>
      <td>${b.screen || '—'}</td>
      <td class="td-truncate">${linkedTc?.steps || '—'}</td>
      <td class="td-truncate">${linkedTc?.expected || '—'}</td>
      <td class="td-truncate">${linkedTc?.actual || '—'}</td>
      <td>${statusBadge(b.status)}</td>
      <td>${sevBadge(b.severity)}</td>
      <td>
        <div style="display:flex; gap:6px; align-items:center; min-width:max-content;">
          <button class="btn btn-ghost btn-sm" onclick="viewBug('${b.id}')" style="white-space:nowrap;">View Details</button>
          ${S.role === 'qa' ? `
          <button class="btn btn-success btn-sm" onclick="retestPass('${b.id}')">Pass ✓ </button>
          <button class="btn btn-danger btn-sm" onclick="retestFail('${b.id}')">Fail ✕ </button>
          ` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Retest Queue</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div onclick="switchRetestTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.retestTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.retestTab === 'all' ? '1' : '0.8'}'">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      All Retest Queue
    </div>
    ${S.role === 'qa' ? `
    <div onclick="switchRetestTab('my')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.retestTab === 'my')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.retestTab === 'my' ? '1' : '0.8'}'">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
      My Retest Queue
    </div>
    ` : ''}
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">${S.retestTab === 'my' ? 'My Retest Queue' : 'Retest Queue'}</div><div class="section-meta">${bugs.length} Shown · ${tabTotal} Total</div></div>
      <div style="font-size:12px;color:var(--text);position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;">Dev has marked these as fixed</div>
      <div class="filters">
        ${S.role === 'admin' ? `
        <select class="filter-select" id="rtQaF" onchange="render()">
          <option value="">All QA Users</option>${rtQaOpts}
        </select>
        ` : ''}
        <select class="filter-select" id="rtModF" onchange="render()">
          <option value="">All Modules</option>${rtModOpts}
        </select>
        <select class="filter-select" id="rtSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${rtSevF === 'High' ? ' selected' : ''}>High</option>
          <option${rtSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${rtSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="rtQ" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search retest queue..." value="${rtQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    ${bugs.length === 0 ? S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length > 0 ? `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>No bugs marked as fixed matches filters</div>` : `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>No bugs awaiting retest. All clear!</div>` : `
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>ACTIONS</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`}
  </div>`;
}

// ─────────────────────────── AUTOMATION ───────────────────────────
export function autoCreateBug(tc) {
  const bugId = generateUniqueBugId();
  const bug = {
    id: bugId,
    tcId: tc.id,
    testCase: tc.testCase,
    module: tc.module,
    screen: tc.screen,
    severity: tc.severity,
    status: 'Open',
    failedAt: now(),
    fixedAt: null,
    retestAt: null,
    devNotes: '',
    retestResult: null,
    retestCount: 0,
    history: [{
      date: now(),
      event: `Bug auto-created from failed test case ${tc.id}`,
      actor: S.auth.user
    }]
  };
  S.bugs.push(bug);

  // Send bug update to server
  socket.emit('updateData', {
    type: 'bug',
    data: bug
  });
  socket.emit('updateData', {
    type: 'counters',
    data: {
      tcCounter: S.tcCounter,
      bugCounter: S.bugCounter
    }
  });
  audit(`Bug ${bugId} auto-created from failed test case ${tc.id} "${tc.testCase}"`);
  toast(`Bug ${bugId} auto-created from failed test ${tc.id}`, 'info');
}
export function viewBug(id) {
  const b = S.bugs.find(x => x.id === id);
  if (!b) return;
  const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, {
    id: b.tcId,
    module: b.module
  }));
  const history = b.history.map(h => {
    const cls = h.event.includes('created') || h.event.includes('Fail') ? 'tl-red' : h.event.includes('fixed') || h.event.includes('Verified') ? 'tl-green' : h.event.includes('Fixed') ? 'tl-yellow' : 'tl-blue';
    let role = 'qa';
    const u = S.users.find(u => u.username === h.actor);
    if (u) {
      role = u.role;
    } else if (h.actor && ['qa', 'dev', 'admin'].includes(h.actor.toLowerCase())) {
      role = h.actor.toLowerCase();
    }
    const badgeClass = role === 'qa' ? 'actor-qa' : role === 'dev' ? 'actor-dev' : 'actor-admin';
    return `<div class="tl-item ${cls}">
      <div class="tl-date">${formatDate(h.date)}</div>
      <div class="tl-text">${h.event} <span class="audit-actor ${badgeClass}">${h.actor.toUpperCase()}</span></div>
    </div>`;
  }).join('');
  const viewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:middle;color:var(--text2);"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  showModal(`<div style="display:flex;align-items:center;">${viewIcon}View Mode <span style="color:var(--text3);margin-left:6px;font-size:14px;font-weight:400;">| ${b.id}</span></div>`, `
  <div style="display:flex; flex-direction:column; gap:24px; text-align:left;">
    <!-- Top Details Card -->
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        Bug Overview
      </h4>
      <div class="detail-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Bug ID</div><div class="detail-value" style="font-family:var(--font);color:var(--text2); font-weight:600; font-size:15px;">${b.id}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Status</div><div class="detail-value">${statusBadge(b.status)}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Module</div><div class="detail-value" style="color:var(--text2);">${b.module}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Severity</div><div class="detail-value">${sevBadge(b.severity)}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Linked Test Case</div><div class="detail-value" style="font-family:var(--font); color:var(--accent);">${b.tcId}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Screen</div><div class="detail-value" style="color:var(--text2);">${b.screen || '—'}</div></div>
      </div>
      
      <div style="margin-top:20px; padding-top:16px; border-top:1px dashed var(--border);">
        <div class="detail-item" style="margin-bottom:12px;"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-1</div><div style="font-size:13px;color:var(--text2)">${renderEvidenceCell(linkedTc?.evidence)}</div></div>
        <div class="detail-item" style="margin-bottom:12px;"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-2</div><div style="font-size:13px;color:var(--text2)">${renderEvidenceCell(linkedTc?.evidence2)}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Notes</div><div style="font-size:13px;color:var(--text2); background:var(--bg3); padding:10px; border-radius:6px; margin-top:4px;">${linkedTc?.notes || '—'}</div></div>
      </div>
    </div>

    <!-- Date Tracking Card -->
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Tracking & Lifecycle
      </h4>
      <div class="detail-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Failed On</div><div style="color:var(--text2);font-family:var(--font);font-size:13px; background:var(--bg3); padding:4px 8px; border-radius:4px; display:inline-block;">${formatDate(b.failedAt) || '—'}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Fixed On</div><div style="color:${b.fixedAt ? 'var(--green)' : 'var(--text2)'};font-family:var(--font);font-size:13px; background:var(--bg3); padding:4px 8px; border-radius:4px; display:inline-block;">${formatDate(b.fixedAt) || 'Not fixed yet'}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Retest On</div><div style="color:var(--text2);font-family:var(--font);font-size:13px; background:var(--bg3); padding:4px 8px; border-radius:4px; display:inline-block;">${formatDate(b.retestAt) || 'Not retested yet'}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Retest Count</div><div style="font-family:var(--font);color:var(--text2);font-size:13px; background:var(--bg3); padding:4px 8px; border-radius:4px; display:inline-block;">${b.retestCount}</div></div>
        ${b.escalatedAt ? `<div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Escalated On</div><div style="color:var(--red);font-family:var(--font);font-size:13px; background:var(--red-bg); padding:4px 8px; border-radius:4px; display:inline-block;">${formatDate(b.escalatedAt)}</div></div>` : ''}
      </div>
      ${b.devNotes ? `<div style="margin-top:20px; padding-top:16px; border-top:1px dashed var(--border);"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Dev Notes</div><div style="font-size:13px;color:var(--text2); background:var(--bg3); padding:12px; border-radius:6px; border-left:3px solid var(--accent);">${b.devNotes}</div></div>` : ''}
      ${b.escalationReason ? `<div style="margin-top:20px; padding-top:16px; border-top:1px dashed var(--border);"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Escalation Reason</div><div style="font-size:13px;color:var(--text2); background:var(--red-bg); padding:12px; border-radius:6px; border-left:3px solid var(--red);">${b.escalationReason}</div></div>` : ''}
    </div>

    <!-- Timeline Card -->
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Audit Timeline
      </h4>
      <div class="timeline" style="margin-top:12px; background:var(--bg); padding:16px; border-radius:8px; border:1px solid var(--border);">${history || '<div style="color:var(--text3);font-size:13px; text-align:center; padding:12px 0;">No history yet</div>'}</div>
    </div>
  </div>
  `, null, true);
}

// ─────────────────────────── ACTIONS ───────────────────────────
export function markFixed(bugId) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const viewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:middle;color:var(--green);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
  showModal(`<div style="display:flex;align-items:center;">${viewIcon}Mark Bug as Fixed</div>`, `
  <div style="display:flex; flex-direction:column; gap:20px; text-align:left;">
    <div style="background:var(--bg2); border:1px solid var(--green-border); border-radius:12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,0.05); border-left:4px solid var(--green);">
      <div style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Resolving Bug</div>
      <div style="font-family:var(--font); color:var(--green); font-weight:600; font-size:15px; margin-bottom:4px;">${bugId}</div>
      <div style="font-size:13px; color:var(--text2);">${S.bugs.find(b => b.id === bugId)?.testCase}</div>
    </div>
    <div class="field" style="margin-bottom:0;">
      <label style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Dev Fix Notes <span class="required" style="color:var(--red);">*</span></label>
      <textarea id="dev-notes" placeholder="Describe what was fixed and how..." style="min-height:100px; resize:vertical; background:var(--bg3);"></textarea>
    </div>
  </div>
  `, () => {
    const notes = document.getElementById('dev-notes').value.trim();
    if (!notes) {
      toast('Please add fix notes', 'error');
      return;
    }
    const b = S.bugs.find(x => x.id === bugId);
    if (!b) return;
    b.status = 'Fixed';
    b.fixedAt = now();
    b.devNotes = notes;
    b.history.push({
      date: now(),
      event: `Marked as Fixed. Notes: ${notes}`,
      actor: S.auth.user
    });

    // Send bug update to server
    socket.emit('updateData', {
      type: 'bug',
      data: b
    });
    audit(`${bugId} marked as Fixed`);
    closeModal();
    save();
    toast(`Bug ${bugId} marked as fixed — awaiting QA retest`, 'success');
  });
}
export function retestPass(bugId) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const b = S.bugs.find(x => x.id === bugId);
  if (!b) return;
  const tc = S.testCases.find(t => testcaseKeysMatch(t, {
    id: b.tcId,
    module: b.module
  }));
  openConfirm('Confirm Retest Pass', `Mark bug ${bugId} as PASSED?Test case "${b.testCase}" will be updated to PASS status and returned to Test Cases.`, () => {
    b.status = 'Verified';
    b.retestAt = now();
    b.retestCount++;
    b.retestResult = 'Pass';
    b.history.push({
      date: now(),
      event: 'Retest PASSED — bug verified and closed',
      actor: S.auth.user
    });
    if (tc) {
      tc.status = 'Pass';
      tc.updatedAt = now();
      tc.history = tc.history || [];
      tc.history.push({
        date: now(),
        event: `Retest passed — test case restored to PASS status`
      });

      // Send updates to server
      socket.emit('updateData', {
        type: 'testCase',
        data: tc
      });
    }

    // Send bug update to server
    socket.emit('updateData', {
      type: 'bug',
      data: b
    });
    audit(`${bugId} retest PASSED`);
    save();
    toast(`Retest passed! Bug ${bugId} verified. Test case ${b.tcId} is now PASS.`, 'success');
  }, 'Confirm Pass', 'btn-success', 'green');
}
export function retestFail(bugId) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const b = S.bugs.find(x => x.id === bugId);
  if (!b) return;
  openConfirm('Confirm Retest Fail', `Mark bug ${bugId} as FAILED?This will re-open the bug and return it to the active Bug Reports queue.`, () => {
    b.status = 'Open';
    b.retestAt = now();
    b.retestCount++;
    b.retestResult = 'Fail';
    b.fixedAt = null;
    b.history.push({
      date: now(),
      event: `Retest FAILED — bug re-opened (Retest #${b.retestCount})`,
      actor: S.auth.user
    });
    const tc = S.testCases.find(t => testcaseKeysMatch(t, {
      id: b.tcId,
      module: b.module
    }));
    if (tc) {
      tc.status = 'Fail';
      tc.updatedAt = now();

      // Send test case update to server
      socket.emit('updateData', {
        type: 'testCase',
        data: tc
      });
    }

    // Send bug update to server
    socket.emit('updateData', {
      type: 'bug',
      data: b
    });
    audit(`${bugId} retest FAILED`);
    save();
    toast(`Retest failed. Bug ${bugId} returned to queue.`, 'error');
  }, 'Confirm Fail', 'btn-danger', 'red');
}
export function deleteBug(id) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const b = S.bugs.find(x => x.id === id);
  if (!b) return;
  openConfirm('Permanently Delete Bug Report', `Delete bug "${id}" (${b.testCase})?This action is PERMANENT and cannot be undone. The bug record will be completely removed from the system.`, () => {
    S.bugs = S.bugs.filter(x => x.id !== id);
    audit(`Bug ${id} "${b.testCase}" permanently deleted`);
    socket.emit('updateData', {
      type: 'bug',
      data: {
        id,
        deleted: true
      }
    });
    save();
    toast(`Bug ${id} permanently deleted`, 'success');
  });
}
export
// ─────────────────────────── ESCALATE BUG ───────────────────────────
function escalateBug(bugId) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const b = S.bugs.find(x => x.id === bugId);
  if (!b) return;
  const viewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:middle;color:var(--purple);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  showModal(`<div style="display:flex;align-items:center;">${viewIcon}Escalate to Backend Team</div>`, `
  <div style="display:flex; flex-direction:column; gap:20px; text-align:left;">
    <div style="background:var(--bg2); border:1px solid var(--purple-border); border-radius:12px; padding:16px; box-shadow:0 2px 10px rgba(0,0,0,0.05); border-left:4px solid var(--purple);">
      <div style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em;">Escalating Bug</div>
      <div style="font-family:var(--font); color:var(--purple); font-weight:600; font-size:15px; margin-bottom:4px;">${bugId}</div>
      <div style="font-size:13px; color:var(--text2); margin-bottom:8px;">${b.testCase}</div>
      <div style="font-size:11px; color:var(--text3); display:flex; align-items:center; gap:6px;">
        <span style="background:var(--bg3); padding:4px 8px; border-radius:4px;">${b.module}</span>
        <span style="background:var(--bg3); padding:4px 8px; border-radius:4px;">${b.screen || '—'}</span>
        <span style="background:var(--bg3); padding:4px 8px; border-radius:4px;">${b.severity}</span>
      </div>
    </div>
    
    <div style="padding:12px 16px; background:var(--purple-bg); border:1px dashed var(--purple-border); border-radius:8px; font-size:12.5px; color:var(--purple); display:flex; align-items:center; gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
      Use only when the bug cannot be fixed from the frontend. The backend queue will be updated.
    </div>

    <div class="field" style="margin-bottom:0;">
      <label style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Escalation Reason <span class="required" style="color:var(--red);">*</span></label>
      <textarea id="esc-reason" placeholder="Describe why this needs backend intervention (e.g. API error, database issue, server-side logic)..." style="min-height:80px; resize:vertical; background:var(--bg3);"></textarea>
    </div>
    
    <div class="field" style="margin-bottom:0;">
      <label style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Escalate To</label>
      <select id="esc-to" style="background:var(--bg3); padding:8px; border-radius:4px; border:1px solid var(--border); width:100%; color:var(--text); outline:none;">
        <option value="">Select Developer</option>
        ${S.users.filter(u => u.role === 'dev').map(u => `<option value="${u.username}">${u.username}</option>`).join('')}
      </select>
    </div>
  </div>
  `, () => {
    const reason = (document.getElementById('esc-reason') || {
      value: ''
    }).value.trim();
    const escTo = (document.getElementById('esc-to') || {
      value: ''
    }).value.trim();
    if (!reason) {
      toast('Please describe the escalation reason', 'error');
      return;
    }
    if (!escTo) {
      toast('Please select a developer to escalate to', 'error');
      return;
    }
    b.status = 'Escalated';
    b.escalatedAt = now();
    b.escalatedTo = escTo;
    b.escalationReason = reason;
    b.history.push({
      date: now(),
      event: `Escalated to ${escTo}. Reason: ${b.escalationReason}`,
      actor: S.auth.user
    });

    // Send bug update to server
    socket.emit('updateData', {
      type: 'bug',
      data: b
    });
    audit(`${bugId} escalated to backend`);
    closeModal();
    save();
    toast(`Bug ${bugId} escalated to backend team`, 'info');
  });
}

// ─────────────────────────── DOWNLOAD TEST CASES CSV ───────────────────────────