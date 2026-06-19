import { socket, refreshData, parseImpFile } from './api.js';
import { normalizeTcRowId, normalizeTcModule, normalizeStatus, applyTheme, toggleTheme, formatDate, now, nowFull, toast, openConfirm, upgradeSelects, buildLoading, topNavItem, statusBadge, sevBadge, escHtml, showBannedModal, showModal, closeModal, nav } from './utils.js';
import { testcaseKeysMatch, buildTestCases } from './testcases.js';
import { S } from './state.js';
import { audit, buildLogin, buildUserRing, buildUsers, buildAudit } from './auth.js';
import { buildEscalations, buildBugs, buildRetest } from './bugs.js';
import { buildDashboard } from './dashboard.js';
import { buildAutomation, initCodeMirror } from './automation.js';
import * as apiModule from './api.js';
Object.assign(window, apiModule);
import * as authModule from './auth.js';
Object.assign(window, authModule);
import * as dashboardModule from './dashboard.js';
Object.assign(window, dashboardModule);
import * as bugsModule from './bugs.js';
Object.assign(window, bugsModule);
import * as testcasesModule from './testcases.js';
Object.assign(window, testcasesModule);
import * as automationModule from './automation.js';
Object.assign(window, automationModule);
import * as screenshotsModule from './screenshots.js';
Object.assign(window, screenshotsModule);
import * as utilsModule from './utils.js';
Object.assign(window, utilsModule);
import * as appModule from './app.js';
Object.assign(window, appModule);

window.toggleSidebar = function () {
  S.sidebarCollapsed = !S.sidebarCollapsed;
  render();
};
export function toggleHmModDropdown(e) {
  if (e) e.stopPropagation();
  S.hmModDropdownOpen = !S.hmModDropdownOpen;
  render();
}
export function toggleHmModFilter(e, mod) {
  if (e) e.stopPropagation();
  if (!S.hmModFilter) S.hmModFilter = [];
  if (S.hmModFilter.includes(mod)) {
    S.hmModFilter = S.hmModFilter.filter(m => m !== mod);
  } else {
    S.hmModFilter.push(mod);
  }
  render();
}
export function removeHmModFilter(e, mod) {
  if (e) e.stopPropagation();
  if (!S.hmModFilter) S.hmModFilter = [];
  S.hmModFilter = S.hmModFilter.filter(m => m !== mod);
  render();
}
export function clearHmModFilter(e) {
  if (e) e.stopPropagation();
  S.hmModFilter = [];
  render();
}
export function toggleDashModDropdown(e) {
  if (e) e.stopPropagation();
  S.dashModDropdownOpen = !S.dashModDropdownOpen;
  render();
}
export function toggleDashModFilter(e, mod) {
  if (e) e.stopPropagation();
  if (!S.dashModFilter) S.dashModFilter = [];
  if (S.dashModFilter.includes(mod)) {
    S.dashModFilter = S.dashModFilter.filter(m => m !== mod);
  } else {
    S.dashModFilter.push(mod);
  }
  render();
}
export function removeDashModFilter(e, mod) {
  if (e) e.stopPropagation();
  if (!S.dashModFilter) S.dashModFilter = [];
  S.dashModFilter = S.dashModFilter.filter(m => m !== mod);
  render();
}
export function clearDashModFilter(e) {
  if (e) e.stopPropagation();
  S.dashModFilter = [];
  render();
}
document.addEventListener('click', function (e) {
  const p = document.getElementById('user-popup');
  if (p && p.style.display === 'block' && !e.target.closest('[onclick*="user-popup"]')) {
    p.style.display = 'none';
  }
  if (S.hmModDropdownOpen && !e.target.closest('#hmModFilterContainer')) {
    S.hmModDropdownOpen = false;
    render();
  }
  if (S.dashModDropdownOpen && !e.target.closest('#dashModFilterContainer')) {
    S.dashModDropdownOpen = false;
    render();
  }
});
applyTheme();

// Socket.IO event handlers
socket.on('initialData', serverData => {
  Object.assign(S, {
    auth: S.auth,
    role: S.role,
    view: S.view,
    modules: serverData.modules || [],
    modulesPendingDelete: serverData.modulesPendingDelete || [],
    testCases: (serverData.testCases || []).map(tc => ({
      ...tc,
      id: normalizeTcRowId(tc.id),
      module: normalizeTcModule(tc.module)
    })),
    bugs: serverData.bugs || [],
    auditLog: (serverData.auditLog || []).filter(a => /added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(a.event)),
    tcCounter: typeof serverData.tcCounter === 'number' ? serverData.tcCounter : 0,
    bugCounter: typeof serverData.bugCounter === 'number' ? serverData.bugCounter : 0,
    automationScripts: serverData.automationScripts || [],
    users: serverData.users || [],
    hmModFilter: S.hmModFilter || [],
    hmModDropdownOpen: S.hmModDropdownOpen || false,
    dashModFilter: S.dashModFilter || [],
    dashModDropdownOpen: S.dashModDropdownOpen || false
  });
  S.initialDataReceived = true;
  render();
});
socket.on('dataUpdate', update => {
  if (update.type === 'testCase') {
    if (update.data.deleted) {
      const delId = normalizeTcRowId(update.data.id);
      const delMod = normalizeTcModule(update.data.module);
      if (delId && delMod) {
        S.testCases = S.testCases.filter(tc => !(normalizeTcRowId(tc.id) === delId && normalizeTcModule(tc.module) === delMod));
      }
      // Never delete-by-id-only: different modules reuse the same TC numbers on purpose.
    } else {
      const {
        _id,
        __v,
        ...payload
      } = update.data || {};
      const pid = normalizeTcRowId(payload.id);
      const pm = normalizeTcModule(payload.module);
      if (pid && pm) {
        const normalizedPayload = {
          ...payload,
          id: pid,
          module: pm
        };
        const index = S.testCases.findIndex(tc => testcaseKeysMatch(tc, normalizedPayload));
        if (index !== -1) {
          S.testCases[index] = {
            ...S.testCases[index],
            ...normalizedPayload
          };
        } else {
          S.testCases.push(normalizedPayload);
        }
      }
    }
  } else if (update.type === 'bug') {
    if (update.data.deleted) {
      S.bugs = S.bugs.filter(bug => bug.id !== update.data.id);
    } else {
      const index = S.bugs.findIndex(bug => bug.id === update.data.id);
      if (index !== -1) {
        S.bugs[index] = {
          ...S.bugs[index],
          ...update.data
        };
      } else {
        S.bugs.push(update.data);
      }
    }
  } else if (update.type === 'audit') {
    if (/added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(update.data.event)) {
      S.auditLog.unshift(update.data);
      if (S.auditLog.length > 200) {
        S.auditLog = S.auditLog.slice(0, 200);
      }
    }
  } else if (update.type === 'counters') {
    S.tcCounter = update.data.tcCounter;
    S.bugCounter = update.data.bugCounter;
  } else if (update.type === 'module') {
    if (update.data.deleted) {
      S.modules = S.modules.filter(m => m !== update.data.name);
      S.modulesPendingDelete = (S.modulesPendingDelete || []).filter(m => m.name !== update.data.name);
    } else if (update.data.pendingDelete !== undefined) {
      S.modulesPendingDelete = S.modulesPendingDelete || [];
      S.modulesPendingDelete = S.modulesPendingDelete.filter(m => m.name !== update.data.name);
      if (update.data.pendingDelete) {
        S.modulesPendingDelete.push({
          name: update.data.name,
          pendingDelete: true,
          deleteRequestedBy: update.data.deleteRequestedBy
        });
      }
    } else if (update.data.name && !S.modules.includes(update.data.name)) {
      S.modules.push(update.data.name);
    }
  } else if (update.type === 'automationScript') {
    if (update.data.deleted) {
      S.automationScripts = S.automationScripts.filter(s => !(s.testCaseId === update.data.testCaseId && s.module === update.data.module));
    } else {
      const index = S.automationScripts.findIndex(s => s.testCaseId === update.data.testCaseId && s.module === update.data.module);
      if (index !== -1) {
        S.automationScripts[index] = {
          ...S.automationScripts[index],
          ...update.data
        };
      } else {
        S.automationScripts.push(update.data);
      }
    }
  } else if (update.type === 'user') {
    if (update.data.deleted) {
      S.users = S.users.filter(u => u.username !== update.data.username);
    } else {
      const index = S.users.findIndex(u => u.username === update.data.username);
      if (index !== -1) {
        S.users[index] = {
          ...S.users[index],
          ...update.data
        };
      } else {
        S.users.push(update.data);
      }
    }
  }
  render();
});
socket.on('error', err => {
  console.error('Server error:', err);
  toast(err && err.message || 'Server connection error', 'error');
});
export let _persistErrNotifiedAt = 0;
socket.on('persistError', err => {
  console.error('Persist error:', err);
  const msg = err && err.message ? err.message : 'Could not save to database';
  const now = Date.now();
  if (now - _persistErrNotifiedAt > 3000) {
    _persistErrNotifiedAt = now;
    toast(msg, 'error');
  }
});
socket.on('disconnect', () => {
  console.warn('Disconnected from server');
  if (window.isRefreshing) {
    window.isRefreshing = false;
    return; // Skip wiping the screen during manual refresh
  }
  S.initialDataReceived = false;
  render();
});
export function save() {
  render();
}
export function textMatchesQuery(v, q) {
  if (!q) return true;
  return String(v || '').toLowerCase().includes(q.toLowerCase());
}
export let _liveFilterTimer = null;
export function liveFilter(el) {
  const id = el && el.id ? el.id : '';
  const start = el && typeof el.selectionStart === 'number' ? el.selectionStart : null;
  const end = el && typeof el.selectionEnd === 'number' ? el.selectionEnd : null;
  if (_liveFilterTimer) clearTimeout(_liveFilterTimer);
  _liveFilterTimer = setTimeout(() => {
    render();
    if (!id) return;
    const next = document.getElementById(id);
    if (!next) return;
    next.focus();
    if (typeof start === 'number' && typeof end === 'number' && next.setSelectionRange) {
      const s = Math.min(start, next.value.length);
      const e = Math.min(end, next.value.length);
      next.setSelectionRange(s, e);
    }
  }, 0);
}
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
});

// ─────────────────────────── RENDER ───────────────────────────
export function render() {
  if (window.cmEditor) {
    S.currentUnsavedScript = window.cmEditor.state.doc.toString();
    window.cmEditor.destroy();
    window.cmEditor = null;
  }
  const app = document.getElementById('app');
  let scrollContent = 0;
  const contentEl = document.getElementById('content');
  if (contentEl) scrollContent = contentEl.scrollTop;
  if (!S.initialDataReceived) {
    app.innerHTML = buildLoading();
    return;
  }
  if (!S.auth.loggedIn) {
    app.innerHTML = buildLogin();
    return;
  }
  app.innerHTML = buildApp();
  attachHandlers();
  upgradeSelects(app);
  if (S.view === 'automation') {
    initCodeMirror();
  }
  const newContentEl = document.getElementById('content');
  if (newContentEl) newContentEl.scrollTop = scrollContent;
}
export function buildApp() {
  return `
  <div class="main">
    ${buildTopbar()}
    <div class="content" id="content">
      ${buildView()}
    </div>
  </div>
  `;
}
export function buildTopbar() {
  const titles = {
    dashboard: 'Dashboard',
    testcases: 'Test Cases',
    bugs: 'Bug Reports',
    retest: 'Retest Queue',
    escalations: 'Backend Escalations',
    automation: 'Automation',
    modules: 'Modules',
    audit: 'Audit Log',
    report: 'Reports',
    users: 'User Management'
  };
  const openBugs = S.bugs.filter(b => normalizeStatus(b.status) === 'open').length;
  const escalatedCount = S.bugs.filter(b => normalizeStatus(b.status) === 'escalated').length;
  const retestPending = S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length;
  let actions = '';
  if (S.view === 'users' && S.role === 'admin') {
    // Create User action removed from topbar in favor of tabs
  }
  return `<div class="topbar">
    <div class="topbar-left" style="display:flex; align-items:center; gap:16px;">
      <div style="display:flex; align-items:center; gap:12px; padding-right:16px; border-right:1px solid var(--border);">
        <img src="${S.currentTheme === 'light' ? 'assets/sidebar icon light.png' : 'assets/sidebar icon.png'}" style="width:56px; height:56px; object-fit:contain;"/>
        <div style="display:flex; flex-direction:column; justify-content:center;">
          <div style="font-weight:800; font-size:16px; color:var(--text); letter-spacing:-0.02em; line-height:1.2; white-space:nowrap;">BUG OS</div>
          <div class="user-role-badge ${S.role === 'qa' ? 'role-qa' : S.role === 'dev' ? 'role-dev' : 'role-admin'}" style="font-size:10px; padding:2px 6px; letter-spacing:0.04em; border-radius:4px; font-weight:700; text-transform:uppercase; display:inline-flex; align-items:center; line-height:1; margin-top:2px; width:fit-content; white-space:nowrap;">${S.role === 'qa' ? 'QA PANEL' : S.role === 'dev' ? 'DEV PANEL' : 'ADMIN PANEL'}</div>
        </div>
      </div>
      <div class="topbar-nav" style="display:flex; align-items:center; gap:4px; background:var(--bg3); padding:6px; border-radius:100px; border:1px solid var(--border); box-shadow:inset 0 2px 4px rgba(0,0,0,0.02); height:44px; box-sizing:border-box;">
        ${topNavItem('dashboard', 'Dashboard', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>')}
        ${topNavItem('testcases', 'Tests', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>')}
        ${topNavItem('bugs', 'Bugs', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>', openBugs, 'var(--red)')}
        ${topNavItem('retest', 'Retest', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>', retestPending, 'var(--yellow)')}
        ${topNavItem('escalations', 'Escalations', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>', escalatedCount, 'var(--orange)')}
        ${topNavItem('automation', 'Automation', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>')}
        ${topNavItem('modules', 'Modules', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>')}
        ${topNavItem('audit', 'Audit', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>')}
        ${topNavItem('report', 'Reports', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>')}
        ${S.role === 'admin' ? topNavItem('users', 'Users', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>') : ''}
      </div>
      <div class="topbar-actions">
        ${actions}
      </div>
    </div>
    <div class="topbar-right">
      <div style="display:flex; align-items:center; gap:16px; margin-left:auto;">
        <div style="display:flex; align-items:center; background:var(--bg3); border:1px solid var(--border); border-radius:100px; padding:6px; gap:4px; height:44px; box-sizing:border-box;">

        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${S.currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>

      </div>
        ${buildUserRing()}
      </div>
    </div>
  </div>`;
}
export function buildView() {
  if (S.view === 'dashboard') return buildDashboard();
  if (S.view === 'testcases') return buildTestCases();
  if (S.view === 'bugs') return buildBugs();
  if (S.view === 'retest') return buildRetest();
  if (S.view === 'escalations') return buildEscalations();
  if (S.view === 'automation') return buildAutomation();
  if (S.view === 'modules') return buildModules();
  if (S.view === 'audit') return buildAudit();
  if (S.view === 'report') return buildReport();
  if (S.view === 'users') return buildUsers();
  return '';
}

// ─────────────────────────── USER MANAGEMENT ───────────────────────────
export function openChangePassword() {
  const body = `
        <div class="form-grid">
          <div class="field">
            <label>Current Password</label>
            <input id="cp-old" type="password" placeholder="Enter current password">
          </div>
          <div class="field">
            <label>New Password</label>
            <input id="cp-new" type="password" placeholder="Enter new password">
          </div>
        </div>
      `;
  showModal('Change Password', body, () => {
    const oldPass = document.getElementById('cp-old').value.trim();
    const newPass = document.getElementById('cp-new').value.trim();
    if (!oldPass || !newPass) {
      toast('Please fill all fields', 'error');
      return;
    }
    const user = S.users.find(u => u.username === S.auth.user);
    if (!user || user.password !== oldPass) {
      toast('Incorrect current password', 'error');
      return;
    }
    const updatedUser = {
      ...user,
      password: newPass
    };
    socket.emit('updateData', {
      type: 'user',
      data: updatedUser
    });
    audit(`User ${S.auth.user} changed their password`);
    toast('Password updated successfully', 'success');
    closeModal();
  });
}

// ─────────────────────────── BACKEND ESCALATIONS ───────────────────────────
export function switchEscTab(tabId) {
  S.escTab = tabId;
  render();
}
export function getLangSvg(lang) {
  if (lang === 'python') return `<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><linearGradient id="python-original-a" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#5A9FD4"/><stop offset="1" stop-color="#306998"/></linearGradient><linearGradient id="python-original-b" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#FFD43B"/><stop offset="1" stop-color="#FFE873"/></linearGradient><path fill="url(#python-original-a)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z" transform="translate(0 10.26)"/><path fill="url(#python-original-b)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z" transform="translate(0 10.26)"/></svg>`;
  if (lang === 'javascript') return `<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#F0DB4F" d="M1.408 1.408h125.184v125.185H1.408z"/><path fill="#323330" d="M116.347 96.736c-.917-5.711-4.641-10.508-15.672-14.981-3.832-1.761-8.104-3.022-9.377-5.926-.452-1.69-.512-2.642-.226-3.665.821-3.32 4.784-4.355 7.925-3.403 2.023.678 3.938 2.237 5.093 4.724 5.402-3.498 5.391-3.475 9.163-5.879-1.381-2.141-2.118-3.129-3.022-4.045-3.249-3.629-7.676-5.498-14.756-5.355l-3.688.477c-3.534.893-6.902 2.748-8.877 5.235-5.926 6.724-4.236 18.492 2.975 23.335 7.104 5.332 17.54 6.545 18.873 11.531 1.297 6.104-4.486 8.08-10.234 7.378-4.236-.881-6.592-3.034-9.139-6.949-4.688 2.713-4.688 2.713-9.508 5.485 1.143 2.499 2.344 3.63 4.26 5.795 9.068 9.198 31.76 8.746 35.83-5.176.165-.478 1.261-3.666.38-8.581zM69.462 58.943H57.753l-.048 30.272c0 6.438.333 12.34-.714 14.149-1.713 3.558-6.152 3.117-8.175 2.427-2.059-1.012-3.106-2.451-4.319-4.485-.333-.584-.583-1.036-.667-1.071l-9.52 5.83c1.583 3.249 3.915 6.069 6.902 7.901 4.462 2.678 10.459 3.499 16.731 2.059 4.082-1.189 7.604-3.652 9.448-7.401 2.666-4.915 2.094-10.864 2.07-17.444.06-10.735.001-21.468.001-32.237z"/></svg>`;
  if (lang === 'java') return `<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"/><path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"/><path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"/><path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"/><path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"/></svg>`;
  return '';
}
export
// ─────────────────────────── MODULES ───────────────────────────

function switchModulesTab(tabId) {
  S.modulesTab = tabId;
  render();
}
export function buildAddModuleTab() {
  return `
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Add New Module</div>
    </div>
    <div style="padding: 24px;">
      <div class="field" style="max-width: 400px;">
        <label>Module Name <span class="required">*</span></label>
        <input id="f-inline-modname" placeholder="e.g. User Management, Payment, Reports">
      </div>
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn btn-ghost" onclick="submitInlineModule()" style="padding:7px 20px;">Add Module</button>
        <button class="btn btn-ghost" onclick="if(S.role !== 'qa') { showBannedModal(); return; } document.getElementById('f-inline-modname').value=''" style="padding:7px 20px;">Cancel</button>
      </div>
    </div>
  </div>`;
}
export function submitInlineModule() {
  if (S.role !== 'qa') {
    showBannedModal();
    return;
  }
  const name = document.getElementById('f-inline-modname').value.trim();
  if (!name) {
    toast('Module name required', 'error');
    return;
  }
  if (S.modules.includes(name)) {
    toast('Module already exists', 'error');
    return;
  }
  S.modules.push(name);
  audit(`Module "${name}" added`);
  socket.emit('updateData', {
    type: 'module',
    data: {
      name
    }
  });
  save();
  toast(`Module "${name}" added`, 'success');
  switchModulesTab('all');
}
export function buildModules() {
  S.modulesTab = S.modulesTab || 'all';
  const tabStyle = isActive => isActive ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);` : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
  const modQ = (document.getElementById('modQ') || {
    value: ''
  }).value.toLowerCase();
  let filteredModules = S.modules;
  if (modQ) {
    filteredModules = filteredModules.filter(m => textMatchesQuery(m, modQ));
  }
  let approvalsHtml = '';
  if (S.role === 'admin' && S.modulesPendingDelete && S.modulesPendingDelete.length > 0 && S.modulesTab === 'all') {
    approvalsHtml = `<div class="section" style="margin-bottom:24px; border:1px solid var(--red-border); border-radius:16px; background:var(--red-bg); padding:16px;">
          <div style="font-size:14px; font-weight:700; color:var(--red); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Pending Deletion Approvals
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${S.modulesPendingDelete.map(m => `
              <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg2); padding:12px 16px; border-radius:8px; border:1px solid var(--border);">
                <div>
                  <span style="font-weight:600; color:var(--text);">${m.name}</span>
                  <span style="font-size:12px; color:var(--text3); margin-left:8px;">Requested by: <span style="font-weight:700;">${m.deleteRequestedBy || 'QA'}</span></span>
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-ghost btn-sm" style="color:var(--red); border-color:var(--red-border); background:var(--red-bg); border-radius:6px; cursor:pointer;" onclick="approveModuleDelete('${m.name}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    Approve Delete
                  </button>
                  <button class="btn btn-ghost btn-sm" style="color:var(--text2); border-color:var(--border); border-radius:6px; cursor:pointer;" onclick="rejectModuleDelete('${m.name}')">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Reject
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
  }
  const cards = filteredModules.map(mod => {
    const tcs = S.testCases.filter(t => t.module === mod);
    const pass = tcs.filter(t => t.status === 'Pass').length;
    const fail = tcs.filter(t => t.status === 'Fail').length;
    const hold = tcs.filter(t => t.status === 'Hold').length;
    const bugs = S.bugs.filter(b => b.module === mod);
    const openB = bugs.filter(b => b.status === 'Open').length;
    const pct = tcs.length ? Math.round(pass / tcs.length * 100) : 0;
    const canDelete = S.role === 'qa' || S.role === 'admin';
    const isPendingDelete = S.modulesPendingDelete && S.modulesPendingDelete.some(m => m.name === mod);
    return `<div class="section" style="margin-bottom:16px; border-radius:16px; overflow:hidden; transition:all 0.2s; border:1px solid var(--border);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)';this.style.borderColor='var(--border2)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.02)';this.style.borderColor='var(--border)'">
      <div class="section-hdr" style="padding:16px 20px; background:linear-gradient(90deg, var(--bg3) 0%, transparent 100%); border-bottom:1px solid var(--border);">
        <div class="section-title" style="font-size:16px; letter-spacing:-0.02em;">${mod}</div>
        ${isPendingDelete ? `<button class="btn btn-ghost btn-sm" style="border-radius:12px; padding:4px 10px; font-size:11px; color:var(--orange); border-color:var(--orange-border); background:var(--orange-bg); cursor:not-allowed;" disabled><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Pending Deletion Approval</button>` : canDelete ? `<button class="btn btn-ghost btn-sm" style="border-radius:12px; padding:4px 10px; font-size:11px; color:var(--red); border-color:var(--red-border); background:var(--red-bg);" onclick="deleteModule('${mod}')"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete Module</button>` : ''}
      </div>
      <div style="padding:20px; display:grid; grid-template-columns:repeat(5,1fr); gap:16px;">
        <div style="background:var(--bg); border:1px solid var(--border); border-radius:12px; padding:12px; text-align:center;"><div style="font-size:10px; font-weight:700; color:var(--text3); text-transform:uppercase; letter-spacing:.08em;">Total Tests</div><div style="font-size:24px; font-weight:700; font-family:var(--mono); margin-top:4px; color:var(--text);">${tcs.length}</div></div>
        <div style="background:var(--green-bg); border:1px solid var(--green-border); border-radius:12px; padding:12px; text-align:center;"><div style="font-size:10px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:.08em;">Pass</div><div style="font-size:24px; font-weight:700; font-family:var(--mono); margin-top:4px; color:var(--green);">${pass}</div></div>
        <div style="background:var(--red-bg); border:1px solid var(--red-border); border-radius:12px; padding:12px; text-align:center;"><div style="font-size:10px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:.08em;">Fail</div><div style="font-size:24px; font-weight:700; font-family:var(--mono); margin-top:4px; color:var(--red);">${fail}</div></div>
        <div style="background:var(--yellow-bg); border:1px solid var(--yellow-border); border-radius:12px; padding:12px; text-align:center;"><div style="font-size:10px; font-weight:700; color:var(--yellow); text-transform:uppercase; letter-spacing:.08em;">Hold</div><div style="font-size:24px; font-weight:700; font-family:var(--mono); margin-top:4px; color:var(--yellow);">${hold}</div></div>
        <div style="background:${openB > 0 ? 'var(--red-bg)' : 'var(--green-bg)'}; border:1px solid ${openB > 0 ? 'var(--red-border)' : 'var(--green-border)'}; border-radius:12px; padding:12px; text-align:center;"><div style="font-size:10px; font-weight:700; color:${openB > 0 ? 'var(--red)' : 'var(--green)'}; text-transform:uppercase; letter-spacing:.08em;">Open Bugs</div><div style="font-size:24px; font-weight:700; font-family:var(--mono); margin-top:4px; color:${openB > 0 ? 'var(--red)' : 'var(--green)'};">${openB}</div></div>
      </div>
      <div style="padding:0 20px 20px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="flex:1; height:8px; background:var(--bg4); border-radius:4px; overflow:hidden; box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
            <div style="width:${pct}%; height:100%; background:${pct > 70 ? 'var(--green)' : pct > 40 ? 'var(--yellow)' : 'var(--red)'}; border-radius:4px; transition:width 0.6s cubic-bezier(0.4, 0, 0.2, 1); box-shadow:0 0 8px ${pct > 70 ? 'rgba(22, 163, 74, 0.4)' : pct > 40 ? 'rgba(234, 88, 12, 0.4)' : 'rgba(220, 38, 38, 0.4)'};"></div>
          </div>
          <span style="font-family:var(--font); font-weight:600; font-size:13px; color:var(--text2); min-width:80px; text-align:right;">${pct}% Pass</span>
        </div>
      </div>
    </div>`;
  }).join('');
  const header = `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Modules</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
      <div onclick="switchModulesTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.modulesTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.modulesTab === 'all' ? '1' : '0.8'}'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        All Modules
      </div>
      ${['qa', 'dev', 'admin'].includes(S.role) ? `
      <div onclick="switchModulesTab('add')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.modulesTab === 'add')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.modulesTab === 'add' ? '1' : '0.8'}'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Module
      </div>
      ` : ''}
    </div>
    <div style="display:flex; align-items:center; gap:16px;">
      <div style="position:relative; width:220px;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="modQ" class="filter-select" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search modules..." oninput="liveFilter(this)" value="${escHtml(modQ).replace(/\"/g, '&quot;')}">
      </div>

      
    </div>
  </div>`;
  const emptyMsg = S.modules.length === 0 ? `No modules yet. ${S.role === 'qa' ? 'Add your first module.' : 'Contact QA to add modules.'}` : 'No modules matches filters';
  if (S.modulesTab === 'add') {
    return header + buildAddModuleTab();
  }
  return header + approvalsHtml + (cards || `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg></div>${emptyMsg}</div>`);
}

// ─────────────────────────── AUDIT ───────────────────────────
export
// ─────────────────────────── REPORT ───────────────────────────
function buildReport() {
  const reportQ = (document.getElementById('reportQ') || {
    value: ''
  }).value.toLowerCase();
  const total = S.testCases.length;
  const pass = S.testCases.filter(t => t.status === 'Pass').length;
  const fail = S.testCases.filter(t => t.status === 'Fail').length;
  const totalBugs = S.bugs.length;
  const openBugs = S.bugs.filter(b => b.status === 'Open').length;
  const escalatedBugs = S.bugs.filter(b => b.status === 'Escalated').length;
  const pct = total ? Math.round(pass / total * 100) : 0;
  let filteredModules = S.modules;
  if (reportQ) {
    filteredModules = filteredModules.filter(m => textMatchesQuery(m, reportQ));
  }
  const modRows = filteredModules.map(mod => {
    const tcs = S.testCases.filter(t => t.module === mod);
    const p = tcs.filter(t => t.status === 'Pass').length;
    const f = tcs.filter(t => t.status === 'Fail').length;
    const h = tcs.filter(t => t.status === 'Hold').length;
    const bugs = S.bugs.filter(b => b.module === mod);
    return `<tr>
      <td>${mod}</td>
      <td style="font-family:var(--mono)">${tcs.length}</td>
      <td style="color:var(--green);font-family:var(--mono)">${p}</td>
      <td style="color:var(--red);font-family:var(--mono)">${f}</td>
      <td style="color:var(--orange);font-family:var(--mono)">${h}</td>
      <td style="font-family:var(--mono)">${bugs.length}</td>
      <td style="color:${bugs.filter(b => b.status === 'Open').length > 0 ? 'var(--red)' : 'var(--green)'};font-family:var(--mono)">${bugs.filter(b => b.status === 'Open').length}</td>
    </tr>`;
  }).join('');
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Reports</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <div style="position:relative; width:220px;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="reportQ" class="filter-select" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search modules..." oninput="liveFilter(this)" value="${escHtml(reportQ).replace(/\"/g, '&quot;')}">
      </div>
      
    </div>
  </div>
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:24px; margin-bottom:32px;">
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.08)';this.style.borderColor='var(--accent)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px;">Total Modules</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${S.modules.length}</div>
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.08)';this.style.borderColor='var(--accent)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px;">Pass Rate</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${pct}%</div>
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(22, 163, 74, 0.12)';this.style.borderColor='var(--green)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.8px;">Tests Passed</div>
      <div style="font-size:42px; font-weight:800; color:var(--green); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${pass}<span style="font-size:24px;color:var(--text3)">/${total}</span></div>
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(220, 38, 38, 0.12)';this.style.borderColor='var(--red)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:0.8px;">Open Bugs</div>
      <div style="font-size:42px; font-weight:800; color:var(--red); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${openBugs}</div>
    </div>
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(245, 158, 11, 0.12)';this.style.borderColor='var(--orange)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--orange); text-transform:uppercase; letter-spacing:0.8px;">Escalated</div>
      <div style="font-size:42px; font-weight:800; color:var(--orange); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${escalatedBugs}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Module Breakdown</div>
      <button class="btn btn-ghost btn-sm" style="display:inline-flex; align-items:center; gap:6px;" onclick="exportCSV()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export CSV</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Module</th><th>Total Tests</th><th>Pass</th><th>Fail</th><th>Hold</th><th>Total Bugs</th><th>Open Bugs</th></tr></thead>
      <tbody>${modRows || `<tr><td colspan="7" class="empty"><div class="empty-icon">${S.modules.length > 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'}</div>${S.modules.length > 0 ? 'No modules matches filters' : 'No modules yet.'}</td></tr>`}</tbody>
    </table></div>
  </div>`;
}

// ─────────────────────────── BADGES ───────────────────────────
export function generateUniqueBugId() {
  let bugId;
  do {
    bugId = `BUG-${String(S.bugCounter++).padStart(3, '0')}`;
  } while (S.bugs.some(b => b.id === bugId));
  return bugId;
}
export function approveModuleDelete(name) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  openConfirm('Approve Deletion', `Permanently delete module "${name}" and all associated test cases and bugs? This CANNOT be undone.`, () => {
    const deletedTCs = S.testCases.filter(t => t.module === name).map(t => t.id);
    const deletedBugIds = S.bugs.filter(b => b.module === name).map(b => b.id);
    S.testCases = S.testCases.filter(t => t.module !== name);
    S.bugs = S.bugs.filter(b => b.module !== name);
    S.modules = S.modules.filter(m => m !== name);
    S.modulesPendingDelete = (S.modulesPendingDelete || []).filter(m => m.name !== name);
    audit(`Admin approved deletion of Module "${name}" and ${deletedTCs.length} linked test cases`);
    deletedTCs.forEach(tcId => {
      socket.emit('updateData', {
        type: 'testCase',
        data: {
          id: tcId,
          module: name,
          deleted: true
        }
      });
    });
    deletedBugIds.forEach(bugId => {
      socket.emit('updateData', {
        type: 'bug',
        data: {
          id: bugId,
          deleted: true
        }
      });
    });
    socket.emit('updateData', {
      type: 'module',
      data: {
        name,
        deleted: true
      }
    });
    save();
    toast(`Module "${name}" permanently deleted`, 'success');
  });
}
export function rejectModuleDelete(name) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  audit(`Admin rejected deletion of Module "${name}"`);
  socket.emit('updateData', {
    type: 'module',
    data: {
      name,
      pendingDelete: false,
      deleteRequestedBy: ''
    }
  });
  save();
  toast(`Deletion request rejected for "${name}"`, 'success');
}
export function deleteModule(name) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  if (S.role === 'qa') {
    openConfirm('Request Delete Module', `Are you sure you want to request deletion of module "${name}"? This requires admin approval to prevent accidental data loss.`, () => {
      audit(`Requested deletion for module "${name}"`);
      socket.emit('updateData', {
        type: 'module',
        data: {
          name,
          pendingDelete: true,
          deleteRequestedBy: S.auth.user
        }
      });
      save();
      toast(`Deletion request sent to admin for "${name}"`, 'success');
    });
    return;
  }
  openConfirm('Delete Module', `Delete module "${name}"?All test cases and bugs in this module will also be permanently deleted. This CANNOT be undone.`, () => {
    const deletedTCs = S.testCases.filter(t => t.module === name).map(t => t.id);
    const deletedBugIds = S.bugs.filter(b => b.module === name).map(b => b.id);
    S.testCases = S.testCases.filter(t => t.module !== name);
    S.bugs = S.bugs.filter(b => b.module !== name);
    S.modules = S.modules.filter(m => m !== name);
    S.modulesPendingDelete = (S.modulesPendingDelete || []).filter(m => m.name !== name);
    audit(`Module "${name}" and ${deletedTCs.length} linked test cases permanently deleted`);
    deletedTCs.forEach(tcId => {
      socket.emit('updateData', {
        type: 'testCase',
        data: {
          id: tcId,
          module: name,
          deleted: true
        }
      });
    });
    deletedBugIds.forEach(bugId => {
      socket.emit('updateData', {
        type: 'bug',
        data: {
          id: bugId,
          deleted: true
        }
      });
    });
    socket.emit('updateData', {
      type: 'module',
      data: {
        name,
        deleted: true
      }
    });
    save();
    toast(`Module "${name}" permanently deleted`, 'success');
  });
}
export function openAddModule() {
  if (S.role !== 'qa') {
    showBannedModal();
    return;
  }
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  showModal('Add Module', `
  <div class="field">
    <label>Module Name <span class="required">*</span></label>
    <input id="f-modname" placeholder="e.g. User Management, Payment, Reports">
  </div>`, () => {
    const name = document.getElementById('f-modname').value.trim();
    if (!name) {
      toast('Module name required', 'error');
      return;
    }
    if (S.modules.includes(name)) {
      toast('Module already exists', 'error');
      return;
    }
    S.modules.push(name);
    audit(`Module "${name}" added`);
    socket.emit('updateData', {
      type: 'module',
      data: {
        name
      }
    });
    closeModal();
    save();
    toast(`Module "${name}" added`, 'success');
  });
}
export function exportCSV() {
  let csv = 'Module,Total Tests,Pass,Fail,Total Bugs,Open Bugs,High Severity\n';
  S.modules.forEach(mod => {
    const tcs = S.testCases.filter(t => t.module === mod);
    const bugs = S.bugs.filter(b => b.module === mod);
    csv += `${mod},${tcs.length},${tcs.filter(t => t.status === 'Pass').length},${tcs.filter(t => t.status === 'Fail').length},${bugs.length},${bugs.filter(b => b.status === 'Open').length},${bugs.filter(b => b.severity === 'High').length}\n`;
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `qa-report-${now()}.csv`;
  a.click();
  audit('Report exported as CSV');
  toast('Report exported', 'success');
}

// ─────────────────────────── EDIT TEST CASE ───────────────────────────
export function handleImpDrop(e) {
  e.preventDefault();
  const dz = document.getElementById('imp-dropzone');
  if (dz) {
    dz.style.borderColor = '';
    dz.style.background = '';
  }
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (f) parseImpFile(f);else toast('No file detected', 'error');
}
export function handleImpFile(inp) {
  const f = inp && inp.files && inp.files[0];
  if (f) parseImpFile(f);
}
export function renderImpPreview(rows, warnings, filename) {
  const statsDiv = document.getElementById('imp-stats');
  const statusDiv = document.getElementById('imp-status');
  const preview = document.getElementById('imp-preview');
  if (!preview) return;
  const newRows = rows.filter((r, i) => {
    const firstIdx = rows.findIndex(rr => testcaseKeysMatch(rr, r));
    if (firstIdx !== i) return false;
    return !S.testCases.find(t => testcaseKeysMatch(t, r));
  });
  const skipCount = rows.length - newRows.length;
  const impBtn = document.getElementById('imp-btn');
  if (impBtn) {
    if (newRows.length > 0) {
      impBtn.style.opacity = '1';
      impBtn.style.pointerEvents = 'auto';
    } else {
      impBtn.style.opacity = '0.5';
      impBtn.style.pointerEvents = 'none';
    }
  }
  if (statsDiv) {
    statsDiv.innerHTML = `
          <div style="display:flex; justify-content:center; gap:32px; align-items:center; margin-bottom:12px;">
            <div style="display:flex; flex-direction:column; gap:4px; text-align:center;">
              <span style="color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; font-size:11px; font-weight:600;">Total rows</span>
              <strong style="font-size:24px; color:var(--text); line-height:1;">${rows.length}</strong>
            </div>
            <div style="display:flex; flex-direction:column; gap:4px; text-align:center;">
              <span style="color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; font-size:11px; font-weight:600;">Will import</span>
              <strong style="font-size:24px; color:var(--text); line-height:1;">${newRows.length}</strong>
            </div>
            ${skipCount ? `
            <div style="display:flex; flex-direction:column; gap:4px; text-align:center;">
              <span style="color:var(--yellow); text-transform:uppercase; letter-spacing:0.05em; font-size:11px; font-weight:600;">Will skip</span>
              <strong style="font-size:24px; color:var(--yellow); line-height:1;">${skipCount}</strong>
            </div>
            ` : ''}
            <div style="display:flex; flex-direction:column; gap:4px; text-align:center;">
              <span style="color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; font-size:11px; font-weight:600;">Auto-bugs</span>
              <strong style="font-size:24px; color:var(--text); line-height:1;">${newRows.filter(r => r.status === 'Fail' || r.status === 'Hold').length}</strong>
            </div>
          </div>
        `;
  }
  if (statusDiv) {
    statusDiv.innerHTML = '';
  }
  preview.style.marginTop = '0';
  preview.innerHTML = `
    <div style="display:flex; flex-direction:column; height:100%; min-height:0;">
      ${warnings.length ? `<div style="flex-shrink:0; font-size:13px;color:var(--text);border-left:2px solid var(--yellow);padding-left:16px;margin-bottom:16px;line-height:1.6;">${warnings.slice(0, 3).join('<br>')}</div>` : ''}
      <div style="flex-shrink:0; font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">Preview (first 8 rows)</div>
      <div style="flex:1; min-height:0; overflow-y:auto; border:1px solid var(--border); border-radius:4px; background:transparent;">
        <table style="width:100%;border-collapse:collapse;min-width:600px;">
          <thead>
            <tr>
              <th style="padding:10px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:600;letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase;">ID</th>
              <th style="padding:10px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:600;letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase;">Test Case</th>
              <th style="padding:10px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:600;letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase;">Module</th>
              <th style="padding:10px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:600;letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase;">Status</th>
              <th style="padding:10px 12px;font-size:11px;color:var(--text3);text-align:left;font-weight:600;letter-spacing:.05em;border-bottom:1px solid var(--border);text-transform:uppercase;">Severity</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 8).map((r, idx) => {
    const isStoredDupe = S.testCases.find(t => testcaseKeysMatch(t, r));
    const intraIdx = rows.findIndex(rr => testcaseKeysMatch(rr, r));
    const isIntraDup = intraIdx !== idx;
    const isDupe = isStoredDupe || isIntraDup;
    let dupeLbl = '';
    if (isStoredDupe) dupeLbl = 'stored';else if (isIntraDup) dupeLbl = 'repeat in file';
    return `<tr style="${isDupe ? 'opacity:.45;' : ''}" title="${isDupe ? `Skipped — ${dupeLbl}` : ''}">
                <td style="padding:6px 10px;font-family:var(--mono);font-size:11px;color:${isDupe ? 'var(--yellow)' : 'var(--text3)'};border-bottom:1px solid var(--border);">${r.id}${isDupe ? ' (skip)' : ''}</td>
                <td style="padding:6px 10px;font-size:12px;color:var(--text);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-bottom:1px solid var(--border);">${r.testCase}</td>
                <td style="padding:6px 10px;font-size:12px;color:var(--text2);border-bottom:1px solid var(--border);">${r.module}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--border);">${statusBadge(r.status)}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--border);">${sevBadge(r.severity)}</td>
              </tr>`;
  }).join('')}
          </tbody>
        </table>
        ${rows.length > 8 ? `<div style="padding:8px 10px;font-size:12px;color:var(--text3);background:var(--bg3);">...and ${rows.length - 8} more rows</div>` : ''}
      </div>
      ${newRows.length === 0 ? `<div style="margin-top:10px;padding:8px 12px;background:var(--yellow-bg);border:1px solid var(--yellow-border);border-radius:var(--radius);font-size:12px;color:var(--yellow);">All rows are duplicates nothing new to import.</div>` : ''}
    </div>`;
}
export
// ─────────────────────────── MODAL ENGINE ───────────────────────────
let _submitCb = null;
export function attachHandlers() {}
// ─── INIT ───
render();

// ─── LIVE CLOCK (updates every second without re-rendering) ───
setInterval(() => {
  const el = document.getElementById('live-clock');
  if (el) el.textContent = formatDate(nowFull());
  const fcH = document.getElementById('fc-hours');
  const fcM = document.getElementById('fc-mins');
  const fcS = document.getElementById('fc-secs');
  const fcA = document.getElementById('fc-ampm');
  if (fcH && fcM && fcS && fcA) {
    const d = new Date();
    const rawHour = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const s = d.getSeconds().toString().padStart(2, '0');
    fcA.textContent = rawHour >= 12 ? 'PM' : 'AM';
    const fcG = document.getElementById('login-greeting');
    if (fcG && s === '00' && m === '00') {
      let greeting = 'Good Night';
      let greetIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text)"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      if (rawHour >= 5 && rawHour < 12) {
        greeting = 'Good Morning';
        greetIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      } else if (rawHour >= 12 && rawHour < 17) {
        greeting = 'Good Afternoon';
        greetIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--yellow)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      } else if (rawHour >= 17 && rawHour < 21) {
        greeting = 'Good Evening';
        greetIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"></path><line x1="12" y1="2" x2="12" y2="9"></line><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line><line x1="1" y1="18" x2="3" y2="18"></line><line x1="21" y1="18" x2="23" y2="18"></line><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line><line x1="23" y1="22" x2="1" y2="22"></line><polyline points="16 5 12 9 8 5"></polyline></svg>';
      }
      fcG.innerHTML = greetIcon + ' <span>' + greeting + '</span>';
    }
    let h = rawHour % 12 || 12;
    fcH.textContent = h;
    fcM.textContent = m;
    fcS.textContent = s;
  }
}, 1000);