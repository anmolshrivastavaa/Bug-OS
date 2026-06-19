import { socket } from './api.js';
import { S.S } from './state.js';
import { toggleTheme, formatDate, nowFull, toast, openConfirm, escHtml } from './utils.js';
import { save, textMatchesQuery, liveFilter, render, openChangePassword } from './app.js';

export function loginUser() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value.trim();
  const auth = S.users.find(u => u.username === username && u.password === password);
  if (!auth) {
    toast('Invalid username or password', 'error');
    return;
  }
  S.auth = {
    loggedIn: true,
    user: auth.username
  };
  S.role = auth.role;
  S.view = 'dashboard';
  save();
  toast(`Welcome ${auth.username}`, 'success');
  render();
}
export function logout() {
  S.auth = {
    loggedIn: false,
    user: null
  };
  S.role = null;
  S.view = 'dashboard';
  save();
  toast('Logged out successfully', 'info');
  render();
}
export function audit(event, actor) {
  if (!/added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(event)) return;
  const auditEntry = {
    time: nowFull(),
    event,
    actor: actor || (S.auth ? S.auth.user : 'system'),
    screen: S.view
  };

  // Send audit update to server
  socket.emit('updateData', {
    type: 'audit',
    data: auditEntry
  });
}

// ─────────────────────────── TOAST ───────────────────────────
export function buildLogin() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const rawHour = d.getHours();
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
  const flipClockHtml = `
      <div id="login-flip-clock" style="position:absolute; bottom:60px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:12px; z-index:10;">
        <div id="login-greeting" style="display:flex; align-items:center; gap:6px; font-size:16px; font-weight:700; color:var(--text); letter-spacing:0.5px;">
          ${greetIcon} <span>${greeting}</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center; justify-content:center;">
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-ampm" style="position:absolute; top:4px; left:4px; font-size:8px; font-weight:800; color:var(--text3); letter-spacing:0.05em; line-height:1; font-family:'Inter', var(--font);">${ampm}</div>
            <div id="fc-hours" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">${h}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
          <div style="font-size:20px; font-weight:900; color:var(--text3); padding-bottom:4px;">:</div>
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-mins" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">${m}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
          <div style="font-size:20px; font-weight:900; color:var(--text3); padding-bottom:4px;">:</div>
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-secs" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">${s}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
        </div>
      </div>`;
  return `
  <div class="login-screen" style="padding-bottom: 120px;">
    <div style="position: absolute; top: 24px; right: 24px; z-index: 10;">
      <button onclick="toggleTheme()" title="Toggle Theme" style="background: transparent; border: none; cursor: pointer; color: var(--text); opacity: 0.5; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; padding: 8px;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">
        ${S.currentTheme === 'light' ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' : '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'}
      </button>
    </div>
    ${flipClockHtml}
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;">
      <div class="login-icon"><img src="${S.currentTheme === 'light' ? 'assets/login-icon light.png' : 'assets/login-icon.png'}" alt="Login" /></div>
    </div>
    <div class="login-card">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ed3224" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span class="login-header-text">LOGIN</span>
      </div>
      <div class="login-title">Bug-OS - Unified QA Management Platform</div>
      <div class="field">
        <label>Username</label>
        <input id="login-user" placeholder="Enter username" autocomplete="username">
      </div>
      <div class="field">
        <label>Password</label>
        <input id="login-pass" type="password" placeholder="Enter password" autocomplete="current-password">
      </div>
      <button onclick="loginUser()">Sign In</button>
    </div>
  </div>`;
}
export function buildUserRing() {
  const initial = (S.auth && S.auth.user ? S.auth.user[0] : 'U').toUpperCase();
  const username = S.auth && S.auth.user ? S.auth.user : 'User';
  return `<div style="position:relative; display:flex; align-items:center;">
        <div onclick="const p = document.getElementById('user-popup'); p.style.display = p.style.display === 'block' ? 'none' : 'block'" style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--purple)); color:#ffffff; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; cursor:pointer; user-select:none; box-shadow:0 2px 8px rgba(0,0,0,0.1);">${initial}</div>
        <div id="user-popup" style="display:none; position:absolute; top:48px; right:0; background:var(--bg2); border:2px solid var(--accent); border-radius:12px; padding:8px 0; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:1000; min-width:180px;">
          <!-- CSS Triangle pointing up towards the ring -->
          <div style="position:absolute; top:-7px; right:12px; width:10px; height:10px; background:var(--bg2); border-left:2px solid var(--accent); border-top:2px solid var(--accent); transform:rotate(45deg);"></div>
          
          <div style="padding:8px 16px; border-bottom:1px solid var(--border); margin-bottom:4px;">
            <div style="font-weight:600; color:var(--text); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${username}</div>
            <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px;">${S.role === 'qa' ? 'QA Role' : S.role === 'dev' ? 'DEV Role' : 'Admin Role'}</div>
          </div>
          
          ${S.auth && S.auth.user !== 'ADMIN' ? `<div onclick="openChangePassword(); document.getElementById('user-popup').style.display='none'" style="padding:8px 16px; font-size:13px; color:var(--text2); cursor:pointer; display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Change Password
          </div>` : ''}
          <div onclick="logout(); document.getElementById('user-popup').style.display='none'" style="padding:8px 16px; font-size:13px; color:var(--red); cursor:pointer; display:flex; align-items:center; gap:8px; transition:background 0.2s; border-top:1px solid var(--border);" onmouseover="this.style.background='var(--red-bg)'" onmouseout="this.style.background='transparent'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Logout
          </div>
        </div>
      </div>`;
}
export
// ─────────────────────────── USER MANAGEMENT ───────────────────────────
function switchUsersTab(tab) {
  S.usersTab = tab;
  render();
}
export function doCreateUserInline() {
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
  socket.emit('updateData', {
    type: 'user',
    data: newUser
  });
  audit(`Created user ${username} (${role})`);
  toast('User created', 'success');
  switchUsersTab('all');
}
export function buildUsers() {
  if (S.role !== 'admin') return '<div class="empty">Unauthorized</div>';
  const currentTab = S.usersTab || 'all';
  const tabStyle = isActive => isActive ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);` : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
  const tabsHtml = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
          <div onclick="switchUsersTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(currentTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${currentTab === 'all' ? '1' : '0.8'}'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            All Users
          </div>
          <div onclick="switchUsersTab('create')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(currentTab === 'create')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${currentTab === 'create' ? '1' : '0.8'}'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create User
          </div>
        </div>
      `;
  let contentHtml = '';
  if (currentTab === 'create') {
    contentHtml = `
          <div class="section" style="overflow: visible;">
            <div class="section-hdr">
              <div class="section-title">Create New User</div>
            </div>
            <div style="padding: 24px;">
              <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                <div class="field" style="flex: 1; min-width: 200px; max-width: 320px;">
                  <label>Username <span class="required">*</span></label>
                  <input id="u-name" placeholder="Enter username">
                </div>
                <div class="field" style="flex: 1; min-width: 200px; max-width: 320px;">
                  <label>Password <span class="required">*</span></label>
                  <input id="u-pass" type="password" placeholder="Enter password">
                </div>
                <div class="field" style="flex: 1; min-width: 200px; max-width: 320px;">
                  <label>Role <span class="required">*</span></label>
                  <select id="u-role">
                    <option value="qa">QA</option>
                    <option value="dev">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style="margin-top: 24px; display: flex; gap: 12px;">
                <button class="btn btn-ghost" onclick="doCreateUserInline()" style="padding:7px 20px;">Create User</button>
                <button class="btn btn-ghost" onclick="document.getElementById('u-name').value=''; document.getElementById('u-pass').value=''; document.getElementById('u-role').value='qa'; document.getElementById('u-role').dispatchEvent(new Event('custom-update'));" style="padding:7px 20px;">Cancel</button>
              </div>
            </div>
          </div>
        `;
  } else {
    const usersQ = (document.getElementById('usersQ') || {
      value: ''
    }).value.toLowerCase();
    let filteredUsers = S.users;
    if (usersQ) {
      filteredUsers = filteredUsers.filter(u => [u.username, u.role, u.initialPassword, u.createdAt].some(v => textMatchesQuery(v, usersQ)));
    }
    const rows = filteredUsers.map(u => {
      let avatarBg = u.role === 'admin' ? 'color-mix(in srgb, var(--red) 10%, transparent)' : u.role === 'qa' ? 'color-mix(in srgb, var(--purple) 10%, transparent)' : 'color-mix(in srgb, var(--accent) 10%, transparent)';
      let avatarColor = u.role === 'admin' ? 'var(--red)' : u.role === 'qa' ? 'var(--purple)' : 'var(--accent)';
      let avatarText = u.username.substring(0, 2).toUpperCase();
      return `
          <tr style="transition: background 0.2s; cursor:default;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
            <td>
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:50%; background:${avatarBg}; color:${avatarColor}; font-weight:800; font-size:12px; letter-spacing:0.5px; flex-shrink:0;">
                  ${avatarText}
                </div>
                <span style="font-weight:600; color:var(--text); letter-spacing:-0.01em;">${u.username}</span>
              </div>
            </td>
            <td><div class="user-role-badge ${u.role === 'qa' ? 'role-qa' : u.role === 'dev' ? 'role-dev' : 'role-admin'}" style="box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-weight:700;">${u.role.toUpperCase()}</div></td>
            <td><div style="font-family:var(--mono); font-size:12px; color:var(--text2); background:var(--bg3); padding:4px 10px; border-radius:6px; display:inline-block; font-weight:500;">${u.initialPassword || '<span style="opacity:0.5; font-style:italic;">Not Recorded</span>'}</div></td>
            <td style="font-family: var(--mono); color:var(--text2); font-size:12px;">${formatDate(u.createdAt)}</td>
            <td>
              ${u.username === S.auth.user ? '<span class="badge" style="background:var(--bg2); color:var(--text2); border:1px solid var(--border); padding:4px 12px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.02); letter-spacing:0.5px;">YOU</span>' : u.username === 'ADMIN' ? '<span class="badge" style="background:var(--bg3); color:var(--text2); padding:4px 12px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.02); letter-spacing:0.5px;">SYSTEM</span>' : `<button class="btn btn-danger btn-sm" style="border-radius:6px; padding:4px 12px; font-weight:600; box-shadow:0 2px 8px rgba(239, 68, 68, 0.2);" onclick="deleteUser('${u.username}')">Delete</button>`}
            </td>
          </tr>
        `;
    }).join('');
    contentHtml = `
            <div class="section">
              <div class="section-hdr">
                <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Users List</div><div class="section-meta">${filteredUsers.length} Shown · ${S.users.length} Total</div></div>
                <div style="position:relative; width:220px;">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input class="filter-select${usersQ ? ' filter-active' : ''}" id="usersQ" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search users..." value="${escHtml(usersQ).replace(/\"/g, '&quot;')}" oninput="liveFilter(this)">
                </div>
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
                  ${rows || `<tr><td colspan="5" class="empty"><div class="empty-icon">${S.users.length > 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>'}</div>${S.users.length > 0 ? 'No users matches filters' : 'No users found.'}</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;
  }
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">User Management</div>
  </div>
  ${tabsHtml}
  ${contentHtml}
  `;
}
export function deleteUser(username) {
  if (username === 'ADMIN') {
    toast('Cannot delete the root ADMIN user', 'error');
    return;
  }
  openConfirm(`Delete User`, `Are you sure you want to delete user ${username}?`, () => {
    socket.emit('updateData', {
      type: 'user',
      data: {
        username,
        deleted: true
      }
    });
    audit(`Deleted user ${username}`);
    toast('User deleted', 'success');
  });
}
export
// ─────────────────────────── AUDIT ───────────────────────────
function buildAudit() {
  const auditQ = (document.getElementById('auditQ') || {
    value: ''
  }).value.toLowerCase();
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
  const validEventsRegex = /added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i;
  let filteredAuditLog = S.auditLog.filter(a => validEventsRegex.test(a.event)).sort((a, b) => b.time.localeCompare(a.time));
  if (auditQ) {
    filteredAuditLog = filteredAuditLog.filter(a => [a.event, a.actor, a.screen, a.time].some(v => textMatchesQuery(v, auditQ)));
  }
  const rows = filteredAuditLog.slice(0, 100).map(a => {
    let fullDateStr = formatDate(a.time);
    let parts = fullDateStr.split(' ');
    let datePart = parts[0] || '—';
    let timePart = parts[1] || '—';
    let screenName = a.screen ? titles[a.screen] || a.screen : '—';
    let eventIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 12 12 12 8"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    let eventColor = 'var(--text)';
    let iconBg = 'var(--bg3)';
    let iconColor = 'var(--text2)';
    const evt = a.event.toLowerCase();
    if (evt.includes('escalated')) {
      eventIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      eventColor = 'var(--orange)';
      iconBg = 'color-mix(in srgb, var(--orange) 10%, transparent)';
      iconColor = 'var(--orange)';
    } else if (evt.includes('passed') || evt.includes('fixed')) {
      eventIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      eventColor = 'var(--green)';
      iconBg = 'color-mix(in srgb, var(--green) 10%, transparent)';
      iconColor = 'var(--green)';
    } else if (evt.includes('failed') || evt.includes('deleted')) {
      eventIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      eventColor = 'var(--red)';
      iconBg = 'color-mix(in srgb, var(--red) 10%, transparent)';
      iconColor = 'var(--red)';
    } else if (evt.includes('added') || evt.includes('imported')) {
      eventIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      eventColor = 'var(--accent)';
      iconBg = 'color-mix(in srgb, var(--accent) 10%, transparent)';
      iconColor = 'var(--accent)';
    }
    return `
        <tr style="transition: background 0.2s; cursor:default;" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background='transparent'">
          <td style="font-family: var(--mono); color:var(--text2); font-size:12px; white-space:nowrap;">${datePart}</td>
          <td style="font-family: var(--mono); color:var(--text2); font-size:12px; white-space:nowrap;">${timePart}</td>
          <td>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="display:flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:8px; background:${iconBg}; color:${iconColor}; flex-shrink:0;">
                ${eventIcon}
              </div>
              <span style="color:${eventColor}; font-weight:600; letter-spacing:-0.01em;">${a.event}</span>
            </div>
          </td>
          <td><span style="color:var(--text3); font-weight:600; font-size:12px; background:var(--bg3); padding:4px 10px; border-radius:6px;">${screenName}</span></td>
            <td>
              ${(() => {
      let actorLower = a.actor.toLowerCase();
      let u = S.users.find(user => user.username.toLowerCase() === actorLower);
      let role = u ? u.role : actorLower === 'qa' ? 'qa' : actorLower === 'dev' ? 'dev' : 'admin';
      let badgeClass = role === 'qa' ? 'actor-qa' : role === 'dev' ? 'actor-dev' : 'actor-admin';
      return `<span class="badge ${badgeClass}" style="text-transform: uppercase; padding: 4px 10px; font-size: 11px; border-radius: 6px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">${a.actor}</span>`;
    })()}
            </td>
        </tr>`;
  }).join('');
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Audit Log</div>
    <div style="display:flex; align-items:center; gap:16px;">
      
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Audit Log</div><div class="section-meta">${filteredAuditLog.length} events</div></div>
      <div style="position:relative; width:220px;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input class="filter-select" id="auditQ" style="width:100%; padding-left:36px; border-radius:24px; border:1px solid var(--border); box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search audit log..." value="${escHtml(auditQ).replace(/\"/g, '&quot;')}" oninput="liveFilter(this)">
      </div>
    </div>
    <div class="tbl-wrap scrollable">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Event Description</th>
            <th>Screen Name</th>
            <th>User</th>
          </tr>
        </thead>
          <tbody>
            ${rows || `<tr><td colspan="5" class="empty"><div class="empty-icon">${S.auditLog.length > 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>'}</div>${S.auditLog.length > 0 ? 'No audit events matches filters' : 'No events yet.'}</td></tr>`}
          </tbody>
      </table>
    </div>
  </div>`;
}

// ─────────────────────────── REPORT ───────────────────────────