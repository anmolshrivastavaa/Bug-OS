
    // ─────────────────────────── STATE ───────────────────────────


    // Socket.IO connection
    const socket = io();

    /** Business key fields for test cases: same TC number must be allowed across different modules. */
    function normalizeTcRowId(v) {
      return v === undefined || v === null ? '' : String(v).trim();
    }
    function normalizeTcModule(v) {
      return v === undefined || v === null ? '' : String(v).trim();
    }
    function normalizeStatus(v) {
      return v === undefined || v === null ? '' : String(v).trim().toLowerCase();
    }
    function testcaseKeysMatch(tc, data) {
      return normalizeTcRowId(tc.id) === normalizeTcRowId(data.id)
        && normalizeTcModule(tc.module) === normalizeTcModule(data.module);
    }
    function bugRefsTestCaseKeys(bug, tcId, module) {
      return normalizeTcRowId(bug.tcId) === normalizeTcRowId(tcId)
        && normalizeTcModule(bug.module) === normalizeTcModule(module);
    }

    let initialDataReceived = false;
    let currentTheme = localStorage.getItem('theme') || 'light';
    let S = {
      auth: { loggedIn: false, user: null },
      role: null,
      view: 'dashboard',
      modules: [],
      testCases: [],
      bugs: [],
      auditLog: [],
      tcCounter: 0,
      bugCounter: 0,
      automationScripts: [],
      selectedAutomationModule: '',
      selectedAutomationTc: '',
      users: [],
      hmModFilter: [],
      hmModDropdownOpen: false
    };
    function applyTheme() {
      document.documentElement.dataset.theme = currentTheme;
      localStorage.setItem('theme', currentTheme);
    }
    function toggleTheme() {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme();
      render();
    }
    function toggleHmModDropdown(e) {
      if (e) e.stopPropagation();
      S.hmModDropdownOpen = !S.hmModDropdownOpen;
      render();
    }
    function toggleHmModFilter(e, mod) {
      if (e) e.stopPropagation();
      if (!S.hmModFilter) S.hmModFilter = [];
      if (S.hmModFilter.includes(mod)) {
        S.hmModFilter = S.hmModFilter.filter(m => m !== mod);
      } else {
        S.hmModFilter.push(mod);
      }
      render();
    }
    function removeHmModFilter(e, mod) {
      if (e) e.stopPropagation();
      if (!S.hmModFilter) S.hmModFilter = [];
      S.hmModFilter = S.hmModFilter.filter(m => m !== mod);
      render();
    }
    function clearHmModFilter(e) {
      if (e) e.stopPropagation();
      S.hmModFilter = [];
      render();
    }
    function toggleDashModDropdown(e) {
      if (e) e.stopPropagation();
      S.dashModDropdownOpen = !S.dashModDropdownOpen;
      render();
    }
    function toggleDashModFilter(e, mod) {
      if (e) e.stopPropagation();
      if (!S.dashModFilter) S.dashModFilter = [];
      if (S.dashModFilter.includes(mod)) {
        S.dashModFilter = S.dashModFilter.filter(m => m !== mod);
      } else {
        S.dashModFilter.push(mod);
      }
      render();
    }
    function removeDashModFilter(e, mod) {
      if (e) e.stopPropagation();
      if (!S.dashModFilter) S.dashModFilter = [];
      S.dashModFilter = S.dashModFilter.filter(m => m !== mod);
      render();
    }
    function clearDashModFilter(e) {
      if (e) e.stopPropagation();
      S.dashModFilter = [];
      render();
    }
    document.addEventListener('click', function (e) {
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
    socket.on('initialData', (serverData) => {
      S = {
        auth: S.auth,
        role: S.role,
        view: S.view,
        modules: serverData.modules || [],
        testCases: (serverData.testCases || []).map(tc => ({
          ...tc,
          id: normalizeTcRowId(tc.id),
          module: normalizeTcModule(tc.module)
        })),
        bugs: serverData.bugs || [],
        auditLog: serverData.auditLog || [],
        tcCounter: typeof serverData.tcCounter === 'number' ? serverData.tcCounter : 0,
        bugCounter: typeof serverData.bugCounter === 'number' ? serverData.bugCounter : 0,
        automationScripts: serverData.automationScripts || [],
        users: serverData.users || [],
        hmModFilter: S.hmModFilter || [],
        hmModDropdownOpen: S.hmModDropdownOpen || false,
        dashModFilter: S.dashModFilter || [],
        dashModDropdownOpen: S.dashModDropdownOpen || false
      };
      initialDataReceived = true;
      render();
    });

    socket.on('dataUpdate', (update) => {
      if (update.type === 'testCase') {
        if (update.data.deleted) {
          const delId = normalizeTcRowId(update.data.id);
          const delMod = normalizeTcModule(update.data.module);
          if (delId && delMod) {
            S.testCases = S.testCases.filter(tc =>
              !(normalizeTcRowId(tc.id) === delId && normalizeTcModule(tc.module) === delMod)
            );
          }
          // Never delete-by-id-only: different modules reuse the same TC numbers on purpose.
        } else {
          const { _id, __v, ...payload } = update.data || {};
          const pid = normalizeTcRowId(payload.id);
          const pm = normalizeTcModule(payload.module);
          if (pid && pm) {
            const normalizedPayload = { ...payload, id: pid, module: pm };
            const index = S.testCases.findIndex(tc => testcaseKeysMatch(tc, normalizedPayload));
            if (index !== -1) {
              S.testCases[index] = { ...S.testCases[index], ...normalizedPayload };
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
            S.bugs[index] = { ...S.bugs[index], ...update.data };
          } else {
            S.bugs.push(update.data);
          }
        }
      } else if (update.type === 'audit') {
        S.auditLog.unshift(update.data);
        if (S.auditLog.length > 200) {
          S.auditLog = S.auditLog.slice(0, 200);
        }
      } else if (update.type === 'counters') {
        S.tcCounter = update.data.tcCounter;
        S.bugCounter = update.data.bugCounter;
      } else if (update.type === 'module') {
        if (update.data.deleted) {
          S.modules = S.modules.filter(m => m !== update.data.name);
        } else if (update.data.name && !S.modules.includes(update.data.name)) {
          S.modules.push(update.data.name);
        }
      } else if (update.type === 'automationScript') {
        if (update.data.deleted) {
          S.automationScripts = S.automationScripts.filter(s => !(s.testCaseId === update.data.testCaseId && s.module === update.data.module));
        } else {
          const index = S.automationScripts.findIndex(s => s.testCaseId === update.data.testCaseId && s.module === update.data.module);
          if (index !== -1) {
            S.automationScripts[index] = { ...S.automationScripts[index], ...update.data };
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
            S.users[index] = { ...S.users[index], ...update.data };
          } else {
            S.users.push(update.data);
          }
        }
      }
      render();
    });

    socket.on('error', (err) => {
      console.error('Server error:', err);
      toast((err && err.message) || 'Server connection error', 'error');
    });

    let _persistErrNotifiedAt = 0;
    socket.on('persistError', (err) => {
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
      initialDataReceived = false;
      render();
    });

    function save() {
      render();
    }

    function formatDate(dStr) {
      if (!dStr || dStr === '—') return '—';
      let s = String(dStr);
      if (s.endsWith('Z')) {
        const d = new Date(s);
        if (!isNaN(d)) {
          const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
          s = istDate.toISOString().slice(0, 19).replace('T', ' ');
        }
      }
      let clean = s.replace('T', ' ').replace(/\.\d{3}Z$/, '');
      const m = clean.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}${m[4]}`;
      return clean;
    }

    function now() {
      const d = new Date();
      const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      return istDate.toISOString().slice(0, 10);
    }
    function nowFull() {
      const d = new Date();
      const istDate = new Date(d.getTime() + (5.5 * 60 * 60 * 1000));
      return istDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    function textMatchesQuery(v, q) {
      if (!q) return true;
      return String(v || '').toLowerCase().includes(q.toLowerCase());
    }

    let _liveFilterTimer = null;
    function liveFilter(el) {
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

    function loginUser() {
      const username = document.getElementById('login-user').value.trim();
      const password = document.getElementById('login-pass').value.trim();
      const auth = S.users.find(u => u.username === username && u.password === password);
      if (!auth) {
        toast('Invalid username or password', 'error');
        return;
      }
      S.auth = { loggedIn: true, user: auth.username };
      S.role = auth.role;
      S.view = 'dashboard';
      save();
      toast(`Welcome ${auth.username}`, 'success');
      render();
    }

    function logout() {
      S.auth = { loggedIn: false, user: null };
      S.role = null;
      S.view = 'dashboard';
      save();
      toast('Logged out successfully', 'info');
      render();
    }

    function audit(event, actor) {
      const auditEntry = { time: nowFull(), event, actor: actor || (S.auth ? S.auth.user : 'system') };
      S.auditLog.unshift(auditEntry);
      if (S.auditLog.length > 200) S.auditLog = S.auditLog.slice(0, 200);

      // Send audit update to server
      socket.emit('updateData', { type: 'audit', data: auditEntry });
    }

    // ─────────────────────────── TOAST ───────────────────────────
    function toast(msg, type = 'info') {
      const c = document.getElementById('toasts');
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      const icons = { success: '✓', error: '✕', info: 'ℹ' };
      el.innerHTML = `<span style="color:${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--accent)'}">${icons[type]}</span> ${msg}`;
      c.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }

    // ─────────────────────────── CONFIRM ───────────────────────────
    let _confirmCb = null;
    function openConfirm(title, msg, cb, btnText = 'Delete permanently', btnClass = 'btn-danger') {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-msg').textContent = msg;
      _confirmCb = cb;
      const confirmBtn = document.getElementById('confirm-ok');
      confirmBtn.textContent = btnText;
      confirmBtn.className = `btn ${btnClass}`;
      document.getElementById('confirm-overlay').classList.add('open');
      confirmBtn.onclick = () => { closeConfirm(); cb(); };
    }
    function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); }

    // ─────────────────────────── RENDER ───────────────────────────
    function render() {
      const app = document.getElementById('app');
      let scrollContent = 0;
      const contentEl = document.getElementById('content');
      if (contentEl) scrollContent = contentEl.scrollTop;

      if (!initialDataReceived) {
        app.innerHTML = buildLoading();
        return;
      }
      if (!S.auth.loggedIn) {
        app.innerHTML = buildLogin();
        return;
      }
      app.innerHTML = buildApp();
      attachHandlers();

      const newContentEl = document.getElementById('content');
      if (newContentEl) newContentEl.scrollTop = scrollContent;
    }

    function buildLoading() {
      return `
  <div style="flex: 1; width: 100%; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(34,197,94,0.08), transparent 30%), #0a0c0f;">
    <div class="loader-wrapper">
      <div class="loader-ring"></div>
      <img src="draft.png" class="loader-image" alt="Loading" />
    </div>
  </div>`;
    }

    function buildLogin() {
      return `
  <div class="login-screen">
    <div class="login-icon"><img src="login-icon.png" alt="Login" /></div>
    <div class="login-card">
      <div class="login-title">Bug OS - Unified QA Management Platform</div>
      <div class="login-copy">Sign in as QA, Developer, or Admin to continue.</div>
      <div class="field">
        <label>Username</label>
        <input id="login-user" placeholder="Enter username" autocomplete="username">
      </div>
      <div class="field">
        <label>Password</label>
        <input id="login-pass" type="password" placeholder="Enter password" autocomplete="current-password">
      </div>
      <button class="btn btn-primary" onclick="loginUser()">Sign In</button>
    </div>
    <div class="login-company"><img src="company icon.png" alt="Company Logo"></div>
  </div>`;
    }

    function buildApp() {
      const openBugs = S.bugs.filter(b => normalizeStatus(b.status) === 'open').length;
      const escalatedCount = S.bugs.filter(b => normalizeStatus(b.status) === 'escalated').length;
      const retestPending = S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length;
      return `
  <div class="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon"><img src="sidebar%20icon.png" alt="BUG OS" /></div>
      <div class="logo-text">
        <div class="logo-mark">QA · TRACKER</div>
        <div class="logo-name">BUG OS</div>
      </div>
    </div>
    <div class="sidebar-user">
      <div class="user-role-badge ${S.role === 'qa' ? 'role-qa' : S.role === 'dev' ? 'role-dev' : 'role-admin'}" style="display:flex; justify-content:center; width:100%; padding:8px 0; font-size:12px;">${S.role === 'qa' ? 'QA Panel' : S.role === 'dev' ? 'Developer Panel' : 'Admin Panel'}</div>
    </div>
    <nav class="nav">
      ${navItem('dashboard', '◫', 'Dashboard', 0)}
      ${navItem('testcases', '✓', 'Test Cases', 0)}
      ${navItem('bugs', '⚑', 'Bug Reports', openBugs)}
      ${navItem('retest', '↺', 'Retest Queue', retestPending)}
      ${navItem('escalations', '{}', 'Backend Bugs', escalatedCount)}
      ${navItem('automation', '⊙', 'Automation', 0)}
      ${navItem('modules', '⊞', 'Modules', 0)}
      ${navItem('audit', '≡', 'Audit Log', 0)}
      ${navItem('report', '◈', 'Reports', 0)}
      ${S.role === 'admin' ? navItem('users', '⚙', 'User Management', 0) : ''}
    </nav>
    <div class="sidebar-switch">
      <div class="switch-label">Session</div>
      ${S.auth.user !== 'ADMIN' ? `<button class="role-btn" style="margin-bottom:6px" onclick="openChangePassword()">Change Password</button>` : ''}
      <button class="role-btn" onclick="logout()">Logout    ⏻  </button>   
    </div>
  </div>
  <div class="main">
    ${buildTopbar()}
    <div class="content" id="content">
      ${buildView()}
    </div>
  </div>
  `;
    }

    function navItem(id, icon, label, badge) {
      return `<div class="nav-item ${S.view === id ? 'active' : ''}" onclick="nav('${id}')">
    <span class="nav-icon">${icon}</span> ${label}
    ${badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
  </div>`;
    }

    function buildTopbar() {
      if (['dashboard', 'testcases', 'bugs', 'retest', 'escalations', 'automation', 'modules', 'audit', 'report', 'users'].includes(S.view)) return '';
      const titles = { dashboard: 'Dashboard', testcases: 'Test Cases', bugs: 'Bug Reports', retest: 'Retest Queue', escalations: 'Backend Escalations', automation: 'Automation', modules: 'Modules', audit: 'Audit Log', report: 'Reports', users: 'User Management' };
      let actions = '';
      if (S.view === 'testcases' && S.role === 'qa') {
        actions = `<button class="btn btn-ghost btn-sm" onclick="openImportCSV()">↑ Import Test Cases</button><button class="btn btn-ghost btn-sm" onclick="openAddTC()">+ Add Test Case</button>`;
      }
      if (S.view === 'modules' && S.role === 'qa') {
        actions = `<button class="btn btn-ghost btn-sm" onclick="openAddModule()">+ Add Module</button>`;
      }
      return `<div class="topbar">
    <div class="topbar-left">
      <div class="page-title">${titles[S.view] || 'Dashboard'}</div>
    </div>
    <div class="topbar-right">
      <div class="topbar-actions">
        ${actions}
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      </div>
      <div class="page-sub" id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;">${formatDate(nowFull())}</div>
    </div>
  </div>`;
    }

    function buildView() {
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
    function buildUsers() {
      if (S.role !== 'admin') return '<div class="empty">Unauthorized</div>';

      const rows = S.users.map(u => `
        <tr>
          <td><div class="td-title">${u.username}</div></td>
          <td><div class="user-role-badge ${u.role === 'qa' ? 'role-qa' : u.role === 'dev' ? 'role-dev' : 'role-admin'}">${u.role.toUpperCase()}</div></td>
          <td><div style="font-family:var(--mono);font-size:12px;color:var(--text2)">${u.initialPassword || '<span style="opacity:0.5">Not Recorded</span>'}</div></td>
          <td class="date-col">${formatDate(u.createdAt)}</td>
          <td>
            ${u.username === S.auth.user ? '<span class="badge" style="background:var(--accent);color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;">You</span>' : (u.username === 'ADMIN' ? '<span class="badge" style="background:var(--bg3);color:var(--text2);padding:2px 6px;border-radius:4px;font-size:11px;">System</span>' : `<button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">Delete</button>`)}
          </td>
        </tr>
      `).join('');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">User Management</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="btn btn-ghost btn-sm" onclick="openAddUser()">+ Create User</button>
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
        <div class="section">
          <div class="section-hdr">
            <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">User Management</div><div class="section-meta">${S.users.length} users</div></div>
          </div>
          <div class="tbl-wrap scrollable">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Initial Password</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td colspan="5" class="empty">No users found.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    function openAddUser() {
      const body = `
        <div class="form-grid">
          <div class="field">
            <label>Username</label>
            <input id="u-name" placeholder="Enter username">
          </div>
          <div class="field">
            <label>Password</label>
            <input id="u-pass" type="password" placeholder="Enter password">
          </div>
          <div class="field">
            <label>Role</label>
            <select id="u-role">
              <option value="qa">QA</option>
              <option value="dev">Developer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      `;
      showModal('Create User', body, () => {
        const username = document.getElementById('u-name').value.trim();
        const password = document.getElementById('u-pass').value.trim();
        const role = document.getElementById('u-role').value;
        if (!username || !password || !role) {
          toast('Please fill all fields', 'error');
          return;
        }
        if (S.users.find(u => u.username === username)) {
          toast('Username already exists', 'error');
          return;
        }
        const newUser = {
          username,
          password,
          initialPassword: password,
          role,
          createdAt: nowFull()
        };
        socket.emit('updateData', { type: 'user', data: newUser });
        audit(`Created user ${username} (${role})`);
        toast('User created', 'success');
        closeModal();
      });
    }

    function deleteUser(username) {
      if (username === 'ADMIN') {
        toast('Cannot delete the root ADMIN user', 'error');
        return;
      }
      openConfirm(`Delete User`, `Are you sure you want to delete user ${username}?`, () => {
        socket.emit('updateData', { type: 'user', data: { username, deleted: true } });
        audit(`Deleted user ${username}`);
        toast('User deleted', 'success');
      });
    }

    function openChangePassword() {
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

        const updatedUser = { ...user, password: newPass };
        socket.emit('updateData', { type: 'user', data: updatedUser });
        audit(`User ${S.auth.user} changed their password`);
        toast('Password updated successfully', 'success');
        closeModal();
      });
    }

    // ─────────────────────────── BACKEND ESCALATIONS ───────────────────────────
    function buildEscalations() {
      const escModF = (document.getElementById('escModF') || { value: '' }).value;
      const escSevF = (document.getElementById('escSevF') || { value: '' }).value;
      const escQ = (document.getElementById('escQ') || { value: '' }).value.trim().toLowerCase();
      let bugs = S.bugs.filter(b => b.status === 'Escalated');
      if (escModF) bugs = bugs.filter(b => b.module === escModF);
      if (escSevF) bugs = bugs.filter(b => b.severity === escSevF);
      if (escQ) {
        bugs = bugs.filter(b => {
          const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
          return [
            b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity,
            b.escalationReason, b.devNotes, linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes
          ].some(v => textMatchesQuery(v, escQ));
        });
      }
      const modOpts = S.modules.map(m => `<option value="${m}"${escModF === m ? ' selected' : ''}>${m}</option>`).join('');
      const isDev = S.role === 'dev';
      const rows = bugs.map(b => {
        const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
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

      <td><div style="display:flex;flex-direction:column;gap:4px;align-items:stretch;min-width:max-content;">${actions}</div></td>
    </tr>`;
      }).join('');
      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Backend Escalations</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Backend Escalations</div><div class="section-meta">${bugs.length} Shown · ${S.bugs.filter(b => b.status === 'Escalated').length} Total</div></div>
      <div style="font-size:12px;color:var(--text);position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;">${isDev ? 'Waiting for Backend Team to resolve' : 'Escalated by Frontend Team'}</div>
      <div class="filters">
        <select class="filter-select" id="escModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select" id="escSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${escSevF === 'High' ? ' selected' : ''}>High</option>
          <option${escSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${escSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <input class="filter-select" id="escQ" placeholder="Search escalations..." value="${escQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
      </div>
    </div>
    ${bugs.length === 0
          ? `<div class="empty"><div class="empty-icon">⬆</div>No escalations. All bugs are frontend-resolvable!</div>`
          : `<div class="tbl-wrap scrollable"><table>
          <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`}
  </div>`;
    }

    // ─────────────────────────── MODULE-WISE TRACKER ───────────────────────────
    function buildModuleTracker() {
      // Collect all dates with data
      const allDates = new Set();

      S.testCases.forEach(tc => {
        if (tc.createdAt) {
          const date = tc.createdAt.split(' ')[0];
          allDates.add(date);
        }
      });

      S.bugs.forEach(bug => {
        if (bug.fixedAt) {
          const date = bug.fixedAt.split(' ')[0];
          allDates.add(date);
        }
        if (bug.retestAt) {
          const date = bug.retestAt.split(' ')[0];
          allDates.add(date);
        }
      });

      // Sort dates
      let dates = Array.from(allDates).sort();
      if (dates.length === 0) {
        // Generate last 7 days if no data
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
        }
      } else if (dates.length > 14) {
        dates = dates.slice(-14);
      }

      // Build data structure: date -> metric -> {module: count}
      const chartData = {};
      dates.forEach(date => {
        chartData[date] = {
          testCreated: {},
          bugFixed: {},
          retestDone: {}
        };
      });

      // Count test cases created per module per date
      S.testCases.forEach(tc => {
        if (tc.createdAt && tc.module) {
          const date = tc.createdAt.split(' ')[0];
          if (chartData[date]) {
            if (!chartData[date].testCreated[tc.module]) chartData[date].testCreated[tc.module] = 0;
            chartData[date].testCreated[tc.module]++;
          }
        }
      });

      // Count bugs fixed per module per date
      S.bugs.forEach(bug => {
        if (bug.fixedAt && bug.module) {
          const date = bug.fixedAt.split(' ')[0];
          if (chartData[date]) {
            if (!chartData[date].bugFixed[bug.module]) chartData[date].bugFixed[bug.module] = 0;
            chartData[date].bugFixed[bug.module]++;
          }
        }
      });

      // Count retests done per module per date
      S.bugs.forEach(bug => {
        if (bug.retestAt && bug.module) {
          const date = bug.retestAt.split(' ')[0];
          if (chartData[date]) {
            if (!chartData[date].retestDone[bug.module]) chartData[date].retestDone[bug.module] = 0;
            chartData[date].retestDone[bug.module]++;
          }
        }
      });

      // Calculate totals and find max value
      const totals = {};
      dates.forEach(date => {
        totals[date] = {
          testCreated: Object.values(chartData[date].testCreated).reduce((a, b) => a + b, 0),
          bugFixed: Object.values(chartData[date].bugFixed).reduce((a, b) => a + b, 0),
          retestDone: Object.values(chartData[date].retestDone).reduce((a, b) => a + b, 0)
        };
      });

      let maxValue = 0;
      Object.values(totals).forEach(dayData => {
        maxValue = Math.max(maxValue, dayData.testCreated, dayData.bugFixed, dayData.retestDone);
      });
      maxValue = Math.max(maxValue, 5);

      // Generate interactive SVG chart
      const chartHeight = 500;
      const padding = 80;
      const leftPad = padding + 6; // move chart start slightly right of Y-axis
      const rightPad = 20; // small right margin
      const barGroupWidth = 80; // fixed gap between dates
      const requiredGraphWidth = dates.length * barGroupWidth;
      const graphHeight = chartHeight - padding * 2;
      const barWidth = 12; // wider bars
      const barGap = 4; // gap between bars within a date
      const minChartWidth = leftPad + requiredGraphWidth + padding + rightPad;

      let chartSVG = `<svg width="100%" height="${chartHeight}" style="min-width:${minChartWidth}px; border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);overflow:visible;cursor:default;">`;

      // Background grid
      for (let i = 0; i <= 5; i++) {
        const y = padding + (graphHeight / 5) * i;
        const value = Math.round(maxValue * (5 - i) / 5);
        chartSVG += `<line x1="${leftPad}" y1="${y}" x2="100%" y2="${y}" stroke="var(--border)" stroke-dasharray="2,2" stroke-width="0.5"/>`;
        chartSVG += `<text x="${leftPad - 10}" y="${y + 4}" font-size="11" fill="var(--text3)" text-anchor="end">${value}</text>`;
      }

      // Y-axis (moved to leftPad)
      chartSVG += `<line x1="${leftPad}" y1="${padding}" x2="${leftPad}" y2="${chartHeight - padding}" stroke="var(--border)" stroke-width="1.5"/>`;
      chartSVG += `<text x="40" y="${chartHeight / 2}" font-size="12" fill="var(--text3)" text-anchor="middle" transform="rotate(-90 40 ${chartHeight / 2})">Work Count</text>`;

      // X-axis
      chartSVG += `<line x1="${leftPad}" y1="${chartHeight - padding}" x2="100%" y2="${chartHeight - padding}" stroke="var(--border)" stroke-width="1.5"/>`;
      chartSVG += `<text x="50%" y="${chartHeight - padding + 40}" font-size="12" fill="var(--text3)" text-anchor="middle">Dates</text>`;

      // Draw bars for each date
      dates.forEach((date, dateIdx) => {
        const baseX = leftPad + (dateIdx * barGroupWidth);
        const centerX = baseX + barGroupWidth / 2;

        const testCount = totals[date].testCreated;
        const fixCount = totals[date].bugFixed;
        const retestCount = totals[date].retestDone;

        // Bar 1: Test Created (Blue)
        let testHeight = (testCount / maxValue) * graphHeight;
        let testY = chartHeight - padding - testHeight;
        const testX1 = centerX - barWidth - barGap;
        if (!testHeight || testHeight < 2) { testHeight = 2; testY = chartHeight - padding - testHeight; chartSVG += `<rect x="${testX1}" y="${testY}" width="${barWidth}" height="${testHeight}" fill="var(--accent)" opacity="0.35" class="bar-test zero" data-date="${date}" data-metric="testCreated" data-count="${testCount}" style="cursor:pointer;"/>`; }
        else { chartSVG += `<rect x="${testX1}" y="${testY}" width="${barWidth}" height="${testHeight}" fill="var(--accent)" opacity="0.85" class="bar-test" data-date="${date}" data-metric="testCreated" data-count="${testCount}" style="cursor:pointer;"/>`; }

        // Bar 2: Bug Fixed (Green)
        let fixHeight = (fixCount / maxValue) * graphHeight;
        let fixY = chartHeight - padding - fixHeight;
        const fixX = centerX;
        if (!fixHeight || fixHeight < 2) { fixHeight = 2; fixY = chartHeight - padding - fixHeight; chartSVG += `<rect x="${fixX}" y="${fixY}" width="${barWidth}" height="${fixHeight}" fill="var(--green)" opacity="0.35" class="bar-fix zero" data-date="${date}" data-metric="bugFixed" data-count="${fixCount}" style="cursor:pointer;"/>`; }
        else { chartSVG += `<rect x="${fixX}" y="${fixY}" width="${barWidth}" height="${fixHeight}" fill="var(--green)" opacity="0.85" class="bar-fix" data-date="${date}" data-metric="bugFixed" data-count="${fixCount}" style="cursor:pointer;"/>`; }

        // Bar 3: Retest Done (Orange)
        let retestHeight = (retestCount / maxValue) * graphHeight;
        let retestY = chartHeight - padding - retestHeight;
        const retestX = centerX + barWidth + barGap;
        if (!retestHeight || retestHeight < 2) { retestHeight = 2; retestY = chartHeight - padding - retestHeight; chartSVG += `<rect x="${retestX}" y="${retestY}" width="${barWidth}" height="${retestHeight}" fill="var(--orange)" opacity="0.35" class="bar-retest zero" data-date="${date}" data-metric="retestDone" data-count="${retestCount}" style="cursor:pointer;"/>`; }
        else { chartSVG += `<rect x="${retestX}" y="${retestY}" width="${barWidth}" height="${retestHeight}" fill="var(--orange)" opacity="0.85" class="bar-retest" data-date="${date}" data-metric="retestDone" data-count="${retestCount}" style="cursor:pointer;"/>`; }

        // Date label on X-axis
        chartSVG += `<text x="${centerX}" y="${chartHeight - padding + 25}" font-size="11" fill="var(--text3)" text-anchor="middle">${formatDate(date)}</text>`;
      });

      chartSVG += `</svg>`;

      // Legend and instructions
      const legend = `
        <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap;padding:12px;background:var(--bg3);border-radius:var(--radius);align-items:center;justify-content:center;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--accent);border-radius:2px;"></div>
              <span style="font-size:12px;">Test Cases Created</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--green);border-radius:2px;"></div>
              <span style="font-size:12px;">Bugs Fixed</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--orange);border-radius:2px;"></div>
              <span style="font-size:12px;">Retests Done</span>
            </div>
          </div>
        </div>
      `;

      // Tooltip container
      const tooltipId = 'moduleTrackerTooltip_' + Math.random().toString(36).substr(2, 9);
      const tooltip = `<div id="${tooltipId}" style="position:fixed;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:12px;font-size:11px;max-width:300px;z-index:9999;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;">Module Breakdown</div>`;

      const html = `<div style="position:relative;overflow-x:auto;padding:16px;background:var(--bg3);border-radius:var(--radius);">
        ${chartSVG}
        ${tooltip}
        ${legend}
      </div>`;

      // Setup event listeners after the DOM is rendered
      setTimeout(() => {
        const tooltip = document.getElementById(tooltipId);
        if (!tooltip) return;

        const parent = tooltip.parentElement;
        const chart = parent.querySelector('svg');
        if (!chart) return;

        const bars = chart.querySelectorAll('rect[data-metric]');

        bars.forEach(bar => {
          bar.addEventListener('mouseenter', function (e) {
            const date = this.getAttribute('data-date');
            const metric = this.getAttribute('data-metric');
            const count = parseInt(this.getAttribute('data-count'));

            // Get module breakdown from our data
            let moduleBreakdown = [];
            const metrics = {
              'testCreated': 'Test Cases Created',
              'bugFixed': 'Bugs Fixed',
              'retestDone': 'Retests Done'
            };

            // Build breakdown from stored data
            if (metric === 'testCreated') {
              const tcs = S.testCases.filter(tc => tc.module && tc.createdAt && tc.createdAt.split(' ')[0] === date);
              const modCounts = {};
              tcs.forEach(tc => {
                modCounts[tc.module] = (modCounts[tc.module] || 0) + 1;
              });
              moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
            } else if (metric === 'bugFixed') {
              const bugs = S.bugs.filter(b => b.module && b.fixedAt && b.fixedAt.split(' ')[0] === date);
              const modCounts = {};
              bugs.forEach(b => {
                modCounts[b.module] = (modCounts[b.module] || 0) + 1;
              });
              moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
            } else if (metric === 'retestDone') {
              const bugs = S.bugs.filter(b => b.module && b.retestAt && b.retestAt.split(' ')[0] === date);
              const modCounts = {};
              bugs.forEach(b => {
                modCounts[b.module] = (modCounts[b.module] || 0) + 1;
              });
              moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
            }

            let html = '<div style="font-weight:600;margin-bottom:8px;color:var(--text);">' + metrics[metric] + '</div>';
            html += '<div style="font-size:11px;color:var(--text3);margin-bottom:6px;">Date: ' + formatDate(date) + ' | Total: ' + count + '</div>';
            html += '<div style="border-top:1px solid var(--border);padding-top:8px;"><strong>Module Breakdown:</strong><br/>';

            if (moduleBreakdown.length > 0) {
              moduleBreakdown.forEach(([mod, cnt]) => {
                html += '<div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--text);">';
                html += '<span>' + mod + ':</span>';
                html += '<span style="font-family:var(--mono);font-weight:600;">' + cnt + '</span>';
                html += '</div>';
              });
            } else {
              html += '<div style="color:var(--text3);padding:4px 0;">No data</div>';
            }
            html += '</div>';

            tooltip.innerHTML = html;
            tooltip.style.display = 'block';

            const rect = this.getBoundingClientRect();
            let tooltipX = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
            let tooltipY = rect.top - tooltip.offsetHeight - 10;

            if (tooltipY < 10) {
              tooltipY = rect.bottom + 10;
            }

            tooltip.style.left = tooltipX + 'px';
            tooltip.style.top = tooltipY + 'px';
          });

          bar.addEventListener('mouseleave', function () {
            tooltip.style.display = 'none';
          });
        });
      }, 100);

      return html;
    }

    function buildModuleHeatmap() {
      const hmModFilter = S.hmModFilter || [];
      const displayedModules = hmModFilter.length > 0 ? S.modules.filter(m => hmModFilter.includes(m)) : S.modules;

      let maxPass = 1, maxFail = 1, maxHold = 1;
      const modData = displayedModules.map(mod => {
        const tcs = S.testCases.filter(t => t.module === mod);
        const p = tcs.filter(t => t.status === 'Pass').length;
        const f = tcs.filter(t => t.status === 'Fail').length;
        const h = tcs.filter(t => t.status === 'Hold').length;
        maxPass = Math.max(maxPass, p);
        maxFail = Math.max(maxFail, f);
        maxHold = Math.max(maxHold, h);
        return { mod, p, f, h };
      });

      const modHeaders = displayedModules.map(m =>
        `<div style="padding:10px 4px 4px 4px; font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:0.06em; background:var(--bg2); display:flex; align-items:flex-start; justify-content:center; text-align:center; min-height:100px;"><span style="writing-mode:vertical-rl; transform:rotate(180deg);">${m}</span></div>`
      ).join('');

      if (!window.hmHover) {
        window.hmHover = function (e, id, text) {
          const tt = document.getElementById(id);
          if (tt) {
            tt.innerHTML = text;
            tt.style.display = 'block';
            let left = e.clientX + 15;
            let top = e.clientY + 15;
            if (left + tt.offsetWidth > window.innerWidth) left = e.clientX - tt.offsetWidth - 15;
            if (top + tt.offsetHeight > window.innerHeight) top = e.clientY - tt.offsetHeight - 15;
            tt.style.left = left + 'px';
            tt.style.top = top + 'px';
          }
        };
        window.hmLeave = function (id) {
          const tt = document.getElementById(id);
          if (tt) tt.style.display = 'none';
        };
      }

      const tooltipId = 'hmTooltip_' + Math.random().toString(36).substr(2, 9);
      const tooltipHTML = `<div id="${tooltipId}" style="position:fixed;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:8px 12px;font-size:12px;font-family:var(--font);font-weight:600;color:var(--text);z-index:9999;display:none;box-shadow:0 4px 12px rgba(0,0,0,0.3);pointer-events:none;white-space:nowrap;"></div>`;

      const passRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Pass</div>` +
        modData.map((d) => {
          const pPct = d.p ? Math.max(8, Math.round((d.p / maxPass) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, var(--green) ${pPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Pass: ${d.p}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
        }).join('');

      const failRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Fail</div>` +
        modData.map((d) => {
          const fPct = d.f ? Math.max(8, Math.round((d.f / maxFail) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, var(--red) ${fPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Fail: ${d.f}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
        }).join('');

      const holdRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:600; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Hold</div>` +
        modData.map((d) => {
          const hPct = d.h ? Math.max(8, Math.round((d.h / maxHold) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, #f97316 ${hPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Hold: ${d.h}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
        }).join('');

      return `
      ${tooltipHTML}
      <div style="padding:24px; overflow-x:auto;">
        <div style="display:grid; grid-template-columns: 80px repeat(${displayedModules.length}, minmax(40px, 1fr)); gap:0; background:transparent; border:none; overflow:hidden; min-width:max-content; border-radius:var(--radius);">
          ${passRow}
          ${failRow}
          ${holdRow}
          <div style="background:transparent; min-height:100px;"></div>
          ${modHeaders}
        </div>
      </div>
      `;
    }

    // ─────────────────────────── DASHBOARD ───────────────────────────
    function buildDashboard() {
      const dashModFilter = S.dashModFilter || [];
      const dashStF = (document.getElementById('dashStF') || { value: '' }).value;
      const dashQ = (document.getElementById('dashQ') || { value: '' }).value.trim().toLowerCase();
      const dashBugStF = (document.getElementById('dashBugStF') || { value: '' }).value;
      const modHealthF = (document.getElementById('modHealthF') || { value: '' }).value || (S.modules.length ? S.modules[0] : '');
      const workPendingModF = (document.getElementById('workPendingModF') || { value: '' }).value;

      let tData = [...S.testCases];
      if (dashModFilter.length > 0) tData = tData.filter(t => dashModFilter.includes(t.module));
      if (dashStF) tData = tData.filter(t => t.status === dashStF);
      if (dashQ) {
        tData = tData.filter(t => [
          t.id, t.testCase, t.scenario, t.module, t.screen, t.steps, t.expected, t.actual, t.notes, t.evidence, t.status, t.severity
        ].some(v => textMatchesQuery(v, dashQ)));
      }

      let bData = [...S.bugs];
      if (dashModFilter.length > 0) bData = bData.filter(b => dashModFilter.includes(b.module));
      if (dashBugStF) bData = bData.filter(b => b.status === dashBugStF);
      if (dashQ) {
        bData = bData.filter(b => [
          b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes, b.escalationReason
        ].some(v => textMatchesQuery(v, dashQ)));
      }

      const total = tData.length;
      const pass = tData.filter(t => t.status === 'Pass').length;
      const fail = tData.filter(t => t.status === 'Fail').length;
      const hold = tData.filter(t => t.status === 'Hold').length;
      const openBugs = bData.filter(b => b.status === 'Open').length;
      const escalatedBugs = bData.filter(b => b.status === 'Escalated').length;
      const retestBugs = bData.filter(b => b.status === 'Fixed').length;
      const pct = total ? Math.round(pass / total * 100) : 0;

      const totH = tData.filter(t => t.severity === 'High').length;
      const totM = tData.filter(t => t.severity === 'Medium').length;
      const totL = tData.filter(t => t.severity === 'Low').length;

      const passH = tData.filter(t => t.status === 'Pass' && t.severity === 'High').length;
      const passM = tData.filter(t => t.status === 'Pass' && t.severity === 'Medium').length;
      const passL = tData.filter(t => t.status === 'Pass' && t.severity === 'Low').length;

      const retestH = bData.filter(b => b.status === 'Fixed' && b.severity === 'High').length;
      const retestM = bData.filter(b => b.status === 'Fixed' && b.severity === 'Medium').length;
      const retestL = bData.filter(b => b.status === 'Fixed' && b.severity === 'Low').length;
      const modList = dashModF ? [dashModF] : S.modules;
      const modOpts = S.modules.map(m => `<option value="${m}"${dashModF === m ? ' selected' : ''}>${m}</option>`).join('');

      const modSummary = modList.map(mod => {
        const tcs = tData.filter(t => t.module === mod);
        const p = tcs.filter(t => t.status === 'Pass').length;
        const f = tcs.filter(t => t.status === 'Fail').length;
        const ob = bData.filter(b => b.module === mod && b.status === 'Open').length;
        const pp = tcs.length ? Math.round(p / tcs.length * 100) : 0;
        return `<tr>
      <td class="td-title">${mod}</td>
      <td>${tcs.length}</td>
      <td style="color:var(--green)">${p}</td>
      <td style="color:var(--red)">${f}</td>
      <td style="color:${ob > 0 ? 'var(--red)' : 'var(--green)'}">${ob}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:5px;background:var(--bg4);border-radius:3px;min-width:80px;">
            <div style="width:${pp}%;height:100%;background:${pp > 70 ? 'var(--green)' : pp > 40 ? 'var(--yellow)' : 'var(--red)'};border-radius:3px;"></div>
          </div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text3)">${pp}%</span>
        </div>
      </td>
    </tr>`;
      }).join('');

      const recentBugs = [...bData].slice(0, 5).map(b => `<tr>
    <td class="td-id">${b.id}</td>
    <td class="td-title">${b.testCase}</td>
    <td>${b.module}</td>
    <td>${sevBadge(b.severity)}</td>
    <td>${statusBadge(b.status)}</td>
    <td class="date-col">${formatDate(b.failedAt)}</td>
  </tr>`).join('');

      // Module health donut chart data
      const selectedMod = modHealthF || (S.modules[0] || '');
      const modTcs = selectedMod ? S.testCases.filter(t => t.module === selectedMod) : [];
      const modPass = modTcs.filter(t => t.status === 'Pass').length;
      const modFail = modTcs.filter(t => t.status === 'Fail').length;
      const modHold = modTcs.filter(t => t.status === 'Hold').length;
      const modTotal = modTcs.length;
      const modPassPct = modTotal > 0 ? Math.round(modPass / modTotal * 100) : 0;
      const modFailPct = modTotal > 0 ? Math.round(modFail / modTotal * 100) : 0;
      const modHoldPct = modTotal > 0 ? (100 - modPassPct - modFailPct) : 0;

      // Work pending pie chart data
      let wpData = [...S.bugs];
      if (workPendingModF) wpData = wpData.filter(b => b.module === workPendingModF);
      const devWork = wpData.filter(b => b.status === 'Open' || b.status === 'Escalated').length;
      const qaWork = wpData.filter(b => b.status === 'Fixed').length;
      const totalWork = devWork + qaWork;
      const devPct = totalWork > 0 ? Math.round(devWork / totalWork * 100) : 0;
      const qaPct = totalWork > 0 ? (100 - devPct) : 0;

      // Calculate pie chart path data
      const devAngle = (devPct / 100) * 360;
      const devRad = devAngle * Math.PI / 180;
      const devX = 100 + 80 * Math.cos(devRad - Math.PI / 2);
      const devY = 100 + 80 * Math.sin(devRad - Math.PI / 2);
      const devLargeArc = devAngle > 180 ? 1 : 0;
      const devPath = devPct === 100 ? `M 100 100 L 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z` : `M 100 100 L 100 20 A 80 80 0 ${devLargeArc} 1 ${devX} ${devY} Z`;

      const qaStartAngle = devAngle;
      const qaRad = (qaStartAngle + (qaPct / 100) * 360) * Math.PI / 180;
      const qaX = 100 + 80 * Math.cos(qaRad - Math.PI / 2);
      const qaY = 100 + 80 * Math.sin(qaRad - Math.PI / 2);
      const qaLargeArc = qaPct > 180 ? 1 : 0;
      const qaPath = qaPct === 100 ? `M 100 100 L 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z` : (qaPct > 0 ? `M 100 100 L ${devX} ${devY} A 80 80 0 ${qaLargeArc} 1 100 20 Z` : '');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">BUG OS Dashboard</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section" style="overflow:visible;">
    <div class="section-hdr" style="overflow:visible; align-items:flex-start;">
      <div class="section-title" style="margin-top:8px;">KPI Filters</div>
      <div class="filters" style="display:flex; gap:12px; align-items:flex-start; overflow:visible;">
        <div id="dashModFilterContainer" style="position:relative; width:350px; font-size:13px; font-family:var(--font);">
          <div onclick="window.toggleDashModDropdown(event)" style="border:1px solid var(--border); border-radius:4px; padding:4px 32px 4px 4px; min-height:36px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg); align-items:center;">
            ${(!S.dashModFilter || S.dashModFilter.length === 0) ? `<span style="color:var(--text3); padding:4px 8px;">Select KPI modules...</span>` : 
              S.dashModFilter.map(m => `
              <div style="background:var(--bg2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
                <span>${m}</span>
                <span style="cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.removeDashModFilter(event, '${m}')">×</span>
              </div>
            `).join('')}
            <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
              ${(S.dashModFilter && S.dashModFilter.length > 0) ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearDashModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
              <span style="font-size:10px; color:var(--text3);">▼</span>
            </div>
          </div>
          <div id="dashModDropdown" style="display:${S.dashModDropdownOpen ? 'block' : 'none'}; position:absolute; top:100%; left:0; right:0; background:var(--bg); border:1px solid var(--border); border-radius:4px; max-height:200px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-top:4px;">
            ${S.modules.map(m => `
              <div onclick="window.toggleDashModFilter(event, '${m}')" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; border-bottom:1px solid var(--border); background:${(S.dashModFilter||[]).includes(m) ? 'var(--bg2)' : 'transparent'};">
                <input type="checkbox" ${(S.dashModFilter||[]).includes(m) ? 'checked' : ''} style="margin-right:8px; pointer-events:none;">
                <span>${m}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="stats-row" style="grid-template-columns: repeat(5, 1fr);">
    <div class="stat" style="display:flex;flex-direction:column;">
      <div class="stat-val">${total}</div>
      <div class="stat-lbl">Total Test Cases</div>
      <div class="stat-sub" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--red)">High</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${totH}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--yellow)">Medium</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${totM}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--green)">Low</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${totL}</span>
        </div>
      </div>
    </div>
    <div class="stat" style="display:flex;flex-direction:column;">
      <div class="stat-val" style="color:var(--green)">${pass}</div>
      <div class="stat-lbl">Total Passed Cases</div>
      <div class="stat-sub" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--red)">High</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${passH}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--yellow)">Medium</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${passM}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--green)">Low</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${passL}</span>
        </div>
      </div>
    </div>
    <div class="stat" style="display:flex;flex-direction:column;">
      <div class="stat-val" style="color:var(--red)">${fail + hold}</div>
      <div class="stat-lbl">Total Failed Cases</div>
      <div class="stat-sub" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--red)">Fail</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${fail}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--yellow)">Hold</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${hold}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;opacity:0;pointer-events:none;user-select:none;">
          <span>Hidden</span>
          <span style="font-weight:600;font-size:12px;">0</span>
        </div>
      </div>
    </div>
    <div class="stat" style="display:flex;flex-direction:column;">
      <div class="stat-val" style="color:var(--text)">${openBugs + retestBugs + escalatedBugs}</div>
      <div class="stat-lbl">Bug Queue</div>
      <div class="stat-sub" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--yellow)">Open</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${openBugs}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--green)">Fixed</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${retestBugs}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--orange)">Escalated</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${escalatedBugs}</span>
        </div>
      </div>
    </div>
    <div class="stat" style="display:flex;flex-direction:column;">
      <div class="stat-val" style="color:var(--purple)">${retestBugs}</div>
      <div class="stat-lbl">Retest Queue</div>
      <div class="stat-sub" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--red)">High</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${retestH}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--yellow)">Medium</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${retestM}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:var(--green)">Low</span>
          <span style="font-weight:600;color:var(--text);font-size:12px;">${retestL}</span>
        </div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">Module Health</div>
        <select class="filter-select" id="modHealthF" onchange="render()">
          ${S.modules.map(m => `<option value="${m}"${modHealthF === m ? ' selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;">
          <circle cx="100" cy="100" r="80" fill="none" stroke="var(--green)" stroke-width="20" stroke-dasharray="${modPassPct * 5.03} 502.4" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="80" fill="none" stroke="var(--red)" stroke-width="20" stroke-dasharray="${modFailPct * 5.03} 502.4" stroke-dashoffset="${-modPassPct * 5.03}" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="80" fill="none" stroke="var(--yellow)" stroke-width="20" stroke-dasharray="${modHoldPct * 5.03} 502.4" stroke-dashoffset="${-(modPassPct + modFailPct) * 5.03}" transform="rotate(-90 100 100)"/>
          <circle cx="100" cy="100" r="50" fill="var(--bg2)"/>
          <text x="100" y="95" text-anchor="middle" font-size="24" font-weight="600" fill="var(--text)" font-family="var(--mono)">${modPassPct}%</text>
          <text x="100" y="115" text-anchor="middle" font-size="12" fill="var(--text3)" font-family="var(--mono)">Pass Rate</text>
        </svg>
        <div style="margin-left:24px;font-size:13px;line-height:1.8;">
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;margin-right:8px;"></span>Pass: ${modPass} - ${modPassPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--red);border-radius:2px;margin-right:8px;"></span>Fail: ${modFail} - ${modFailPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--yellow);border-radius:2px;margin-right:8px;"></span>Hold: ${modHold} - ${modHoldPct}%</div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">Work Pending</div>
        <select class="filter-select" id="workPendingModF" onchange="render()">
          <option value="">All Modules</option>
          ${S.modules.map(m => `<option value="${m}"${workPendingModF === m ? ' selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;">
          ${totalWork > 0 ? `
          ${devPct > 0 ? `<path d="${devPath}" fill="#a855f7"/>` : ''}
          ${qaPath ? `<path d="${qaPath}" fill="#22c55e"/>` : ''}
          ` : ''}
        </svg>
        <div style="margin-left:24px;font-size:13px;line-height:1.8;">
          <div><span style="display:inline-block;width:12px;height:12px;background:#a855f7;border-radius:2px;margin-right:8px;"></span>Dev Team: ${devWork} Items - ${devPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:#22c55e;border-radius:2px;margin-right:8px;"></span>QA Team: ${qaWork} Items - ${qaPct}%</div>
        </div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr"><div class="section-title">Module-wise Work Tracker</div></div>
    ${buildModuleTracker()}
  </div>
  <div class="section">
    <div class="section-hdr" style="overflow:visible;">
      <div class="section-title">Module Health Heatmap</div>
      <div id="hmModFilterContainer" style="position:relative; width:350px; font-size:13px; font-family:var(--font);">
        <div onclick="window.toggleHmModDropdown(event)" style="border:1px solid var(--border); border-radius:4px; padding:4px 32px 4px 4px; min-height:36px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg); align-items:center;">
          ${(!S.hmModFilter || S.hmModFilter.length === 0) ? `<span style="color:var(--text3); padding:4px 8px;">Select modules...</span>` :
          S.hmModFilter.map(m => `
            <div style="background:var(--bg2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
              <span>${m}</span>
              <span style="cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.removeHmModFilter(event, '${m}')">×</span>
            </div>
          `).join('')}
          <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
            ${(S.hmModFilter && S.hmModFilter.length > 0) ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearHmModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
            <span style="font-size:10px; color:var(--text3);">▼</span>
          </div>
        </div>
        <div id="hmModDropdown" style="display:${S.hmModDropdownOpen ? 'block' : 'none'}; position:absolute; top:100%; left:0; right:0; background:var(--bg); border:1px solid var(--border); border-radius:4px; max-height:200px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-top:4px;">
          ${S.modules.map(m => `
            <div onclick="window.toggleHmModFilter(event, '${m}')" style="padding:8px 12px; cursor:pointer; display:flex; align-items:center; border-bottom:1px solid var(--border); background:${(S.hmModFilter || []).includes(m) ? 'var(--bg2)' : 'transparent'};">
              <input type="checkbox" ${(S.hmModFilter || []).includes(m) ? 'checked' : ''} style="margin-right:8px; pointer-events:none;">
              <span>${m}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    ${buildModuleHeatmap()}
  </div>
  <div class="section">
    <div class="section-hdr"><div class="section-title">Recent Bug Reports</div><button class="btn btn-ghost btn-sm" onclick="nav('bugs')">View all →</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Bug ID</th><th>Test Case</th><th>Module</th><th>Severity</th><th>Status</th><th>Failed On</th></tr></thead><tbody>${recentBugs || '<tr><td colspan="6" class="empty">No bugs yet</td></tr>'}</tbody></table></div>
  </div>`;
    }

    // ─────────────────────────── TEST CASES ───────────────────────────
    function buildTestCases() {
      const modF = (document.getElementById('tcModF') || { value: '' }).value;
      const stF = (document.getElementById('tcStF') || { value: '' }).value;
      const sevF = (document.getElementById('tcSevF') || { value: '' }).value;
      const tcQ = (document.getElementById('tcQ') || { value: '' }).value.trim().toLowerCase();
      const dlMod = (document.getElementById('tcDlMod') || { value: '' }).value;
      const dlSt = (document.getElementById('tcDlSt') || { value: '' }).value;

      let data = [...S.testCases];
      if (modF) data = data.filter(t => t.module === modF);
      if (stF) data = data.filter(t => t.status === stF);
      if (sevF) data = data.filter(t => t.severity === sevF);
      if (tcQ) {
        data = data.filter(t => [
          t.id, t.testCase, t.scenario, t.module, t.screen, t.steps, t.expected, t.actual, t.status, t.severity, t.evidence, t.notes
        ].some(v => textMatchesQuery(v, tcQ)));
      }

      const modOpts = S.modules.map(m => `<option${modF === m ? ' selected' : ''}>${m}</option>`).join('');
      const dlModOpts = S.modules.map(m => `<option value="${m}"${dlMod === m ? ' selected' : ''}>${m}</option>`).join('');

      const rows = data.map(tc => {
        const isQA = S.role === 'qa';
        const idArg = encodeURIComponent(tc.id || '');
        const modArg = encodeURIComponent(tc.module || '');
        return `<tr>
      <td class="td-id">${tc.id}</td>
      <td class="td-title">${tc.testCase}</td>
      <td class="td-truncate">${tc.scenario || ''}</td>
      <td>${tc.module}</td>
      <td>${tc.screen || '—'}</td>
      <td class="td-truncate">${tc.steps || ''}</td>
      <td class="td-truncate">${tc.expected || ''}</td>
      <td class="td-truncate">${tc.actual || ''}</td>
      <td>${statusBadge(tc.status)}</td>
      <td>${sevBadge(tc.severity)}</td>
      <td class="td-truncate">${renderEvidenceCell(tc.evidence)}</td>
      <td class="td-truncate">${tc.notes || '—'}</td>
      <td style="white-space:nowrap;">
        <div style="display:flex;flex-direction:column;gap:4px;align-items:stretch;min-width:max-content;">
          <button class="btn btn-ghost btn-sm" onclick="viewTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">View</button>
          ${isQA ? `<button class="btn btn-ghost btn-sm" style="color:var(--yellow);border-color:var(--yellow-border);" onclick="openEditTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">Edit</button>` : ''}
          ${isQA ? `<button class="btn btn-danger btn-sm" onclick="deleteTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">Delete</button>` : ''}
        </div>
      </td>
    </tr>`;
      }).join('');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Test Cases</div>
    <div style="display:flex; align-items:center; gap:16px;">
      ${S.role === 'qa' ? `<button class="btn btn-ghost btn-sm" onclick="openImportCSV()">↑ Import Test Cases</button><button class="btn btn-ghost btn-sm" onclick="openAddTC()">+ Add Test Case</button>` : ''}
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">All Test Cases</div><div class="section-meta">${data.length} Shown · ${S.testCases.length} Total</div></div>
      <div class="filters">
        <select class="filter-select" id="tcModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select" id="tcStF" onchange="render()">
          <option value="">All Status</option>
          <option${stF === 'Pass' ? ' selected' : ''}>Pass</option>
          <option${stF === 'Fail' ? ' selected' : ''}>Fail</option>
          <option${stF === 'Hold' ? ' selected' : ''}>Hold</option>
        </select>
        <select class="filter-select" id="tcSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${sevF === 'High' ? ' selected' : ''}>High</option>
          <option${sevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${sevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <input class="filter-select" id="tcQ" placeholder="Search test cases..." value="${tcQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
      </div>
    </div>
    <div style="padding:10px 20px;background:var(--bg3);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
      <span style="font-size:11px;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;">↓ Download:</span>
      <select class="filter-select" id="tcDlMod" onchange="render()">
        <option value="">All Modules</option>${dlModOpts}
      </select>
      <select class="filter-select" id="tcDlSt" onchange="render()">
        <option value="">All Status</option>
        <option${dlSt === 'Pass' ? ' selected' : ''}>Pass</option>
        <option${dlSt === 'Fail' ? ' selected' : ''}>Fail</option>
        <option${dlSt === 'Hold' ? ' selected' : ''}>Hold</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="downloadTestCasesCSV()">Download CSV</button>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="13" class="empty"><div class="empty-icon">✓</div>No test cases match filters.</td></tr>'}</tbody>
    </table></div>
  </div>`;
    }

    // ─────────────────────────── BUGS ───────────────────────────
    function buildBugs() {
      const bugModF = (document.getElementById('bugModF') || { value: '' }).value;
      const bugStF = (document.getElementById('bugStF') || { value: '' }).value;
      const bugTcStF = (document.getElementById('bugTcStF') || { value: '' }).value;
      const bugSevF = (document.getElementById('bugSevF') || { value: '' }).value;
      const bugQ = (document.getElementById('bugQ') || { value: '' }).value.trim().toLowerCase();

      let data = [...S.bugs];
      data = data.filter(b => b.status !== 'Verified');
      if (bugModF) data = data.filter(b => b.module === bugModF);
      if (bugStF) data = data.filter(b => b.status === bugStF);
      if (bugTcStF) data = data.filter(b => {
        const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
        return linkedTc?.status === bugTcStF;
      });
      if (bugSevF) data = data.filter(b => b.severity === bugSevF);
      if (bugQ) {
        data = data.filter(b => {
          const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
          return [
            b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes, b.escalationReason,
            linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes, linkedTc?.evidence
          ].some(v => textMatchesQuery(v, bugQ));
        });
      }

      const modOpts = S.modules.map(m => `<option value="${m}"${bugModF === m ? ' selected' : ''}>${m}</option>`).join('');

      const rows = data.map(b => {
        const isQA = S.role === 'qa';
        const isDev = S.role === 'dev';
        const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
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
      <td class="td-truncate">${renderEvidenceCell(linkedTc?.evidence)}</td>
      <td class="td-truncate">${linkedTc?.notes || '—'}</td>
      <td><div style="display:flex;flex-direction:column;gap:4px;align-items:stretch;min-width:max-content;">${actions}</div></td>
    </tr>`;
      }).join('');

      const openCount = S.bugs.filter(b => b.status === 'Open' || b.status === 'Retest Failed' || b.status === 'Escalated').length;
      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Bug Reports</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Bug Reports</div><div class="section-meta">${data.length} Shown · ${openCount} Total</div></div>
      <div class="filters">
        <select class="filter-select" id="bugModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select" id="bugStF" onchange="render()">
          <option value="">All Bug Status</option>
          <option${bugStF === 'Open' ? ' selected' : ''}>Open</option>
          <option${bugStF === 'Escalated' ? ' selected' : ''}>Escalated</option>
          <option${bugStF === 'Fixed' ? ' selected' : ''}>Fixed</option>
        </select>
        <select class="filter-select" id="bugTcStF" onchange="render()">
          <option value="">All Test Status</option>
          
          <option${bugTcStF === 'Fail' ? ' selected' : ''}>Fail</option>
          <option${bugTcStF === 'Hold' ? ' selected' : ''}>Hold</option>
        </select>
        <select class="filter-select" id="bugSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${bugSevF === 'High' ? ' selected' : ''}>High</option>
          <option${bugSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${bugSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <input class="filter-select" id="bugQ" placeholder="Search bug reports..." value="${bugQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
      </div>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Bug Status</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="15" class="empty"><div class="empty-icon">⚑</div>No bugs match filters.</td></tr>'}</tbody>
    </table></div>
  </div>`;
    }

    // ─────────────────────────── RETEST QUEUE ───────────────────────────
    function buildRetest() {
      const rtModF = (document.getElementById('rtModF') || { value: '' }).value;
      const rtSevF = (document.getElementById('rtSevF') || { value: '' }).value;
      const rtQ = (document.getElementById('rtQ') || { value: '' }).value.trim().toLowerCase();
      let bugs = S.bugs.filter(b => normalizeStatus(b.status) === 'fixed');
      if (rtModF) bugs = bugs.filter(b => b.module === rtModF);
      if (rtSevF) bugs = bugs.filter(b => b.severity === rtSevF);
      if (rtQ) {
        bugs = bugs.filter(b => {
          const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
          return [
            b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes,
            linkedTc?.scenario, linkedTc?.steps, linkedTc?.expected, linkedTc?.actual, linkedTc?.notes, linkedTc?.evidence
          ].some(v => textMatchesQuery(v, rtQ));
        });
      }
      const rtModOpts = S.modules.map(m => `<option value="${m}"${rtModF === m ? ' selected' : ''}>${m}</option>`).join('');
      const rows = bugs.map(b => {
        const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
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
      <td><button class="btn btn-ghost btn-sm" onclick="viewBug('${b.id}')" style="white-space:nowrap;">View Details</button></td>
      ${S.role === 'qa' ? `<td>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:stretch;min-width:max-content;">
          <button class="btn btn-success btn-sm" onclick="retestPass('${b.id}')">Pass ✓ </button>
          <button class="btn btn-danger btn-sm" onclick="retestFail('${b.id}')">Fail ✕ </button>
        </div>
      </td>` : ''}
    </tr>`;
      }).join('');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Retest Queue</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Retest Queue</div><div class="section-meta">${bugs.length} Shown · ${S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length} Total</div></div>
      <div style="font-size:12px;color:var(--text);position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;">Dev has marked these as fixed</div>
      <div class="filters">
        <select class="filter-select" id="rtModF" onchange="render()">
          <option value="">All Modules</option>${rtModOpts}
        </select>
        <select class="filter-select" id="rtSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${rtSevF === 'High' ? ' selected' : ''}>High</option>
          <option${rtSevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${rtSevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <input class="filter-select" id="rtQ" placeholder="Search retest queue..." value="${rtQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
      </div>
    </div>
    ${bugs.length === 0 ? `<div class="empty"><div class="empty-icon">↺</div>No bugs awaiting retest. All clear!</div>` : `
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>View Details</th>${S.role === 'qa' ? '<th>ACTIONS</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`}
  </div>`;
    }

    // ─────────────────────────── AUTOMATION ───────────────────────────
    function buildAutomation() {
      const moduleOptions = S.modules.map(mod => `<option value="${mod}"${S.selectedAutomationModule === mod ? ' selected' : ''}>${mod}</option>`).join('');
      const testCaseOptions = S.selectedAutomationModule ? S.testCases.filter(tc => tc.module === S.selectedAutomationModule).map(tc => {
        const tcId = String(tc.id);
        const shortDesc = tc.testCase.length > 50 ? tc.testCase.substring(0, 50) + '...' : tc.testCase;
        return `<option value="${tcId}"${S.selectedAutomationTc === tcId ? ' selected' : ''}>${tcId}: ${shortDesc} (${tc.status})</option>`;
      }).join('') : '';
      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <style>
    .hover-blur-container { position: relative; overflow: hidden; }
    .hover-blur-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      color: var(--green);
      font-weight: 600;
      font-size: 14px;
      letter-spacing: 0.05em;
      gap: 8px;
    }
    [data-theme='dark'] .hover-blur-overlay {
      background: rgba(18, 18, 18, 0.7);
    }
    .hover-blur-container:hover .hover-blur-overlay {
      opacity: 1;
      pointer-events: auto;
    }
  </style>
  <div class="section hover-blur-container">
    <div class="hover-blur-overlay">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      WILL BE AVAILABLE SOON...
    </div>
    <div class="section-hdr">
      <div>
        <div class="section-title">Test Case Automation</div>
        <div class="automation-notice">⚙ Coming Soon - Automation features are currently under development. Check back soon for updates on automated testing capabilities.</div>
      </div>
    </div>
    <div style="padding: 20px;">
      <div class="form-grid">
        <div class="field">
          <label>Select Module</label>
          <select id="auto-module-select" onchange="updateTestCaseOptions()">
            <option value="">Choose a module...</option>
            ${moduleOptions}
          </select>
        </div>
        <div class="field">
          <label>Select Test Case</label>
          <select id="auto-tc-select" onchange="loadTestCaseScript()">
            <option value="">Choose a test case...</option>
            ${testCaseOptions}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Automation Script (Java)</label>
        <textarea id="auto-script" rows="15" placeholder="Write your Java automation script here. Access test case data via variables like id, testCaseName, expected, actual, etc.
// Example:
// if (expected.equals(actual)) {
//     System.out.println("PASS");
// } else {
//     System.out.println("FAIL");
// }" ${S.role === 'qa' ? '' : 'readonly'}></textarea>
      </div>
      <div class="automation-actions">
        <button class="btn btn-primary" onclick="runAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>Run Script</button>
        <button class="btn btn-success" onclick="saveAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>Save Script</button>
        <button class="btn btn-ghost" onclick="clearAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>Clear</button>
      </div>
      <div id="script-output" class="automation-output"></div>
    </div>
  </div>`;
    }

    function updateTestCaseOptions() {
      const moduleSelect = document.getElementById('auto-module-select');
      S.selectedAutomationModule = moduleSelect.value;
      S.selectedAutomationTc = ''; // Reset test case selection
      render();
    }

    function loadTestCaseScript() {
      const tcSelect = document.getElementById('auto-tc-select');
      S.selectedAutomationTc = tcSelect.value;
      const scriptArea = document.getElementById('auto-script');
      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        scriptArea.value = '';
        return;
      }
      const script = S.automationScripts.find(s => s.testCaseId === S.selectedAutomationTc && s.module === S.selectedAutomationModule);
      scriptArea.value = script ? script.script : '';
    }

    function clearAutomationScript() {
      document.getElementById('auto-script').value = '';
      document.getElementById('script-output').textContent = '';
    }

    function saveAutomationScript() {
      const script = document.getElementById('auto-script').value.trim();
      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        toast('Please select module and test case first', 'error');
        return;
      }
      if (!script) {
        toast('Please enter a script', 'error');
        return;
      }
      const scriptData = {
        testCaseId: S.selectedAutomationTc,
        module: S.selectedAutomationModule,
        script,
        updatedAt: now(),
        updatedBy: S.auth.user
      };
      const existingIndex = S.automationScripts.findIndex(s => s.testCaseId === scriptData.testCaseId && s.module === scriptData.module);
      if (existingIndex !== -1) {
        S.automationScripts[existingIndex] = scriptData;
      } else {
        S.automationScripts.push(scriptData);
      }
      render();
      socket.emit('updateData', { type: 'automationScript', data: scriptData });
      toast('Script saved', 'success');
    }

    async function runAutomationScript() {
      const script = document.getElementById('auto-script').value.trim();
      const output = document.getElementById('script-output');

      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        toast('Please select module and test case first', 'error');
        return;
      }

      if (!script) {
        toast('Please enter a script', 'error');
        return;
      }

      try {
        const response = await fetch('/api/run-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseId: S.selectedAutomationTc, module: S.selectedAutomationModule, script })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Execution failed');
        }
        output.textContent = `Result: ${result.result} | Output: ${result.output}`;
        toast(`Test case updated to ${result.result}`, 'success');
      } catch (error) {
        output.textContent = `Error: ${error.message}`;
        toast('Script execution failed', 'error');
      }
    }

    // ─────────────────────────── MODULES ───────────────────────────
    function buildModules() {
      const cards = S.modules.map(mod => {
        const tcs = S.testCases.filter(t => t.module === mod);
        const pass = tcs.filter(t => t.status === 'Pass').length;
        const fail = tcs.filter(t => t.status === 'Fail').length;
        const hold = tcs.filter(t => t.status === 'Hold').length;
        const bugs = S.bugs.filter(b => b.module === mod);
        const openB = bugs.filter(b => b.status === 'Open').length;
        const pct = tcs.length ? Math.round(pass / tcs.length * 100) : 0;
        const canDelete = S.role === 'qa';
        return `<div class="section" style="margin-bottom:12px;">
      <div class="section-hdr">
        <div class="section-title">${mod}</div>
        ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="deleteModule('${mod}')">Delete Module</button>` : ''}
      </div>
      <div style="padding:16px;display:grid;grid-template-columns:repeat(5,1fr);gap:16px;">
        <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Tests</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);margin-top:4px;">${tcs.length}</div></div>
        <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Pass</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);color:var(--green);margin-top:4px;">${pass}</div></div>
        <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Fail</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);color:var(--red);margin-top:4px;">${fail}</div></div>
        <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Hold</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);color:var(--yellow);margin-top:4px;">${hold}</div></div>
        <div><div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Open Bugs</div><div style="font-size:20px;font-weight:600;font-family:var(--mono);color:${openB > 0 ? 'var(--red)' : 'var(--green)'};margin-top:4px;">${openB}</div></div>
      </div>
      <div style="padding:0 16px 16px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;">
            <div style="width:${pct}%;height:100%;background:${pct > 70 ? 'var(--green)' : pct > 40 ? 'var(--yellow)' : 'var(--red)'};border-radius:3px;transition:width .3s;"></div>
          </div>
          <span style="font-family:var(--font);font-size:12px;color:var(--text3)">${pct}% pass rate</span>
        </div>
      </div>
    </div>`;
      }).join('');
      const header = `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Modules</div>
    <div style="display:flex; align-items:center; gap:16px;">
      ${S.role === 'qa' ? `<button class="btn btn-ghost btn-sm" onclick="openAddModule()">+ Add Module</button>` : ''}
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>`;
      return header + (cards || `<div class="empty"><div class="empty-icon">⊞</div>No modules yet. ${S.role === 'qa' ? 'Add your first module.' : 'Contact QA to add modules.'}</div>`);
    }

    // ─────────────────────────── AUDIT ───────────────────────────
    function buildAudit() {
      const rows = S.auditLog.slice(0, 100).map(a => `
    <div class="audit-row">
      <div class="audit-time">${formatDate(a.time)}</div>
      <div class="audit-event">${a.event}</div>
      <span class="audit-actor ${a.actor === 'qa' ? 'actor-qa' : a.actor === 'dev' ? 'actor-dev' : 'actor-admin'}">${a.actor.toUpperCase()}</span>
    </div>`).join('');
      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Audit Log</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr"><div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Audit Log</div><div class="section-meta">${S.auditLog.length} events</div></div></div>
    ${rows || '<div class="empty">No events yet.</div>'}
  </div>`;
    }

    // ─────────────────────────── REPORT ───────────────────────────
    function buildReport() {
      const total = S.testCases.length;
      const pass = S.testCases.filter(t => t.status === 'Pass').length;
      const fail = S.testCases.filter(t => t.status === 'Fail').length;
      const totalBugs = S.bugs.length;
      const openBugs = S.bugs.filter(b => b.status === 'Open').length;
      const escalatedBugs = S.bugs.filter(b => b.status === 'Escalated').length;
      const pct = total ? Math.round(pass / total * 100) : 0;

      const modRows = S.modules.map(mod => {
        const tcs = S.testCases.filter(t => t.module === mod);
        const p = tcs.filter(t => t.status === 'Pass').length;
        const f = tcs.filter(t => t.status === 'Fail').length;
        const bugs = S.bugs.filter(b => b.module === mod);
        const highBugs = bugs.filter(b => b.severity === 'High').length;
        return `<tr>
      <td style="font-weight:500">${mod}</td>
      <td style="font-family:var(--mono)">${tcs.length}</td>
      <td style="color:var(--green);font-family:var(--mono)">${p}</td>
      <td style="color:var(--red);font-family:var(--mono)">${f}</td>
      <td style="font-family:var(--mono)">${bugs.length}</td>
      <td style="color:${bugs.filter(b => b.status === 'Open').length > 0 ? 'var(--red)' : 'var(--green)'};font-family:var(--mono)">${bugs.filter(b => b.status === 'Open').length}</td>
      <td style="color:${highBugs > 0 ? 'var(--red)' : 'var(--text3)'};font-family:var(--mono)">${highBugs}</td>
    </tr>`;
      }).join('');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Reports</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:var(--bg3); border:1px solid var(--border); border-radius:6px; padding:6px 12px; cursor:pointer;">${currentTheme === 'dark' ? '🔆' : '⏾'}</button>
      <div id="live-clock" style="font-variant-numeric:tabular-nums;letter-spacing:0.02em;font-size:12px;color:var(--text3);">${formatDate(nowFull())}</div>
    </div>
  </div>
  <div class="stats-row" style="grid-template-columns: repeat(5, 1fr);">
    <div class="stat"><div class="stat-val">${S.modules.length}</div><div class="stat-lbl">Total Modules</div></div>
    <div class="stat"><div class="stat-val">${pct}%</div><div class="stat-lbl">Pass Rate</div></div>
    <div class="stat"><div class="stat-val" style="color:var(--green)">${pass}/${total}</div><div class="stat-lbl">Tests Passed</div></div>
    <div class="stat"><div class="stat-val" style="color:var(--red)">${openBugs}</div><div class="stat-lbl">Open Bugs</div></div>
    <div class="stat"><div class="stat-val" style="color:var(--orange)">${escalatedBugs}</div><div class="stat-lbl">Escalated</div></div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Module Breakdown</div>
      <button class="btn btn-ghost btn-sm" onclick="exportCSV()">Export CSV</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Module</th><th>Total Tests</th><th>Pass</th><th>Fail</th><th>Total Bugs</th><th>Open Bugs</th><th>High Severity</th></tr></thead>
      <tbody>${modRows}</tbody>
    </table></div>
  </div>`;
    }

    // ─────────────────────────── BADGES ───────────────────────────
    function statusBadge(s) {
      const m = { Pass: 'b-pass', Fail: 'b-fail', Hold: 'b-hold', Retest: 'b-retest', Blocked: 'b-blocked', Open: 'b-open', Fixed: 'b-fixed', Verified: 'b-verified', 'Retest Failed': 'b-retest-fail', Escalated: 'b-escalated' };
      return `<span class="badge ${m[s] || 'b-blocked'}">${s}</span>`;
    }
    function sevBadge(s) {
      const m = { High: 'b-high', Medium: 'b-medium', Low: 'b-low' };
      return `<span class="badge ${m[s] || 'b-medium'}">${s}</span>`;
    }

    function escHtml(v) {
      return (v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function isHttpUrl(v) {
      return /^https?:\/\//i.test((v || '').trim());
    }

    function isImageEvidence(v) {
      const ev = (v || '').trim();
      return /^data:image\//i.test(ev) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(ev);
    }

    function renderEvidenceCell(evidence) {
      const ev = (evidence || '').trim();
      if (!ev) return '—';
      if (/^data:image\//i.test(ev)) {
        return `<a href="${ev}" target="_blank" rel="noopener noreferrer" title="Open attached image" style="display:inline-block;"><img src="${ev}" alt="Evidence" style="width:48px;height:48px;object-fit:cover;border:1px solid var(--border2);border-radius:4px;"></a>`;
      }
      if (isHttpUrl(ev)) {
        const safe = escHtml(ev);
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:none;">${isImageEvidence(ev) ? 'Open Image' : 'Open Link'}</a>`;
      }
      return `<span style="color:var(--text2);">${escHtml(ev)}</span>`;
    }

    function renderEvidencePreview(previewId, evidence) {
      const container = document.getElementById(previewId);
      if (!container) return;
      const ev = (evidence || '').trim();
      if (!ev) { container.innerHTML = ''; return; }
      if (/^data:image\//i.test(ev) || (isHttpUrl(ev) && isImageEvidence(ev))) {
        const safe = /^data:image\//i.test(ev) ? ev : escHtml(ev);
        container.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;"><img src="${safe}" alt="Evidence preview" style="max-width:160px;max-height:100px;object-fit:cover;border:1px solid var(--border2);border-radius:4px;"></a>`;
        return;
      }
      if (isHttpUrl(ev)) {
        const safe = escHtml(ev);
        container.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--accent);text-decoration:none;">Open evidence link</a>`;
        return;
      }
      container.innerHTML = `<div style="font-size:12px;color:var(--text3);">${escHtml(ev)}</div>`;
    }

    function handleEvidenceUpload(inputEl, textInputId, hiddenInputId, previewId) {
      const file = inputEl && inputEl.files && inputEl.files[0];
      if (!file) return;
      if (!/^image\//i.test(file.type || '')) {
        toast('Please upload an image file for evidence', 'error');
        inputEl.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = (e && e.target && e.target.result) || '';
        const hidden = document.getElementById(hiddenInputId);
        const text = document.getElementById(textInputId);
        if (hidden) hidden.value = dataUrl;
        if (text) text.value = file.name;
        renderEvidencePreview(previewId, dataUrl);
      };
      reader.readAsDataURL(file);
    }

    function onEvidenceTextChange(textInputId, hiddenInputId, previewId) {
      const text = document.getElementById(textInputId);
      const hidden = document.getElementById(hiddenInputId);
      const txt = (text && text.value ? text.value.trim() : '');
      if (hidden) hidden.value = '';
      renderEvidencePreview(previewId, txt);
    }

    // ─────────────────────────── MODALS ───────────────────────────
    function openAddTC() {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const mods = S.modules.map(m => `<option>${m}</option>`).join('');
      showModal('Add Test Case', `
  <div class="form-grid">
    <div class="field">
      <label>Test Case ID <span class="required">*</span></label>
      <input id="f-id" placeholder="Enter test case ID">
    </div>
    <div class="field">
      <label>Module <span class="required">*</span></label>
      <select id="f-mod">${mods}</select>
    </div>
    <div class="field form-full">
      <label>Test Case Title <span class="required">*</span></label>
      <input id="f-tc" placeholder="What is being tested?">
    </div>
    <div class="field form-full">
      <label>Scenario</label>
      <input id="f-scenario" placeholder="Test scenario description">
    </div>
    <div class="field">
      <label>Screen Name</label>
      <input id="f-screen" placeholder="e.g. Login Page">
    </div>
    <div class="field">
      <label>Severity <span class="required">*</span></label>
      <select id="f-sev"><option>High</option><option selected>Medium</option><option>Low</option></select>
    </div>
    <div class="field form-full">
      <label>Test Steps <span class="required">*</span></label>
      <textarea id="f-steps" placeholder="1. Go to...&#10;2. Click...&#10;3. Observe..."></textarea>
    </div>
    <div class="field form-full">
      <label>Expected Results <span class="required">*</span></label>
      <textarea id="f-expected" placeholder="What should happen?"></textarea>
    </div>
    <div class="field form-full">
      <label>Actual Results <span class="required">*</span></label>
      <textarea id="f-actual" placeholder="What actually happened?"></textarea>
    </div>
    <div class="field">
      <label>Status <span class="required">*</span></label>
      <select id="f-status"><option>Pass</option><option>Fail</option><option>Hold</option></select>
    </div>
    <div class="field">
      <label>Evidence (URL/filename)</label>
      <input id="f-evidence" placeholder="Paste evidence URL" oninput="onEvidenceTextChange('f-evidence','f-evidence-file','f-evidence-preview')">
      <div id="f-evidence-preview"></div>
    </div>
    <div class="field form-full">
      <label>Notes</label>
      <textarea id="f-notes" placeholder="Additional notes..."></textarea>
    </div>
  </div>`,
        () => submitTC());
    }

    function submitTC() {
      const id = normalizeTcRowId(document.getElementById('f-id').value);
      const tc = document.getElementById('f-tc').value.trim();
      const mod = normalizeTcModule(document.getElementById('f-mod').value);
      const actual = document.getElementById('f-actual').value.trim();
      const expected = document.getElementById('f-expected').value.trim();
      const status = document.getElementById('f-status').value;
      const steps = document.getElementById('f-steps').value.trim();

      if (!id || !tc || !mod || !actual || !expected || !steps) {
        toast('Please fill all required fields', 'error'); return;
      }
      if (S.testCases.find(t => testcaseKeysMatch(t, { id, module: mod }))) {
        toast(`Test Case ID "${id}" already exists in module "${mod}"`, 'error'); return;
      }

      const evidenceText = (document.getElementById('f-evidence') || { value: '' }).value.trim();
      const newTC = {
        id, testCase: tc, scenario: document.getElementById('f-scenario').value.trim(),
        module: mod, screen: document.getElementById('f-screen').value.trim(),
        steps, expected, actual, status,
        severity: document.getElementById('f-sev').value,
        evidence: evidenceText,
        notes: document.getElementById('f-notes').value.trim(),
        createdAt: now(), createdBy: S.auth.user, updatedAt: now(), history: []
      };

      S.testCases.push(newTC);
      S.tcCounter++;

      audit(`Test case ${id} "${tc}" added to module ${mod} with status ${status}`, 'qa');

      // Send test case update to server
      socket.emit('updateData', { type: 'testCase', data: newTC });
      socket.emit('updateData', { type: 'counters', data: { tcCounter: S.tcCounter, bugCounter: S.bugCounter } });

      if (status === 'Fail' || status === 'Hold') {
        autoCreateBug(newTC);
      }

      closeModal();
      save();
      toast(`Test case ${id} added successfully`, 'success');
    }

    function generateUniqueBugId() {
      let bugId;
      do {
        bugId = `BUG-${String(S.bugCounter++).padStart(3, '0')}`;
      } while (S.bugs.some(b => b.id === bugId));
      return bugId;
    }

    function autoCreateBug(tc) {
      const bugId = generateUniqueBugId();
      const bug = {
        id: bugId, tcId: tc.id, testCase: tc.testCase, module: tc.module,
        screen: tc.screen, severity: tc.severity, status: 'Open',
        failedAt: now(), fixedAt: null, retestAt: null, devNotes: '',
        retestResult: null, retestCount: 0,
        history: [{ date: now(), event: `Bug auto-created from failed test case ${tc.id}`, actor: S.auth.user }]
      };
      S.bugs.push(bug);

      // Send bug update to server
      socket.emit('updateData', { type: 'bug', data: bug });
      socket.emit('updateData', { type: 'counters', data: { tcCounter: S.tcCounter, bugCounter: S.bugCounter } });

      audit(`Bug ${bugId} auto-created from failed test case ${tc.id} "${tc.testCase}"`, 'qa');
      toast(`Bug ${bugId} auto-created from failed test ${tc.id}`, 'info');
    }

    function viewTC(id, module) {
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id, module }));
      if (!tc) return;
      const linkedBug = S.bugs.find(b => bugRefsTestCaseKeys(b, id, tc.module));
      showModal(`Test Case: ${tc.id}`, `
  <div class="detail-section">
    <h4>Test Case Details</h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value" style="font-family:var(--mono)">${tc.id}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(tc.status)}</div></div>
      <div class="detail-item"><div class="detail-label">Module</div><div class="detail-value">${tc.module}</div></div>
      <div class="detail-item"><div class="detail-label">Screen</div><div class="detail-value">${tc.screen || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Severity</div><div class="detail-value">${sevBadge(tc.severity)}</div></div>
      <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value" style="font-family:var(--mono);font-size:12px">${formatDate(tc.createdAt)}</div></div>
    </div>
  </div>
  <div class="detail-section">
    <h4>Test Information</h4>
    <div style="margin-bottom:10px;"><div class="detail-label" style="margin-bottom:4px">Scenario</div><div style="font-size:13px;color:var(--text2)">${tc.scenario || '—'}</div></div>
    <div style="margin-bottom:10px;"><div class="detail-label" style="margin-bottom:4px">Test Steps</div><pre style="font-size:12px;color:var(--text2);white-space:pre-wrap;font-family:var(--font)">${tc.steps}</pre></div>
    <div class="detail-grid">
      <div><div class="detail-label" style="margin-bottom:4px">Expected Results</div><div style="font-size:13px;color:var(--green)">${tc.expected}</div></div>
      <div><div class="detail-label" style="margin-bottom:4px">Actual Results</div><div style="font-size:13px;color:${tc.status === 'Fail' ? 'var(--red)' : 'var(--text2)'}">${tc.actual}</div></div>
    </div>
    ${tc.evidence ? `<div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Evidence</div><div style="font-size:12px;color:var(--accent)">${renderEvidenceCell(tc.evidence)}</div></div>` : ''}
    ${tc.notes ? `<div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Notes</div><div style="font-size:13px;color:var(--text2)">${tc.notes}</div></div>` : ''}
  </div>
  ${linkedBug ? `<div class="detail-section"><h4>Linked Bug</h4><div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:var(--radius);"><span style="font-family:var(--mono);color:var(--red)">${linkedBug.id}</span><span style="font-size:13px">${linkedBug.testCase}</span>${statusBadge(linkedBug.status)}</div></div>` : ''}
  `, null, true);
    }

    function viewBug(id) {
      const b = S.bugs.find(x => x.id === id);
      if (!b) return;
      const linkedTc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
      const history = b.history.map(h => {
        const cls = h.event.includes('created') || h.event.includes('Fail') ? 'tl-red' : h.event.includes('fixed') || h.event.includes('Verified') ? 'tl-green' : h.event.includes('Fixed') ? 'tl-yellow' : 'tl-blue';
        let role = 'qa';
        const u = S.users.find(u => u.username === h.actor);
        if (u) { role = u.role; }
        else if (h.actor && ['qa', 'dev', 'admin'].includes(h.actor.toLowerCase())) { role = h.actor.toLowerCase(); }
        const badgeClass = role === 'qa' ? 'actor-qa' : role === 'dev' ? 'actor-dev' : 'actor-admin';
        return `<div class="tl-item ${cls}">
      <div class="tl-date">${formatDate(h.date)}</div>
      <div class="tl-text">${h.event} <span class="audit-actor ${badgeClass}">${h.actor.toUpperCase()}</span></div>
    </div>`;
      }).join('');

      showModal(`Bug Report: ${b.id}`, `
  <div class="detail-section">
    <h4>Bug Details</h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Bug ID</div><div class="detail-value" style="font-family:var(--mono);color:var(--red)">${b.id}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(b.status)}</div></div>
      <div class="detail-item"><div class="detail-label">Module</div><div class="detail-value">${b.module}</div></div>
      <div class="detail-item"><div class="detail-label">Screen</div><div class="detail-value">${b.screen || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Severity</div><div class="detail-value">${sevBadge(b.severity)}</div></div>
      <div class="detail-item"><div class="detail-label">Linked Test Case</div><div class="detail-value" style="font-family:var(--mono)">${b.tcId}</div></div>
    </div>
    <div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Evidence</div><div style="font-size:13px;color:var(--accent)">${renderEvidenceCell(linkedTc?.evidence)}</div></div>
    <div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Notes</div><div style="font-size:13px;color:var(--text2)">${linkedTc?.notes || '—'}</div></div>
  </div>
  <div class="detail-section">
    <h4>Audit Timeline</h4>
    <div class="timeline">${history || '<div style="color:var(--text3);font-size:13px">No history yet</div>'}</div>
  </div>
  <div class="detail-section">
    <h4>Date Tracking</h4>
    <div class="detail-grid">
      <div><div class="detail-label">Failed On</div><div style="color:var(--red);font-family:var(--mono);font-size:13px">${formatDate(b.failedAt) || '—'}</div></div>
      <div><div class="detail-label">Fixed On</div><div style="color:var(--yellow);font-family:var(--mono);font-size:13px">${formatDate(b.fixedAt) || 'Not fixed yet'}</div></div>
      <div><div class="detail-label">Retest On</div><div style="color:var(--green);font-family:var(--mono);font-size:13px">${formatDate(b.retestAt) || 'Not retested yet'}</div></div>
      <div><div class="detail-label">Retest Count</div><div style="font-family:var(--mono);font-size:13px">${b.retestCount}</div></div>
      ${b.escalatedAt ? `<div><div class="detail-label">Escalated On</div><div style="color:var(--orange);font-family:var(--mono);font-size:13px">${formatDate(b.escalatedAt)}</div></div>` : ''}
    </div>
    ${b.devNotes ? `<div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Dev Notes</div><div style="font-size:13px;color:var(--text2)">${b.devNotes}</div></div>` : ''}
    ${b.escalationReason ? `<div style="margin-top:10px;"><div class="detail-label" style="margin-bottom:4px">Escalation Reason</div><div style="font-size:13px;color:var(--orange)">${b.escalationReason}</div></div>` : ''}
  </div>
  `, null, true);
    }

    // ─────────────────────────── ACTIONS ───────────────────────────
    function markFixed(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      showModal('Mark Bug as Fixed', `
  <div style="margin-bottom:16px;padding:12px;background:var(--yellow-bg);border:1px solid var(--yellow-border);border-radius:var(--radius);">
    <div style="font-size:12px;color:var(--yellow);font-family:var(--mono);margin-bottom:4px">BUG: ${bugId}</div>
    <div style="font-size:14px;font-weight:500">${S.bugs.find(b => b.id === bugId)?.testCase}</div>
  </div>
  <div class="field">
    <label>Dev Fix Notes <span class="required">*</span></label>
    <textarea id="dev-notes" placeholder="Describe what was fixed and how..."></textarea>
  </div>
  `, () => {
        const notes = document.getElementById('dev-notes').value.trim();
        if (!notes) { toast('Please add fix notes', 'error'); return; }
        const b = S.bugs.find(x => x.id === bugId);
        if (!b) return;
        b.status = 'Fixed';
        b.fixedAt = now();
        b.devNotes = notes;
        b.history.push({ date: now(), event: `Marked as Fixed by Dev. Notes: ${notes}`, actor: S.auth.user });

        // Send bug update to server
        socket.emit('updateData', { type: 'bug', data: b });

        audit(`Bug ${bugId} marked as Fixed by Developer`, 'dev');
        closeModal();
        save();
        toast(`Bug ${bugId} marked as fixed — awaiting QA retest`, 'success');
      });
    }

    function retestPass(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const b = S.bugs.find(x => x.id === bugId);
      if (!b) return;
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
      openConfirm('Confirm Retest Pass',
        `Mark bug ${bugId} as PASSED?\n\nTest case "${b.testCase}" will be updated to PASS status and returned to Test Cases.`,
        () => {
          b.status = 'Verified';
          b.retestAt = now();
          b.retestCount++;
          b.retestResult = 'Pass';
          b.history.push({ date: now(), event: 'Retest PASSED by QA — bug verified and closed', actor: S.auth.user });
          if (tc) {
            tc.status = 'Pass';
            tc.updatedAt = now();
            tc.history = tc.history || [];
            tc.history.push({ date: now(), event: `Retest passed — test case restored to PASS status` });

            // Send updates to server
            socket.emit('updateData', { type: 'testCase', data: tc });
          }

          // Send bug update to server
          socket.emit('updateData', { type: 'bug', data: b });

          audit(`Bug ${bugId} retest PASSED — test case ${b.tcId} restored to Pass`, 'qa');
          save();
          toast(`Retest passed! Bug ${bugId} verified. Test case ${b.tcId} is now PASS.`, 'success');
        },
        'Confirm',
        'btn-success');
    }

    function retestFail(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const b = S.bugs.find(x => x.id === bugId);
      if (!b) return;
      b.status = 'Open';
      b.retestAt = now();
      b.retestCount++;
      b.retestResult = 'Fail';
      b.fixedAt = null;
      b.history.push({ date: now(), event: `Retest FAILED by QA — bug re-opened (Retest #${b.retestCount})`, actor: S.auth.user });
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
      if (tc) {
        tc.status = 'Fail';
        tc.updatedAt = now();

        // Send test case update to server
        socket.emit('updateData', { type: 'testCase', data: tc });
      }

      // Send bug update to server
      socket.emit('updateData', { type: 'bug', data: b });

      audit(`Bug ${bugId} retest FAILED — returned to bug queue as "Retest Failed"`, 'qa');
      save();
      toast(`Retest failed. Bug ${bugId} returned to queue.`, 'error');
    }

    function deleteTC(id, module) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id, module }));
      if (!tc) return;
      openConfirm('Permanently Delete Test Case',
        `Delete "${tc.testCase}" (${id})?\n\nThis will also remove any linked bugs and CANNOT be undone. The record will be completely removed from the system.`,
        () => {
          const deletedBugIds = S.bugs.filter(b => bugRefsTestCaseKeys(b, id, module)).map(b => b.id);
          S.bugs = S.bugs.filter(b => !bugRefsTestCaseKeys(b, id, module));
          S.testCases = S.testCases.filter(t => !testcaseKeysMatch(t, { id, module }));
          audit(`Test case ${id} "${tc.testCase}" permanently deleted by QA along with linked bugs`, 'qa');
          socket.emit('updateData', { type: 'testCase', data: { id: normalizeTcRowId(id), module: normalizeTcModule(module), deleted: true } });
          deletedBugIds.forEach(bugId => {
            socket.emit('updateData', { type: 'bug', data: { id: bugId, deleted: true } });
          });
          save();
          toast(`Test case ${id} permanently deleted`, 'success');
        });
    }

    function deleteBug(id) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const b = S.bugs.find(x => x.id === id);
      if (!b) return;
      openConfirm('Permanently Delete Bug Report',
        `Delete bug "${id}" (${b.testCase})?\n\nThis action is PERMANENT and cannot be undone. The bug record will be completely removed from the system.`,
        () => {
          S.bugs = S.bugs.filter(x => x.id !== id);
          audit(`Bug ${id} "${b.testCase}" permanently deleted by QA`, 'qa');
          socket.emit('updateData', { type: 'bug', data: { id, deleted: true } });
          save();
          toast(`Bug ${id} permanently deleted`, 'success');
        });
    }

    function deleteModule(name) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      openConfirm('Delete Module',
        `Delete module "${name}"?\n\nAll test cases and bugs in this module will also be permanently deleted. This CANNOT be undone.`,
        () => {
          const deletedTCs = S.testCases.filter(t => t.module === name).map(t => t.id);
          const deletedBugIds = S.bugs.filter(b => b.module === name).map(b => b.id);
          S.testCases = S.testCases.filter(t => t.module !== name);
          S.bugs = S.bugs.filter(b => b.module !== name);
          S.modules = S.modules.filter(m => m !== name);
          audit(`Module "${name}" and ${deletedTCs.length} test cases permanently deleted by QA`, 'qa');
          deletedTCs.forEach(tcId => {
            socket.emit('updateData', { type: 'testCase', data: { id: tcId, module: name, deleted: true } });
          });
          deletedBugIds.forEach(bugId => {
            socket.emit('updateData', { type: 'bug', data: { id: bugId, deleted: true } });
          });
          socket.emit('updateData', { type: 'module', data: { name, deleted: true } });
          save();
          toast(`Module "${name}" permanently deleted`, 'success');
        });
    }

    function openAddModule() {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      showModal('Add Module', `
  <div class="field">
    <label>Module Name <span class="required">*</span></label>
    <input id="f-modname" placeholder="e.g. User Management, Payment, Reports">
  </div>`, () => {
        const name = document.getElementById('f-modname').value.trim();
        if (!name) { toast('Module name required', 'error'); return; }
        if (S.modules.includes(name)) { toast('Module already exists', 'error'); return; }
        S.modules.push(name);
        audit(`Module "${name}" added by QA`, 'qa');
        socket.emit('updateData', { type: 'module', data: { name } });
        closeModal();
        save();
        toast(`Module "${name}" added`, 'success');
      });
    }

    function exportCSV() {
      let csv = 'Module,Total Tests,Pass,Fail,Total Bugs,Open Bugs,High Severity\n';
      S.modules.forEach(mod => {
        const tcs = S.testCases.filter(t => t.module === mod);
        const bugs = S.bugs.filter(b => b.module === mod);
        csv += `${mod},${tcs.length},${tcs.filter(t => t.status === 'Pass').length},${tcs.filter(t => t.status === 'Fail').length},${bugs.length},${bugs.filter(b => b.status === 'Open').length},${bugs.filter(b => b.severity === 'High').length}\n`;
      });
      const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = `qa-report-${now()}.csv`; a.click();
      audit('Report exported as CSV', S.role);
      toast('Report exported', 'success');
    }

    // ─────────────────────────── EDIT TEST CASE ───────────────────────────
    function openEditTC(id, module) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id, module }));
      if (!tc) return;
      const evidenceInputValue = /^data:image\//i.test(tc.evidence || '') ? '' : (tc.evidence || '');
      const mods = S.modules.map(m => `<option${m === tc.module ? ' selected' : ''}>${m}</option>`).join('');
      showModal(`Edit Test Case: ${tc.id}`, `
  <div style="padding:8px 14px;background:var(--bg3);border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:var(--text3);">
    Editing <span style="font-family:var(--mono);color:var(--accent)">${tc.id}</span> — ID cannot be changed.
  </div>
  <div class="form-grid">
    <div class="field">
      <label>Test Case ID</label>
      <input value="${tc.id}" disabled style="opacity:.45;cursor:not-allowed;">
    </div>
    <div class="field">
      <label>Module <span class="required">*</span></label>
      <select id="e-mod">${mods}</select>
    </div>
    <div class="field form-full">
      <label>Test Case Title <span class="required">*</span></label>
      <input id="e-tc" value="${tc.testCase.replace(/"/g, '&quot;').replace(/</g, '&lt;')}">
    </div>
    <div class="field form-full">
      <label>Scenario</label>
      <input id="e-scenario" value="${(tc.scenario || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">
    </div>
    <div class="field">
      <label>Screen Name</label>
      <input id="e-screen" value="${(tc.screen || '').replace(/"/g, '&quot;')}">
    </div>
    <div class="field">
      <label>Severity <span class="required">*</span></label>
      <select id="e-sev">
        <option${tc.severity === 'High' ? ' selected' : ''}>High</option>
        <option${tc.severity === 'Medium' ? ' selected' : ''}>Medium</option>
        <option${tc.severity === 'Low' ? ' selected' : ''}>Low</option>
      </select>
    </div>
    <div class="field form-full">
      <label>Test Steps <span class="required">*</span></label>
      <textarea id="e-steps">${(tc.steps || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field form-full">
      <label>Expected Results <span class="required">*</span></label>
      <textarea id="e-expected">${(tc.expected || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field form-full">
      <label>Actual Results <span class="required">*</span></label>
      <textarea id="e-actual">${(tc.actual || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field">
      <label>Status <span class="required">*</span></label>
      <select id="e-status">
        <option${tc.status === 'Pass' ? ' selected' : ''}>Pass</option>
        <option${tc.status === 'Fail' ? ' selected' : ''}>Fail</option>
        <option${tc.status === 'Hold' ? ' selected' : ''}>Hold</option>
      </select>
    </div>
    <div class="field">
      <label>Evidence (URL/filename)</label>
      <input id="e-evidence" value="${evidenceInputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence','e-evidence-file','e-evidence-preview')">
      <input id="e-evidence-file" type="hidden">
      <div id="e-evidence-preview"></div>
    </div>
    <div class="field form-full">
      <label>Notes</label>
      <textarea id="e-notes">${(tc.notes || '').replace(/</g, '&lt;')}</textarea>
    </div>
  </div>
  <input type="hidden" id="e-tcid" value="${tc.id}">
  <input type="hidden" id="e-tcmodold" value="${tc.module.replace(/"/g, '&quot;')}">
  `, () => submitEditTC());
      const eHidden = document.getElementById('e-evidence-file');
      if (eHidden && /^data:image\//i.test(tc.evidence || '')) eHidden.value = tc.evidence;
      renderEvidencePreview('e-evidence-preview', tc.evidence || '');
    }

    function submitEditTC() {
      const id = normalizeTcRowId((document.getElementById('e-tcid') || { value: '' }).value);
      const oldMod = normalizeTcModule((document.getElementById('e-tcmodold') || { value: '' }).value);
      const title = (document.getElementById('e-tc') || { value: '' }).value.trim();
      const mod = normalizeTcModule((document.getElementById('e-mod') || { value: '' }).value);
      const steps = (document.getElementById('e-steps') || { value: '' }).value.trim();
      const expected = (document.getElementById('e-expected') || { value: '' }).value.trim();
      const actual = (document.getElementById('e-actual') || { value: '' }).value.trim();
      const status = (document.getElementById('e-status') || { value: '' }).value;

      if (!title || !mod || !steps || !expected || !actual) {
        toast('Please fill all required fields', 'error'); return;
      }
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id, module: oldMod }));
      if (!tc) { toast('Test case not found', 'error'); return; }
      if ((oldMod !== mod) && S.testCases.find(t => t !== tc && testcaseKeysMatch(t, { id, module: mod }))) {
        toast(`Test Case ID "${id}" already exists in module "${mod}"`, 'error'); return;
      }

      const oldStatus = tc.status;
      const prevModule = tc.module;
      tc.testCase = title;
      tc.module = mod;
      tc.scenario = (document.getElementById('e-scenario') || { value: '' }).value.trim();
      tc.screen = (document.getElementById('e-screen') || { value: '' }).value.trim();
      tc.severity = (document.getElementById('e-sev') || { value: 'Medium' }).value;
      tc.steps = steps;
      tc.expected = expected;
      tc.actual = actual;
      tc.status = status;
      const evidenceText = (document.getElementById('e-evidence') || { value: '' }).value.trim();
      tc.evidence = evidenceText;
      tc.notes = (document.getElementById('e-notes') || { value: '' }).value.trim();
      tc.updatedAt = now();
      tc.history = tc.history || [];
      tc.history.push({ date: now(), event: `Edited by QA. Status: ${oldStatus} → ${status}` });

      // Send test case update to server
      socket.emit('updateData', { type: 'testCase', data: tc });

      // Keep linked bug module aligned when test case module changes
      if (prevModule !== mod) {
        S.bugs
          .filter(b => bugRefsTestCaseKeys(b, id, prevModule))
          .forEach(b => {
            b.module = mod;
            b.history = b.history || [];
            b.history.push({ date: now(), event: `Module updated to ${mod} after test case edit`, actor: S.auth.user });
            socket.emit('updateData', { type: 'bug', data: b });
          });
      }

      // If newly failing/hold and no active bug, auto-create
      const wasActive = oldStatus === 'Fail' || oldStatus === 'Hold';
      const isActive = status === 'Fail' || status === 'Hold';
      if (isActive && !wasActive) {
        autoCreateBug(tc);
      }
      // If changed to Pass, close any open linked bug
      if (!isActive && wasActive) {
        const linked = S.bugs.find(b =>
          bugRefsTestCaseKeys(b, id, tc.module) && (b.status === 'Open' || b.status === 'Retest Failed'));
        if (linked) {
          linked.status = 'Verified';
          linked.history.push({ date: now(), event: `Bug auto-closed — test case changed to ${status}`, actor: S.auth.user });

          // Send bug update to server
          socket.emit('updateData', { type: 'bug', data: linked });

          audit(`Bug ${linked.id} auto-closed (TC ${id} changed to ${status})`, 'qa');
        }
      }

      audit(`Test case ${id} edited by QA — status ${oldStatus} → ${status}`, 'qa');
      closeModal();
      save();
      toast(`Test case ${id} updated`, 'success');
    }

    // ─────────────────────────── ESCALATE BUG ───────────────────────────
    function escalateBug(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const b = S.bugs.find(x => x.id === bugId);
      if (!b) return;
      showModal('Escalate Bug to Backend Team', `
  <div style="padding:12px 16px;background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:var(--radius);margin-bottom:16px;">
    <div style="font-size:11px;color:var(--purple);font-family:var(--mono);margin-bottom:4px">ESCALATING: ${bugId}</div>
    <div style="font-size:14px;font-weight:500">${b.testCase}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">${b.module} · ${b.screen || '—'} · ${b.severity}</div>
  </div>
  <div style="padding:10px 14px;background:var(--yellow-bg);border:1px solid var(--yellow-border);border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:var(--yellow);">
    ⚠ Use only when the bug cannot be fixed from the frontend. The backend queue will be updated.
  </div>
  <div class="field">
    <label>Escalation Reason <span class="required">*</span></label>
    <textarea id="esc-reason" placeholder="Describe why this needs backend intervention (e.g. API error, database issue, server-side logic)..."></textarea>
  </div>
  <div class="field">
    <label>Affected Backend Area</label>
    <input id="esc-area" placeholder="e.g. Payment API, Auth service, Database query...">
  </div>
  `, () => {
        const reason = (document.getElementById('esc-reason') || { value: '' }).value.trim();
        const area = (document.getElementById('esc-area') || { value: '' }).value.trim();
        if (!reason) { toast('Please describe the escalation reason', 'error'); return; }
        b.status = 'Escalated';
        b.escalatedAt = now();
        b.escalationReason = area ? `${reason} [Area: ${area}]` : reason;
        b.history.push({ date: now(), event: `Escalated to Backend. Reason: ${b.escalationReason}`, actor: S.auth.user });

        // Send bug update to server
        socket.emit('updateData', { type: 'bug', data: b });

        audit(`Bug ${bugId} escalated to backend by DEV`, 'dev');
        closeModal(); save();
        toast(`Bug ${bugId} escalated to backend team`, 'info');
      });
    }

    // ─────────────────────────── DOWNLOAD TEST CASES CSV ───────────────────────────
    function downloadImportTemplate() {
      const headers = 'Test Case ID,Test Case,Scenario,Module Name,Screen Name,Test Step,Test Data,Expected Results,Actual Results,Status,Severity,Evidence,Notes';
      const example = 'TC-1,Verify login button,User enters valid credentials,DMS,Login Page,1. Go to login page\n2. Enter credentials\n3. Click login,valid@email.com / Pass@123,User should be logged in successfully,User logged in,Pass,Medium,,';
      const csv = headers + '\n' + example;
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'bugos-test-case-template.csv';
      a.click();
      toast('Template downloaded — fill it in and import', 'success');
    }

    function downloadTestCasesCSV() {
      const dlMod = (document.getElementById('tcDlMod') || { value: '' }).value;
      const dlSt = (document.getElementById('tcDlSt') || { value: '' }).value;
      let data = [...S.testCases];
      if (dlMod) data = data.filter(t => t.module === dlMod);
      if (dlSt) data = data.filter(t => t.status === dlSt);
      if (!data.length) { toast('No test cases match selected filters', 'error'); return; }
      const esc = v => `"${(v || '').replace(/"/g, '""')}"`;
      let csv = 'Test Case ID,Test Case,Scenario,Module,Screen Name,Test Steps,Expected Results,Actual Results,Status,Severity,Evidence,Notes,Created,Updated\n';
      data.forEach(tc => {
        csv += `${tc.id},${esc(tc.testCase)},${esc(tc.scenario)},${tc.module},${esc(tc.screen)},${esc(tc.steps)},${esc(tc.expected)},${esc(tc.actual)},${tc.status},${tc.severity},${esc(tc.evidence)},${esc(tc.notes)},${formatDate(tc.createdAt)},${formatDate(tc.updatedAt)}\n`;
      });
      const fname = `test-cases${dlMod ? '-' + dlMod : ''}${dlSt ? '-' + dlSt : ''}-${now()}.csv`;
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = fname; a.click();
      toast(`Downloaded ${data.length} test cases`, 'success');
    }

    // ─────────────────────────── IMPORT CSV ───────────────────────────
    let _importRows = [];
    let _importTargetModule = '';

    function openImportCSV() {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      if (!S.modules.length) { toast('Please add a module before importing test cases', 'error'); return; }
      _importRows = [];
      _importTargetModule = S.modules[0] || '';
      const moduleOptions = S.modules.map(m => `<option value="${m.replace(/"/g, '&quot;')}">${m}</option>`).join('');
      showModal('Import Test Cases from Excel / CSV', `
  <div class="field" style="margin-bottom:16px;">
    <label>Import To Module <span class="required">*</span></label>
    <select id="imp-module" onchange="setImportModule(this.value)">${moduleOptions}</select>
    <div style="margin-top:6px;font-size:12px;color:var(--text3);">
      Used when a row has no <strong>Module Name</strong> column value. Rows can reuse Test Case IDs in different modules (e.g. 1–50 in Module&nbsp;A and 1–30 in Module&nbsp;B) — uniqueness is enforced per&nbsp;module.
    </div>
  </div>
  <div style="padding:12px 16px;background:var(--bg3);border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:var(--text2);line-height:1.9;">
   <div style="font-weight:600;color:var(--text);margin-bottom:6px;">How to import:</div>
    <div style="color:var(--text3);margin-bottom:10px;">Download the template, fill in your data, save as CSV or Excel, then upload below.</div>
    <button class="btn btn-ghost btn-sm" style="margin-bottom:12px;" onclick="downloadImportTemplate()">↓ Download Template</button>
    <div style="font-family:var(--mono);font-size:11px;color:var(--accent);background:var(--bg4);padding:8px;border-radius:4px;line-height:2;margin-bottom:8px;">
      Test Case ID &nbsp;·&nbsp; Test Case &nbsp;·&nbsp; Scenario &nbsp;·&nbsp; Module Name &nbsp;·&nbsp; Screen Name &nbsp;·&nbsp; Test Step &nbsp;·&nbsp; Test Data &nbsp;·&nbsp; Expected Results &nbsp;·&nbsp; Actual Results &nbsp;·&nbsp; Status &nbsp;·&nbsp; Severity &nbsp;·&nbsp; Evidence &nbsp;·&nbsp; Notes
    </div>
    <div style="color:var(--text3);font-size:11px;">
      Status: <span style="color:var(--green)">Pass</span> / <span style="color:var(--red)">Fail</span> / <span style="color:var(--yellow)">Hold</span> &nbsp;&nbsp; 
      Severity: <span style="color:var(--red)">High</span> / <span style="color:var(--yellow)">Medium</span> / <span style="color:var(--green)">Low</span>
    </div>
  </div>
  <div id="imp-dropzone"
       style="border:2px dashed var(--border2);border-radius:var(--radius2);padding:36px;text-align:center;cursor:pointer;transition:all .2s;"
       onclick="document.getElementById('imp-file').click()"
       ondragover="event.preventDefault();document.getElementById('imp-dropzone').style.borderColor='var(--accent)';document.getElementById('imp-dropzone').style.background='rgba(59,130,246,.06)'"
       ondragleave="document.getElementById('imp-dropzone').style.borderColor='';document.getElementById('imp-dropzone').style.background=''"
       ondrop="handleImpDrop(event)">
    <input type="file" id="imp-file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none" onchange="handleImpFile(this)">
    <div style="font-size:36px;opacity:.35;margin-bottom:10px;">📄</div>
    <div style="font-size:14px;color:var(--text);font-weight:500">Click to choose a CSV or Excel file</div>
    <div style="font-size:12px;color:var(--text3);margin-top:6px">From Excel: Save As → CSV UTF‑8 (.csv) or keep as .xlsx</div>
  </div>
  <div id="imp-status" style="margin-top:14px;font-size:12px;color:var(--text3);text-align:center;"></div>
  <div id="imp-preview" style="margin-top:14px;"></div>
  `, () => doImport());
    }

    function setImportModule(moduleName) {
      _importTargetModule = moduleName || '';
    }

    function handleImpDrop(e) {
      e.preventDefault();
      const dz = document.getElementById('imp-dropzone');
      if (dz) { dz.style.borderColor = ''; dz.style.background = ''; }
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (f) parseImpFile(f);
      else toast('No file detected', 'error');
    }

    function handleImpFile(inp) {
      const f = inp && inp.files && inp.files[0];
      if (f) parseImpFile(f);
    }

    function parseImpFile(file) {
      const status = document.getElementById('imp-status');
      const preview = document.getElementById('imp-preview');
      const selectedModule = (document.getElementById('imp-module') || { value: '' }).value;
      if (status) status.textContent = `Reading "${file.name}"...`;
      if (preview) preview.innerHTML = '';
      _importRows = [];
      _importTargetModule = selectedModule || _importTargetModule;

      if (!_importTargetModule) {
        if (status) status.innerHTML = `<span style="color:var(--red)">❌ Please select a module before importing.</span>`;
        return;
      }

      // Accept CSV, TXT, Excel files
      if (!file.name.match(/\.(csv|txt|xlsx|xls)$/i)) {
        if (status) status.innerHTML = `<span style="color:var(--red)">❌ Use a .csv, .txt, .xlsx, or .xls file.</span>`;
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => {
        if (status) status.innerHTML = `<span style="color:var(--red)">❌ Failed to read file.</span>`;
      };
      reader.onload = e => {
        try {
          let raw;
          if (file.name.match(/\.xlsx?$/i)) {
            const workbook = XLSX.read(e.target.result, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            raw = XLSX.utils.sheet_to_csv(sheet);
          } else {
            raw = e.target.result;
          }
          // Normalize line endings
          const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
          // Remove completely empty lines
          const nonEmpty = lines.filter(l => l.trim().length > 0);

          if (nonEmpty.length < 2) {
            if (status) status.innerHTML = `<span style="color:var(--red)">❌ File appears empty or has no data rows.</span>`;
            return;
          }

          // Parse headers — be very flexible
          const rawHeaders = parseImpLine(nonEmpty[0]);
          const headers = rawHeaders.map(h => h.toLowerCase().trim()
            .replace(/[^a-z0-9 ]/g, ' ')  // strip special chars
            .replace(/\s+/g, ' ')          // collapse spaces
            .trim()
          );

          if (status) status.textContent = `Parsed ${nonEmpty.length - 1} data rows. Mapping columns...`;

          // Column finder — tries multiple aliases
          const col = (aliases) => {
            for (const alias of aliases) {
              const idx = headers.findIndex(h => h === alias);
              if (idx >= 0) return idx;
            }
            for (const alias of aliases) {
              const idx = headers.findIndex(h => h.startsWith(alias));
              if (idx >= 0) return idx;
            }
            return -1;
          };

          const colMap = {
            id: col(['test case id', 'testcase id', 'tc id', 'tc_id', 'tcid', 'case id', 'tc no', 'tc number', 'id']),
            testCase: col(['test case']),
            scenario: col(['scenario']),
            module: col(['module name', 'module']),
            screen: col(['screen name', 'screen']),
            steps: col(['test step', 'test steps']),
            testData: col(['test data']),
            expected: col(['expected results', 'expected result']),
            actual: col(['actual results', 'actual result']),
            status: col(['status']),
            severity: col(['severity']),
            evidence: col(['evidence']),
            notes: col(['notes']),
          };

          const rows = [];
          const warnings = [];

          for (let i = 1; i < nonEmpty.length; i++) {
            const cols = parseImpLine(nonEmpty[i]);
            if (cols.every(c => !c.trim())) continue; // skip blank rows

            const get = (key, fallback = '') => {
              const idx = colMap[key];
              return idx >= 0 ? (cols[idx] || '').trim() : fallback;
            };

            // Normalise Status
            let rawSt = get('status', 'Pass');
            let status = 'Pass';
            if (/^fail/i.test(rawSt)) status = 'Fail';
            else if (/^hold/i.test(rawSt) || /^block/i.test(rawSt)) status = 'Hold';
            else if (/^pass/i.test(rawSt)) status = 'Pass';
            else { warnings.push(`Row ${i + 1}: status "${rawSt}" not recognised, defaulted to Pass`); }

            // Normalise Severity
            let rawSev = get('severity', 'Medium');
            let severity = 'Medium';
            if (/^high/i.test(rawSev) || rawSev === '1') severity = 'High';
            else if (/^low/i.test(rawSev) || rawSev === '3') severity = 'Low';
            else if (/^med/i.test(rawSev) || rawSev === '2') severity = 'Medium';

            // Use module from CSV if available, otherwise fall back to dropdown selection (same TC# can repeat in other modules).
            const csvModule = normalizeTcModule(get('module', ''));
            const modVal = csvModule || normalizeTcModule(_importTargetModule);

            // Generate ID if missing
            let rowId = normalizeTcRowId(get('id', ''));
            if (!rowId) {
              warnings.push(`Row ${i + 1}: missing Test Case ID — row skipped`);
              continue;
            }

            rows.push({
              id: rowId,
              testCase: get('testCase') || `Imported TC ${i}`,
              scenario: get('scenario'),
              module: modVal || normalizeTcModule(_importTargetModule),
              screen: get('screen'),
              steps: get('steps'),
              testData: get('testData'),
              expected: get('expected'),
              actual: get('actual'),
              status, severity,
              evidence: get('evidence'),
              notes: get('notes'),
              _rowNum: i + 1,
            });
          }

          const newModules = Array.from(new Set(rows
            .map(r => normalizeTcModule(r.module))
            .filter(m => m && !S.modules.includes(m))));
          if (newModules.length) {
            warnings.push(`New module(s) detected: ${newModules.join(', ')}. They will be created automatically on import.`);
          }

          const seenSameFile = Object.create(null);
          let intraFileDupRows = 0;
          rows.forEach(row => {
            const k = `${normalizeTcRowId(row.id)}\t${normalizeTcModule(row.module)}`;
            if (seenSameFile[k]) intraFileDupRows++;
            else seenSameFile[k] = true;
          });
          if (intraFileDupRows > 0) {
            warnings.unshift(`${intraFileDupRows} row(s) repeat the same Test Case ID within the same module — extras will be skipped on import`);
          }

          _importRows = rows;
          renderImpPreview(rows, warnings, file.name);

        } catch (err) {
          console.error('Import parse error:', err);
          if (status) status.innerHTML = `<span style="color:var(--red)">❌ Parse error: ${err.message}</span>`;
        }
      };
      if (file.name.match(/\.xlsx?$/i)) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'UTF-8');
      }
    }

    // Robust CSV line parser — handles quoted fields, commas inside quotes, escaped quotes
    function parseImpLine(line) {
      const res = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; } // escaped quote ""
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          res.push(cur.trim()); cur = '';
        } else {
          cur += ch;
        }
      }
      res.push(cur.trim());
      return res;
    }

    function renderImpPreview(rows, warnings, filename) {
      const status = document.getElementById('imp-status');
      const preview = document.getElementById('imp-preview');
      if (!preview) return;

      const newRows = rows.filter((r, i) => {
        const firstIdx = rows.findIndex(rr => testcaseKeysMatch(rr, r));
        if (firstIdx !== i) return false;
        return !S.testCases.find(t => testcaseKeysMatch(t, r));
      });
      const skipCount = rows.length - newRows.length;

      if (status) status.innerHTML = `
    <span style="color:var(--green)">✓ "${filename}" parsed — ${rows.length} rows found</span>
    <span style="color:var(--accent);margin-left:12px">Default module: ${_importTargetModule} — CSV <strong>Module Name</strong> overrides per row when present (same numbering in different modules is OK)</span>
    ${skipCount ? `<span style="color:var(--yellow);margin-left:12px">⚠ ${skipCount} row(s) will be skipped — already saved for that module, or duplicated in this file</span>` : ''}
  `;

      preview.innerHTML = `
    <div style="padding:14px 16px;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius2);">
      <div style="display:flex;gap:16px;margin-bottom:12px;">
        <div style="font-size:12px;"><span style="color:var(--text3)">Total rows:</span> <strong>${rows.length}</strong></div>
        <div style="font-size:12px;"><span style="color:var(--text3)">Will import:</span> <strong style="color:var(--green)">${newRows.length}</strong></div>
        ${skipCount ? `<div style="font-size:12px;"><span style="color:var(--text3)">Will skip:</span> <strong style="color:var(--yellow)">${skipCount}</strong></div>` : ''}
        <div style="font-size:12px;"><span style="color:var(--text3)">Auto-bugs:</span> <strong style="color:var(--red)">${newRows.filter(r => r.status === 'Fail' || r.status === 'Hold').length}</strong></div>
      </div>
      ${warnings.length ? `<div style="font-size:11px;color:var(--yellow);margin-bottom:10px;padding:6px 10px;background:var(--yellow-bg);border-radius:4px;">${warnings.slice(0, 3).join('<br>')}</div>` : ''}
      <div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Preview (first 8 rows)</div>
      <div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);">
        <table style="width:100%;border-collapse:collapse;min-width:600px;">
          <thead>
            <tr style="background:var(--bg4);">
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;font-weight:500;letter-spacing:.06em;border-bottom:1px solid var(--border);">ID</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;font-weight:500;letter-spacing:.06em;border-bottom:1px solid var(--border);">Test Case</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;font-weight:500;letter-spacing:.06em;border-bottom:1px solid var(--border);">Module</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;font-weight:500;letter-spacing:.06em;border-bottom:1px solid var(--border);">Status</th>
              <th style="padding:6px 10px;font-size:10px;color:var(--text3);text-align:left;font-weight:500;letter-spacing:.06em;border-bottom:1px solid var(--border);">Severity</th>
            </tr>
          </thead>
          <tbody>
            ${rows.slice(0, 8).map((r, idx) => {
        const isStoredDupe = S.testCases.find(t => testcaseKeysMatch(t, r));
        const intraIdx = rows.findIndex(rr => testcaseKeysMatch(rr, r));
        const isIntraDup = intraIdx !== idx;
        const isDupe = isStoredDupe || isIntraDup;
        let dupeLbl = ''; if (isStoredDupe) dupeLbl = 'stored'; else if (isIntraDup) dupeLbl = 'repeat in file';
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
      ${newRows.length === 0 ? `<div style="margin-top:10px;padding:8px 12px;background:var(--yellow-bg);border:1px solid var(--yellow-border);border-radius:var(--radius);font-size:12px;color:var(--yellow);">All rows are duplicates — nothing new to import.</div>` : ''}
    </div>`;
    }

    function doImport() {
      if (!_importRows.length) {
        toast('No data loaded — please select a CSV file first', 'error'); return;
      }
      let added = 0, skipped = 0, bugs = 0;
      _importRows.forEach(r => {
        if (S.testCases.find(t => testcaseKeysMatch(t, r))) { skipped++; return; }
        const { _rowNum, ...tcData } = r; // strip internal field
        const newTC = {
          ...tcData,
          id: normalizeTcRowId(tcData.id),
          module: normalizeTcModule(tcData.module),
          createdAt: now(), createdBy: S.auth && S.auth.user ? S.auth.user : 'QA',
          updatedAt: now(), history: []
        };

        // Persist new module names created during import.
        if (newTC.module && !S.modules.includes(newTC.module)) {
          S.modules.push(newTC.module);
          socket.emit('updateData', { type: 'module', data: { name: newTC.module } });
        }

        S.testCases.push(newTC);
        S.tcCounter++;
        if (r.status === 'Fail' || r.status === 'Hold') { autoCreateBug(newTC); bugs++; }
        added++;

        // Send test case update to server
        socket.emit('updateData', { type: 'testCase', data: newTC });
      });

      // Send counter update to server
      socket.emit('updateData', { type: 'counters', data: { tcCounter: S.tcCounter, bugCounter: S.bugCounter } });

      audit(`Imported ${added} test cases from CSV (${skipped} duplicates skipped, ${bugs} bugs auto-created)`, S.role || 'qa');
      _importRows = [];
      closeModal();
      save();
      toast(`✓ Imported ${added} test cases${skipped ? `, ${skipped} skipped` : ''}${bugs ? `, ${bugs} bugs created` : ''}`, 'success');
    }

    // ─────────────────────────── MODAL ENGINE ───────────────────────────
    let _submitCb = null;
    function showModal(title, body, submitCb, viewOnly = false) {
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
      ${!viewOnly ? `<button class="btn btn-primary" onclick="modalSubmit()">Save</button>` : ''}
    </div>
  </div>`;
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
      document.body.appendChild(overlay);
    }

    function modalSubmit() { if (_submitCb) _submitCb(); }
    function closeModal() {
      const m = document.getElementById('app-modal');
      if (m) m.remove();
    }

    function attachHandlers() { }

    function nav(v) { S.view = v; save(); }

    // ─── INIT ───
    render();

    // ─── LIVE CLOCK (updates every second without re-rendering) ───
    setInterval(() => {
      const el = document.getElementById('live-clock');
      if (el) el.textContent = formatDate(nowFull());
    }, 1000);
  