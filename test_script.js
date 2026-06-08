
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
      hmModDropdownOpen: false,
      sidebarCollapsed: false
    };
    window.toggleSidebar = function () {
      S.sidebarCollapsed = !S.sidebarCollapsed;
      render();
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



    function refreshData() {
      const app = document.getElementById('app');
      if (app && !document.getElementById('refresh-overlay')) {
        const isLight = currentTheme === 'light';
        const bg = 'color-mix(in srgb, var(--text) 5%, var(--bg2))';
        const imgSrc = isLight ? 'draft light.png' : 'draft.png';
        const overlay = document.createElement('div');
        overlay.id = 'refresh-overlay';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;background:${bg};backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;`;
        overlay.innerHTML = `<div class="loader-wrapper"><div class="loader-ring"></div><img src="${imgSrc}" class="loader-image" alt="Loading" /></div>`;
        app.appendChild(overlay);
      }
      window.isRefreshing = true;
      socket.disconnect();
      setTimeout(() => {
        socket.connect();
      }, 500);
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
        auditLog: (serverData.auditLog || []).filter(a => /added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(a.event)),
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
      if (window.isRefreshing) {
        window.isRefreshing = false;
        return; // Skip wiping the screen during manual refresh
      }
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
      if (!/added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(event)) return;
      const auditEntry = { time: nowFull(), event, actor: actor || (S.auth ? S.auth.user : 'system'), screen: S.view };

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
    function openConfirm(title, msg, cb, btnText = 'Delete permanently', btnClass = 'btn-danger', type = 'red') {
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
      confirmBtn.onclick = () => { closeConfirm(); cb(); };
    }
    function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); }

    function upgradeSelects(container) {
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
            div.onclick = (e) => {
              e.stopPropagation();
              select.selectedIndex = idx;
              updateTrigger();
              optionsList.classList.remove('open');
              wrapper.classList.remove('open');
              Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
              div.classList.add('selected');
              select.dispatchEvent(new Event('change', { bubbles: true }));
            };
            optionsList.appendChild(div);
          });
        };
        updateOptions();

        // Setup MutationObserver to watch for dynamic option changes
        const observer = new MutationObserver(updateOptions);
        observer.observe(select, { childList: true });

        wrapper.appendChild(optionsList);

        trigger.onclick = (e) => {
          e.stopPropagation();
          const isOpen = wrapper.classList.contains('open');
          document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
          if (!isOpen) wrapper.classList.add('open');
        };
      });
    }

    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    });
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
      if (!/added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i.test(event)) return;
      const auditEntry = { time: nowFull(), event, actor: actor || (S.auth ? S.auth.user : 'system'), screen: S.view };

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
    function openConfirm(title, msg, cb, btnText = 'Delete permanently', btnClass = 'btn-danger', type = 'red') {
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
      confirmBtn.onclick = () => { closeConfirm(); cb(); };
    }
    function closeConfirm() { document.getElementById('confirm-overlay').classList.remove('open'); }

    function upgradeSelects(container) {
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
            div.onclick = (e) => {
              e.stopPropagation();
              select.selectedIndex = idx;
              updateTrigger();
              optionsList.classList.remove('open');
              wrapper.classList.remove('open');
              Array.from(optionsList.children).forEach(c => c.classList.remove('selected'));
              div.classList.add('selected');
              select.dispatchEvent(new Event('change', { bubbles: true }));
            };
            optionsList.appendChild(div);
          });
        };
        updateOptions();

        // Setup MutationObserver to watch for dynamic option changes
        const observer = new MutationObserver(updateOptions);
        observer.observe(select, { childList: true });

        wrapper.appendChild(optionsList);

        trigger.onclick = (e) => {
          e.stopPropagation();
          const isOpen = wrapper.classList.contains('open');
          document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
          if (!isOpen) wrapper.classList.add('open');
        };
      });
    }

    document.addEventListener('click', () => {
      document.querySelectorAll('.custom-select.open').forEach(el => el.classList.remove('open'));
    });

    // ─────────────────────────── RENDER ───────────────────────────
    
    function highlightFilters() {
      document.querySelectorAll('.filter-select').forEach(el => {
        if (el.tagName === 'SELECT') {
          if (el.value && !el.value.startsWith('All')) {
            el.classList.add('filter-active');
          } else {
            el.classList.remove('filter-active');
          }
        } else if (el.tagName === 'INPUT') {
          if (el.value && el.value.trim() !== '') {
            el.classList.add('filter-active');
          } else {
            el.classList.remove('filter-active');
          }
        }
      });
    }
\n    function render() {
      setTimeout(highlightFilters, 0);
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
      upgradeSelects(app);

      const newContentEl = document.getElementById('content');
      if (newContentEl) newContentEl.scrollTop = scrollContent;
    }

    function buildLoading() {
      const isLight = currentTheme === 'light';
      return `
  <div style="flex: 1; width: 100%; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top, rgba(59,130,246,0.15), transparent 40%), radial-gradient(circle at bottom right, rgba(34,197,94,0.08), transparent 30%), var(--bg);">
    <div class="loader-wrapper">
      <div class="loader-ring"></div>
      <img src="${isLight ? 'draft light.png' : 'draft.png'}" class="loader-image" alt="Loading" />
    </div>
  </div>`;
    }

    function buildLogin() {
      return `
  <div class="login-screen">
    <div style="position: absolute; top: 24px; right: 24px; z-index: 10;">
      <button onclick="toggleTheme()" title="Toggle Theme" style="background: transparent; border: none; cursor: pointer; color: var(--text); opacity: 0.5; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; padding: 8px;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">
        ${currentTheme === 'light' ?
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' :
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'}
      </button>
    </div>
    <div class="login-icon"><img src="${currentTheme === 'light' ? 'login-icon light.png' : 'login-icon.png'}" alt="Login" /></div>
    <div class="login-card">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#ed3224" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span class="login-header-text">LOGIN</span>
      </div>
      <div class="login-title">Bug OS - Unified QA Management Platform</div>
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

    function buildApp() {
      const openBugs = S.bugs.filter(b => normalizeStatus(b.status) === 'open').length;
      const escalatedCount = S.bugs.filter(b => normalizeStatus(b.status) === 'escalated').length;
      const retestPending = S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length;
      return `
  <div class="sidebar ${S.sidebarCollapsed ? 'collapsed' : ''}">
    <div class="sidebar-logo" style="display:flex; align-items:center; gap:12px; padding:20px 16px; border-bottom:1px solid var(--border); background: linear-gradient(180deg, var(--bg3) 0%, transparent 100%); margin-bottom: 8px;">
      <div class="logo-icon" style="width:44px; height:44px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        <img src="${currentTheme === 'light' ? 'sidebar icon light.png' : 'sidebar icon.png'}" alt="BUG OS" style="width:44px; height:44px; object-fit:contain;"/>
      </div>
      <div class="logo-text" style="display:flex; flex-direction:column; justify-content:center; overflow:hidden;">
        <div style="display:flex;">
          <div class="user-role-badge ${S.role === 'qa' ? 'role-qa' : S.role === 'dev' ? 'role-dev' : 'role-admin'}" style="font-size:12px; padding:4px 10px; letter-spacing:0.04em; border-radius:6px; font-weight:700; text-transform:uppercase; display:inline-flex; align-items:center; line-height:1;">${S.role === 'qa' ? 'QA PANEL' : S.role === 'dev' ? 'DEV PANEL' : 'ADMIN PANEL'}</div>
        </div>
      </div>
      <button class="hamburger-btn" onclick="toggleSidebar()" style="background:transparent; border:none; cursor:pointer; color:var(--text2); margin-left:auto; display:flex; align-items:center; justify-content:center; padding:6px; border-radius:6px; transition:all 0.2s;" onmouseover="this.style.background='var(--border)'" onmouseout="this.style.background='transparent'" title="Toggle Sidebar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </div>
    <nav class="nav">
      ${navItem('dashboard', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`, 'Dashboard', 0)}
      ${navItem('testcases', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg>`, 'Test Cases', 0)}
      ${navItem('bugs', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>`, 'Bug Reports', openBugs)}
      ${navItem('retest', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`, 'Retest Queue', retestPending)}
      ${navItem('escalations', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`, 'Backend Bugs', escalatedCount)}
      ${navItem('automation', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>`, 'Automation', 0)}
      ${navItem('modules', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`, 'Modules', 0)}
      ${navItem('audit', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, 'Audit Log', 0)}
      ${navItem('report', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>`, 'Reports', 0)}
      ${S.role === 'admin' ? navItem('users', `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, 'User Management', 0) : ''}
    </nav>
    <div class="sidebar-switch" style="padding:12px 8px; border-top:1px solid var(--border);">
      ${S.auth.user !== 'ADMIN' ? `<div class="nav-item" onclick="openChangePassword()" title="Change Password">
        <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span> <span class="nav-item-label">Change Password</span>
      </div>` : ''}
      <div class="nav-item" onclick="logout()" style="color:var(--red);" onmouseover="this.style.background='var(--red-bg)'" onmouseout="this.style.background=''" title="Logout">
        <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red)"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span> <span class="nav-item-label">Logout</span>
      </div>   
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
      return `<div class="nav-item ${S.view === id ? 'active' : ''}" onclick="nav('${id}')" title="${label}">
    <span class="nav-icon">${icon}</span> <span class="nav-item-label">${label}</span>
    ${badge > 0 ? `<span class="nav-badge">${badge}</span>` : ''}
  </div>`;
    }

    function buildTopbar() {
      if (['dashboard', 'testcases', 'bugs', 'retest', 'escalations', 'automation', 'modules', 'audit', 'report', 'users'].includes(S.view)) return '';
      const titles = { dashboard: 'Dashboard', testcases: 'Test Cases', bugs: 'Bug Reports', retest: 'Retest Queue', escalations: 'Backend Escalations', automation: 'Automation', modules: 'Modules', audit: 'Audit Log', report: 'Reports', users: 'User Management' };
      let actions = '';
      if (S.view === 'testcases' && S.role === 'qa') {
        actions = `<button class="btn btn-ghost btn-sm" onclick="openImportCSV()" class="glow-hover">↑ Import Test Cases</button><button class="btn btn-ghost btn-sm" onclick="openAddTC()">+ Add Test Case</button>`;
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
      </div>
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
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

      const usersQ = (document.getElementById('usersQ') || { value: '' }).value.toLowerCase();

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
            ${u.username === S.auth.user ? '<span class="badge" style="background:var(--bg2); color:var(--text2); border:1px solid var(--border); padding:4px 12px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.02); letter-spacing:0.5px;">YOU</span>' : (u.username === 'ADMIN' ? '<span class="badge" style="background:var(--bg3); color:var(--text2); padding:4px 12px; border-radius:6px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.02); letter-spacing:0.5px;">SYSTEM</span>' : `<button class="btn btn-danger btn-sm" style="border-radius:6px; padding:4px 12px; font-weight:600; box-shadow:0 2px 8px rgba(239, 68, 68, 0.2);" onclick="deleteUser('${u.username}')">Delete</button>`)}
          </td>
        </tr>
      `}).join('');

      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">User Management</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <button class="btn btn-ghost" style="padding:6px 12px; font-size:12px; border-radius:6px; display:inline-flex; align-items:center; gap:6px;" onclick="openAddUser()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Create User</button>
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>
          <div class="section">
            <div class="section-hdr">
              <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">User Management</div><div class="section-meta">${filteredUsers.length} Shown · ${S.users.length} Total</div></div>
              <div style="position:relative; width:220px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input class="filter-select" id="usersQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search users..." value="${escHtml(usersQ).replace(/\"/g, '&quot;')}" oninput="liveFilter(this)">
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
      const escQ = (document.getElementById('escQ') || { value: '' }).value.toLowerCase();
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
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Backend Escalations</div><div class="section-meta">${bugs.length} Shown · ${S.bugs.filter(b => b.status === 'Escalated').length} Total</div></div>
      <div style="font-size:12px;color:var(--text);position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;">${isDev ? 'Escalated by Frontend Team' : 'Waiting for Backend Team to resolve'}</div>
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
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="escQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search escalations..." value="${escQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    ${bugs.length === 0
          ? (S.bugs.filter(b => b.status === 'Escalated').length > 0
            ? `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>No escalated bugs matches filters</div>`
            : `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>No escalations. All bugs are frontend-resolvable!</div>`)
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

      const passRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Pass</div>` +
        modData.map((d) => {
          const pPct = d.p ? Math.max(8, Math.round((d.p / maxPass) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, var(--green) ${pPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Pass: ${d.p}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
        }).join('');

      const failRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Fail</div>` +
        modData.map((d) => {
          const fPct = d.f ? Math.max(8, Math.round((d.f / maxFail) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, var(--red) ${fPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Fail: ${d.f}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
        }).join('');

      const holdRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Hold</div>` +
        modData.map((d) => {
          const hPct = d.h ? Math.max(8, Math.round((d.h / maxHold) * 100)) : 0;
          return `<div style="background:color-mix(in srgb, var(--orange) ${hPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod} - Hold: ${d.h}')" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
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
      const dashQ = (document.getElementById('dashQ') || { value: '' }).value.toLowerCase();
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
      const modList = dashModFilter.length > 0 ? dashModFilter : S.modules;
      // modOpts removed since the native select was replaced with custom multi-select

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
      const qaLargeArc = qaPct > 50 ? 1 : 0;
      const qaPath = qaPct === 100 ? `M 100 100 L 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z` : (qaPct > 0 ? `M 100 100 L ${devX} ${devY} A 80 80 0 ${qaLargeArc} 1 100 20 Z` : '');

      return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div style="font-size:28px;font-weight:700;color:var(--text); letter-spacing:-0.02em;">BUG OS Dashboard</div>
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  <div class="section" style="overflow:visible;">
    <div class="section-hdr" style="overflow:visible; align-items:flex-start; border-bottom:none; padding-bottom:16px;">
      <div class="section-title" style="margin-top:8px;">KPI Filters</div>
      <div class="filters" style="display:flex; gap:12px; align-items:flex-start; overflow:visible;">
        <div id="dashModFilterContainer" style="position:relative; width:350px; font-size:12px; font-family:var(--font);">
          <div onclick="window.toggleDashModDropdown(event)" style="border:1px solid var(--btn-border); border-radius:var(--radius); padding:4px 32px 4px 8px; min-height:28px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg3); align-items:center; transition: border-color 0.15s;" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--btn-border)'">
            ${(!S.dashModFilter || S.dashModFilter.length === 0) ? `<span style="color:var(--text3); padding:0px;">Select KPI modules...</span>` :
          S.dashModFilter.map(m => `
              <div style="background:var(--bg2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
                <span>${m}</span>
                <span style="cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.removeDashModFilter(event, '${m}')">×</span>
              </div>
            `).join('')}
            <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
              ${(S.dashModFilter && S.dashModFilter.length > 0) ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearDashModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
              <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div id="dashModDropdown" style="display:${S.dashModDropdownOpen ? 'block' : 'none'}; position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); max-height:250px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px 0;">
            ${S.modules.map(m => `
              <div class="custom-select-option" onclick="window.toggleDashModFilter(event, '${m}')" style="display:flex; align-items:center; ${(S.dashModFilter || []).includes(m) ? 'background:rgba(59, 130, 246, 0.1); color:var(--accent); font-weight:500;' : ''}">
                <input type="checkbox" ${(S.dashModFilter || []).includes(m) ? 'checked' : ''} style="margin-right:8px; pointer-events:none;">
                <span>${m}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:24px; margin-bottom:32px;">
    <!-- Card 1 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.08)';this.style.borderColor='var(--accent)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px;">Total Test Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${total}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totL}</span></div>
      </div>
    </div>
    <!-- Card 2 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(22, 163, 74, 0.12)';this.style.borderColor='var(--green)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.8px;">Total Passed Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--green); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${pass}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passL}</span></div>
      </div>
    </div>
    <!-- Card 3 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(220, 38, 38, 0.12)';this.style.borderColor='var(--red)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:0.8px;">Total Failed Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--red); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${fail + hold}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">Fail</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${fail}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Hold</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${hold}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; opacity:0; pointer-events:none;"><span style="font-weight:600;">Hidden</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">0</span></div>
      </div>
    </div>
    <!-- Card 4 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(245, 158, 11, 0.12)';this.style.borderColor='var(--orange)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--orange); text-transform:uppercase; letter-spacing:0.8px;">Bug Queue</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${openBugs + retestBugs + escalatedBugs}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Open</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${openBugs}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Fixed</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestBugs}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--orange); font-weight:600;">Escalated</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${escalatedBugs}</span></div>
      </div>
    </div>
    <!-- Card 5 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(168, 85, 247, 0.12)';this.style.borderColor='var(--purple)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--purple); text-transform:uppercase; letter-spacing:0.8px;">Retest Queue</div>
      <div style="font-size:42px; font-weight:800; color:var(--purple); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${retestBugs}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestL}</span></div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">Module Health</div>
        <select class="filter-select" id="modHealthF" style="border-color: var(--border);" onchange="render()">
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
        <select class="filter-select" id="workPendingModF" style="border-color: var(--border);" onchange="render()">
          <option value="">All Modules</option>
          ${S.modules.map(m => `<option value="${m}"${workPendingModF === m ? ' selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;">
          ${totalWork > 0 ? `
          ${devPct > 0 ? `<path d="${devPath}" fill="var(--purple)"/>` : ''}
          ${qaPath ? `<path d="${qaPath}" fill="var(--green)"/>` : ''}
          ` : ''}
        </svg>
        <div style="margin-left:24px;font-size:13px;line-height:1.8;">
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--purple);border-radius:2px;margin-right:8px;"></span>Dev Team: ${devWork} Items - ${devPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;margin-right:8px;"></span>QA Team: ${qaWork} Items - ${qaPct}%</div>
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
      <div id="hmModFilterContainer" style="position:relative; width:350px; font-size:12px; font-family:var(--font);">
        <div onclick="window.toggleHmModDropdown(event)" style="border:1px solid var(--btn-border); border-radius:var(--radius); padding:4px 32px 4px 8px; min-height:28px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg3); align-items:center; transition: border-color 0.15s;" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--btn-border)'">
          ${(!S.hmModFilter || S.hmModFilter.length === 0) ? `<span style="color:var(--text3); padding:0px;">Select modules...</span>` :
          S.hmModFilter.map(m => `
            <div style="background:var(--bg2); border:1px solid var(--border); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
              <span>${m}</span>
              <span style="cursor:pointer; font-weight:bold; font-size:11px;" onclick="window.removeHmModFilter(event, '${m}')">×</span>
            </div>
          `).join('')}
          <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
            ${(S.hmModFilter && S.hmModFilter.length > 0) ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearHmModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div id="hmModDropdown" style="display:${S.hmModDropdownOpen ? 'block' : 'none'}; position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); max-height:250px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px 0;">
          ${S.modules.map(m => `
            <div class="custom-select-option" onclick="window.toggleHmModFilter(event, '${m}')" style="display:flex; align-items:center; ${(S.hmModFilter || []).includes(m) ? 'background:rgba(59, 130, 246, 0.1); color:var(--accent); font-weight:500;' : ''}">
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
      const tcQ = (document.getElementById('tcQ') || { value: '' }).value.toLowerCase();
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
        <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">
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
      ${S.role === 'qa' ? `<button class="btn btn-ghost glow-hover" style="padding:6px 16px; font-size:12px; font-weight:600; border-radius:24px; border:1px solid var(--border); display:inline-flex; align-items:center; gap:6px; background:var(--bg2); box-shadow:0 1px 4px rgba(0,0,0,0.02); transition:all 0.2s ease;" onclick="openImportCSV()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Import Test Cases</button><button class="btn glow-hover-accent" style="padding:6px 16px; font-size:12px; font-weight:600; border-radius:24px; border:none; display:inline-flex; align-items:center; gap:6px; background:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(59, 130, 246, 0.25); transition:all 0.2s ease;" onclick="openAddTC()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Test Case</button>` : ''}
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
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
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="tcQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search test cases..." value="${tcQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    <div style="padding:8px 24px; background:rgba(0,0,0,0.005); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:flex-start; gap:8px; flex-wrap:wrap;">
      <button onclick="downloadTestCasesCSV()" class="btn btn-ghost glow-hover" style="padding:4px 12px; font-size:11px; font-weight:600; border-radius:12px; display:inline-flex; align-items:center; gap:6px; background:var(--bg); border:1px solid var(--border); color:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.05); text-transform:uppercase; letter-spacing:0.06em; margin-right:8px; cursor:pointer; transition:all 0.2s ease;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> EXPORT CSV</button>
      <select class="filter-select" id="tcDlMod" onchange="render()" style="background:transparent; border:1px dashed var(--btn-border); height:26px; padding:0 24px 0 8px;">
        <option value="">All Modules</option>${dlModOpts}
      </select>
      <select class="filter-select" id="tcDlSt" onchange="render()" style="background:transparent; border:1px dashed var(--btn-border); height:26px; padding:0 24px 0 8px;">
        <option value="">All Status</option>
        <option${dlSt === 'Pass' ? ' selected' : ''}>Pass</option>
        <option${dlSt === 'Fail' ? ' selected' : ''}>Fail</option>
        <option${dlSt === 'Hold' ? ' selected' : ''}>Hold</option>
      </select>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="13" class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg></div>No test cases matches filters</td></tr>'}</tbody>
    </table></div>
  </div>`;
    }

    // ─────────────────────────── BUGS ───────────────────────────
    function buildBugs() {
      const bugModF = (document.getElementById('bugModF') || { value: '' }).value;
      const bugStF = (document.getElementById('bugStF') || { value: '' }).value;
      const bugTcStF = (document.getElementById('bugTcStF') || { value: '' }).value;
      const bugSevF = (document.getElementById('bugSevF') || { value: '' }).value;
      const bugQ = (document.getElementById('bugQ') || { value: '' }).value.toLowerCase();

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
      <td><div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">${actions}</div></td>
    </tr>`;
      }).join('');

      const openCount = S.bugs.filter(b => b.status === 'Open' || b.status === 'Retest Failed' || b.status === 'Escalated').length;
      return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Bug Reports</div>
    <div style="display:flex; align-items:center; gap:16px;">
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Bug Reports</div><div class="section-meta">${data.length} Shown </div></div>
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
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="bugQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search bug reports..." value="${bugQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>Bug ID</th><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Expected</th><th>Actual</th><th>Bug Status</th><th>Status</th><th>Severity</th><th>Evidence</th><th>Notes</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="15" class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg></div>No bugs matches filters</td></tr>'}</tbody>
    </table></div>
  </div>`;
    }

    // ─────────────────────────── RETEST QUEUE ───────────────────────────
    function buildRetest() {
      const rtModF = (document.getElementById('rtModF') || { value: '' }).value;
      const rtSevF = (document.getElementById('rtSevF') || { value: '' }).value;
      const rtQ = (document.getElementById('rtQ') || { value: '' }).value.toLowerCase();
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
        <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">
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
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
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
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select" id="rtQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search retest queue..." value="${rtQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    ${bugs.length === 0 ? (S.bugs.filter(b => normalizeStatus(b.status) === 'fixed').length > 0
          ? `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>No bugs marked as fixed matches filters</div>`
          : `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></div>No bugs awaiting retest. All clear!</div>`) : `
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
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>
  <style>
    .hover-blur-container { position: relative; overflow: hidden; }
    .hover-blur-overlay {
      position: absolute;
      inset: 0;
      background: rgba(18, 18, 18, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    [data-theme='light'] .hover-blur-overlay {
      background: rgba(255, 255, 255, 0.6);
    }
    .hover-blur-container:hover .hover-blur-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    .coming-soon-badge {
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 16px 32px;
      border-radius: 32px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      transform: translateY(20px) scale(0.95);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .hover-blur-container:hover .coming-soon-badge {
      transform: translateY(0) scale(1);
    }
    .coming-soon-icon {
      color: var(--accent);
      animation: pulse-icon 2s infinite;
    }
    @keyframes pulse-icon {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
    .coming-soon-text {
      background: linear-gradient(90deg, var(--accent), var(--purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.1em;
    }
  </style>
  <div class="section hover-blur-container">
    <div class="hover-blur-overlay">
      <div class="coming-soon-badge">
        <svg class="coming-soon-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span class="coming-soon-text">COMING SOON</span>
      </div>
      <div style="margin-top: 16px; color: var(--text2); font-size: 13px; font-weight: 500; opacity: 0; transform: translateY(10px); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;">Automation features are currently under development</div>
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
      const modQ = (document.getElementById('modQ') || { value: '' }).value.toLowerCase();
      let filteredModules = S.modules;
      if (modQ) {
        filteredModules = filteredModules.filter(m => textMatchesQuery(m, modQ));
      }

      const cards = filteredModules.map(mod => {
        const tcs = S.testCases.filter(t => t.module === mod);
        const pass = tcs.filter(t => t.status === 'Pass').length;
        const fail = tcs.filter(t => t.status === 'Fail').length;
        const hold = tcs.filter(t => t.status === 'Hold').length;
        const bugs = S.bugs.filter(b => b.module === mod);
        const openB = bugs.filter(b => b.status === 'Open').length;
        const pct = tcs.length ? Math.round(pass / tcs.length * 100) : 0;
        const canDelete = S.role === 'qa';
        return `<div class="section" style="margin-bottom:16px; border-radius:16px; overflow:hidden; transition:all 0.2s; border:1px solid var(--border);" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)';this.style.borderColor='var(--border2)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.02)';this.style.borderColor='var(--border)'">
      <div class="section-hdr" style="padding:16px 20px; background:linear-gradient(90deg, var(--bg3) 0%, transparent 100%); border-bottom:1px solid var(--border);">
        <div class="section-title" style="font-size:16px; letter-spacing:-0.02em;">${mod}</div>
        ${canDelete ? `<button class="btn btn-ghost btn-sm" style="border-radius:12px; padding:4px 10px; font-size:11px; color:var(--red); border-color:var(--red-border); background:var(--red-bg);" onclick="deleteModule('${mod}')"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> Delete Module</button>` : ''}
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
      <div style="position:relative; width:220px;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="modQ" class="filter-select" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search modules..." oninput="liveFilter(this)" value="${escHtml(modQ).replace(/\"/g, '&quot;')}">
      </div>
      ${S.role === 'qa' ? `<button class="btn" style="padding:6px 16px; font-size:12px; font-weight:600; border-radius:24px; border:none; display:inline-flex; align-items:center; gap:6px; background:var(--accent); color:#fff; box-shadow:0 2px 8px rgba(59, 130, 246, 0.25);" onclick="openAddModule()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Module</button>` : ''}
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>`;
      const emptyMsg = S.modules.length === 0
        ? `No modules yet. ${S.role === 'qa' ? 'Add your first module.' : 'Contact QA to add modules.'}`
        : 'No modules matches filters';
      return header + (cards || `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg></div>${emptyMsg}</div>`);
    }

    // ─────────────────────────── AUDIT ───────────────────────────
    function buildAudit() {
      const auditQ = (document.getElementById('auditQ') || { value: '' }).value.toLowerCase();
      const titles = { dashboard: 'Dashboard', testcases: 'Test Cases', bugs: 'Bug Reports', retest: 'Retest Queue', escalations: 'Backend Escalations', automation: 'Automation', modules: 'Modules', audit: 'Audit Log', report: 'Reports', users: 'User Management' };
      const validEventsRegex = /added to module|Imported.*test cases|marked as Fixed|escalated|Module.*added|permanently deleted|retest/i;
      let filteredAuditLog = S.auditLog.filter(a => validEventsRegex.test(a.event))
        .sort((a, b) => b.time.localeCompare(a.time));

      if (auditQ) {
        filteredAuditLog = filteredAuditLog.filter(a => [a.event, a.actor, a.screen, a.time].some(v => textMatchesQuery(v, auditQ)));
      }
      const rows = filteredAuditLog.slice(0, 100).map(a => {
        let fullDateStr = formatDate(a.time);
        let parts = fullDateStr.split(' ');
        let datePart = parts[0] || '—';
        let timePart = parts[1] || '—';
        let screenName = a.screen ? (titles[a.screen] || a.screen) : '—';

        let eventIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 12 12 12 8"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        let eventColor = 'var(--text)';
        let iconBg = 'var(--bg3)';
        let iconColor = 'var(--text2)';

        const evt = a.event.toLowerCase();
        if (evt.includes('escalated')) {
          eventIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
          eventColor = 'var(--orange)';
          iconBg = 'color-mix(in srgb, var(--orange) 10%, transparent)';
          iconColor = 'var(--orange)';
        } else if (evt.includes('passed') || evt.includes('fixed')) {
          eventIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
          eventColor = 'var(--green)';
          iconBg = 'color-mix(in srgb, var(--green) 10%, transparent)';
          iconColor = 'var(--green)';
        } else if (evt.includes('failed') || evt.includes('deleted')) {
          eventIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
          eventColor = 'var(--red)';
          iconBg = 'color-mix(in srgb, var(--red) 10%, transparent)';
          iconColor = 'var(--red)';
        } else if (evt.includes('added') || evt.includes('imported')) {
          eventIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
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
            let role = u ? u.role : (actorLower === 'qa' ? 'qa' : (actorLower === 'dev' ? 'dev' : 'admin'));
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
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">Audit Log</div><div class="section-meta">${filteredAuditLog.length} events</div></div>
      <div style="position:relative; width:220px;">
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input class="filter-select" id="auditQ" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search audit log..." value="${escHtml(auditQ).replace(/\"/g, '&quot;')}" oninput="liveFilter(this)">
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
    function buildReport() {
      const reportQ = (document.getElementById('reportQ') || { value: '' }).value.toLowerCase();
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
        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="reportQ" class="filter-select" style="width:100%; padding-left:36px; border-radius:24px;  box-shadow:0 1px 4px rgba(0,0,0,0.02);" placeholder="Search modules..." oninput="liveFilter(this)" value="${escHtml(reportQ).replace(/\"/g, '&quot;')}">
      </div>
      <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px; margin-left:16px;">
        <div style="font-variant-numeric:tabular-nums; letter-spacing:0.02em; font-size:12px; font-weight:600; color:var(--text); padding:4px 12px; display:flex; align-items:center; gap:6px; border-right:1px solid var(--border); margin-right:4px;">
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
  <span id="live-clock">${formatDate(nowFull())}</span>
</div>
        <button class="theme-btn" onclick="refreshData()" title="Refresh Data" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button class="theme-btn" onclick="toggleTheme()" title="Toggle theme" style="background:transparent; border:none; border-radius:50%; width:32px; height:32px; padding:0; cursor:pointer; display:flex; align-items:center; justify-content:center; color:var(--text2); transition:all 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
          ${currentTheme === 'dark' ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'}
        </button>
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
      <button class="btn btn-ghost btn-sm" onclick="exportCSV()">Export CSV</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Module</th><th>Total Tests</th><th>Pass</th><th>Fail</th><th>Hold</th><th>Total Bugs</th><th>Open Bugs</th></tr></thead>
      <tbody>${modRows || `<tr><td colspan="7" class="empty"><div class="empty-icon">${S.modules.length > 0 ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'}</div>${S.modules.length > 0 ? 'No modules matches filters' : 'No modules yet.'}</td></tr>`}</tbody>
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
        return `<a href="${ev}" target="_blank" rel="noopener noreferrer" title="Open attached image" style="display:inline-block;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"><img src="${ev}" alt="Evidence" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--border);border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.05);"></a>`;
      }
      if (isHttpUrl(ev)) {
        const safe = escHtml(ev);
        const isImg = isImageEvidence(ev);
        const text = isImg ? 'Image' : 'Link';
        const icon = isImg
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.7"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
        return `<a href="${safe}" target="_blank" rel="noopener noreferrer" class="table-link-pill">${icon} ${text}</a>`;
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
        container.innerHTML = `<a href="${safe}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--text);text-decoration:none;">Open evidence link</a>`;
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

      audit(`${id} added to module ${mod} with status ${status}`);

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

      audit(`Bug ${bugId} auto-created from failed test case ${tc.id} "${tc.testCase}"`);
      toast(`Bug ${bugId} auto-created from failed test ${tc.id}`, 'info');
    }

    function viewTC(id, module) {
      const tc = S.testCases.find(t => testcaseKeysMatch(t, { id, module }));
      if (!tc) return;
      const linkedBug = S.bugs.find(b => bugRefsTestCaseKeys(b, id, tc.module));
      showModal(`Test Case: ${tc.id}`, `
  <div class="detail-section">
    <h4 style="display:flex;align-items:center;gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      Test Case Details
    </h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value" style="font-weight:500;">${tc.id}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(tc.status)}</div></div>
      <div class="detail-item"><div class="detail-label">Module</div><div class="detail-value">${tc.module}</div></div>
      <div class="detail-item"><div class="detail-label">Screen</div><div class="detail-value">${tc.screen || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Severity</div><div class="detail-value">${sevBadge(tc.severity)}</div></div>
      <div class="detail-item"><div class="detail-label">Created</div><div class="detail-value" style="font-size:12px;color:var(--text2)">${formatDate(tc.createdAt)}</div></div>
    </div>
  </div>
  <div class="detail-section">
    <h4 style="display:flex;align-items:center;gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
      Test Information
    </h4>
    <div class="detail-item" style="margin-bottom:24px"><div class="detail-label">Scenario</div><div class="detail-value" style="color:var(--text2)">${tc.scenario || '—'}</div></div>
    <div class="detail-item" style="margin-bottom:24px"><div class="detail-label">Test Steps</div><div class="minimal-well">${tc.steps}</div></div>
    <div class="detail-grid" style="margin-bottom:24px">
      <div class="detail-item"><div class="detail-label">Expected Results</div><div class="minimal-well">${tc.expected}</div></div>
      <div class="detail-item"><div class="detail-label">Actual Results</div><div class="minimal-well" style="color:${tc.status === 'Fail' ? 'var(--red)' : 'var(--text2)'}; border-left-color:${tc.status === 'Fail' ? 'var(--red)' : 'var(--border)'}">${tc.actual}</div></div>
    </div>
    ${tc.evidence ? `<div class="detail-item" style="margin-bottom:24px"><div class="detail-label">Evidence</div><div style="margin-top:8px"><a href="${tc.evidence}" target="_blank" class="attachment-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div></div>` : ''}
    ${tc.notes ? `<div class="detail-item"><div class="detail-label">Notes</div><div class="minimal-well">${tc.notes}</div></div>` : ''}
  </div>
  ${linkedBug ? `
  <div class="detail-section" style="margin-bottom:0">
    <h4 style="display:flex;align-items:center;gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      Linked Bug
    </h4>
    <div class="linked-bug-card" onclick="closeModal(); setTimeout(()=>viewBug('${linkedBug.id}'),100);">
      <div style="color:var(--red);font-weight:600;">${linkedBug.id}</div>
      <div style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;color:var(--text);">${linkedBug.bugTitle || linkedBug.testCase}</div>
      <div>${statusBadge(linkedBug.status)}</div>
    </div>
  </div>` : ''}
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
      <div class="detail-item"><div class="detail-label">Bug ID</div><div class="detail-value" style="font-family:var(--mono);color:var(--text)">${b.id}</div></div>
      <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(b.status)}</div></div>
      <div class="detail-item"><div class="detail-label">Module</div><div class="detail-value">${b.module}</div></div>
      <div class="detail-item"><div class="detail-label">Screen</div><div class="detail-value">${b.screen || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Severity</div><div class="detail-value">${sevBadge(b.severity)}</div></div>
      <div class="detail-item"><div class="detail-label">Linked Test Case</div><div class="detail-value" style="font-family:var(--mono)">${b.tcId}</div></div>
    </div>
    <div class="detail-item"><div class="detail-label">Evidence</div><div style="font-size:12px;color:var(--text)">${renderEvidenceCell(linkedTc?.evidence)}</div></div>
    <div class="detail-item"><div class="detail-label">Notes</div><div style="font-size:12px;color:var(--text2)">${linkedTc?.notes || '—'}</div></div>
  </div>
  <div class="detail-section">
    <h4>Audit Timeline</h4>
    <div class="timeline">${history || '<div style="color:var(--text3);font-size:13px">No history yet</div>'}</div>
  </div>
  <div class="detail-section">
    <h4>Date Tracking</h4>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Failed On</div><div style="color:var(--text);font-family:var(--mono);font-size:12px">${formatDate(b.failedAt) || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Fixed On</div><div style="color:var(--text);font-family:var(--mono);font-size:12px">${formatDate(b.fixedAt) || 'Not fixed yet'}</div></div>
      <div class="detail-item"><div class="detail-label">Retest On</div><div style="color:var(--text);font-family:var(--mono);font-size:12px">${formatDate(b.retestAt) || 'Not retested yet'}</div></div>
      <div class="detail-item"><div class="detail-label">Retest Count</div><div style="font-family:var(--mono);font-size:12px">${b.retestCount}</div></div>
      ${b.escalatedAt ? `<div class="detail-item"><div class="detail-label">Escalated On</div><div style="color:var(--text);font-family:var(--mono);font-size:12px">${formatDate(b.escalatedAt)}</div></div>` : ''}
    </div>
    ${b.devNotes ? `<div class="detail-item"><div class="detail-label">Dev Notes</div><div style="font-size:12px;color:var(--text2)">${b.devNotes}</div></div>` : ''}
    ${b.escalationReason ? `<div class="detail-item"><div class="detail-label">Escalation Reason</div><div style="font-size:12px;color:var(--text)">${b.escalationReason}</div></div>` : ''}
  </div>
  `, null, true);
    }

    // ─────────────────────────── ACTIONS ───────────────────────────
    function markFixed(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      showModal('Mark Bug as Fixed', `
  <div style="margin-bottom:16px;padding:12px;background:var(--green-bg);border:1px solid var(--green-border);border-radius:var(--radius);">
    <div style="font-size:12px;color:var(--green);font-family:var(--font);font-weight:600;letter-spacing:0.05em;margin-bottom:4px">BUG: ${bugId}</div>
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
        b.history.push({ date: now(), event: `Marked as Fixed. Notes: ${notes}`, actor: S.auth.user });

        // Send bug update to server
        socket.emit('updateData', { type: 'bug', data: b });

        audit(`${bugId} marked as Fixed`);
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
          b.history.push({ date: now(), event: 'Retest PASSED — bug verified and closed', actor: S.auth.user });
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

          audit(`${bugId} retest PASSED`);
          save();
          toast(`Retest passed! Bug ${bugId} verified. Test case ${b.tcId} is now PASS.`, 'success');
        },
        'Confirm Pass',
        'btn-success',
        'green');
    }

    function retestFail(bugId) {
      if (!initialDataReceived) { toast('Waiting for server data...', 'error'); return; }
      const b = S.bugs.find(x => x.id === bugId);
      if (!b) return;
      openConfirm('Confirm Retest Fail',
        `Mark bug ${bugId} as FAILED?\n\nThis will re-open the bug and return it to the active Bug Reports queue.`,
        () => {
          b.status = 'Open';
          b.retestAt = now();
          b.retestCount++;
          b.retestResult = 'Fail';
          b.fixedAt = null;
          b.history.push({ date: now(), event: `Retest FAILED — bug re-opened (Retest #${b.retestCount})`, actor: S.auth.user });
          const tc = S.testCases.find(t => testcaseKeysMatch(t, { id: b.tcId, module: b.module }));
          if (tc) {
            tc.status = 'Fail';
            tc.updatedAt = now();

            // Send test case update to server
            socket.emit('updateData', { type: 'testCase', data: tc });
          }

          // Send bug update to server
          socket.emit('updateData', { type: 'bug', data: b });

          audit(`${bugId} retest FAILED`);
          save();
          toast(`Retest failed. Bug ${bugId} returned to queue.`, 'error');
        },
        'Confirm Fail',
        'btn-danger',
        'red'
      );
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
          audit(`Test case ${id} "${tc.testCase}" permanently deleted along with linked bugs`);
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
          audit(`Bug ${id} "${b.testCase}" permanently deleted`);
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
          audit(`Module "${name}" and ${deletedTCs.length} linked test cases permanently deleted`);
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
        audit(`Module "${name}" added`);
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
      audit('Report exported as CSV');
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
  <div style="margin-bottom:24px;font-size:13px;color:var(--text3);display:flex;align-items:center;gap:8px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    Editing <span style="color:var(--text);font-weight:500;">${tc.id}</span> — ID cannot be changed
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
      tc.history.push({ date: now(), event: `Edited. Status: ${oldStatus} → ${status}` });

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

          audit(`Bug ${linked.id} auto-closed (TC ${id} changed to ${status})`);
        }
      }

      audit(`Test case ${id} edited — status ${oldStatus} → ${status}`);
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
    <div style="font-size:11px;color:var(--purple);font-family:var(--font);font-weight:600;letter-spacing:0.05em;margin-bottom:4px">ESCALATING: ${bugId}</div>
    <div style="font-size:14px;font-weight:500">${b.testCase}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">${b.module} · ${b.screen || '—'} · ${b.severity}</div>
  </div>
  <div style="padding:10px 14px;background:var(--purple-bg);border:1px solid var(--purple-border);border-radius:var(--radius);margin-bottom:16px;font-size:12px;color:var(--purple);">
    ⚠ Use only when the bug cannot be fixed from the frontend. The backend queue will be updated.
  </div>
  <div class="field">
    <label>Escalation Reason <span class="required">*</span></label>
    <textarea id="esc-reason" placeholder="Describe why this needs backend intervention (e.g. API error, database issue, server-side logic)..."></textarea>
  </div>
  <div class="field" style="margin-top:16px;">
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

        audit(`${bugId} escalated to backend`);
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
  <div class="field" style="margin-bottom:24px;">
    <label>Import To Module</label>
    <select id="imp-module" onchange="setImportModule(this.value)">${moduleOptions}</select>
    <div style="margin-top:8px;font-size:12px;color:var(--text3);line-height:1.5;">
      Used when a row has no <strong>Module Name</strong> column value. Uniqueness is enforced per module.
    </div>
  </div>
  
  <div style="margin-bottom:24px;text-align:center;">
    <div style="margin-bottom:12px;">
      <button class="attachment-pill" style="border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;" onclick="downloadImportTemplate()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Template</button>
    </div>
    <div style="font-size:12px;color:var(--text3);">
      Status accepted: <span style="color:var(--text);font-weight:500">Pass / Fail / Hold</span> &nbsp;&nbsp; 
      Severity accepted: <span style="color:var(--text);font-weight:500">High / Medium / Low</span>
    </div>
  </div>

  <div id="imp-dropzone"
       style="border:1px dashed var(--border);border-radius:8px;padding:48px 24px;text-align:center;cursor:pointer;transition:all .2s;"
       onclick="document.getElementById('imp-file').click()"
       ondragover="event.preventDefault();this.style.borderColor='var(--text)';this.style.background='rgba(59,130,246,.02)'"
       ondragleave="this.style.borderColor='var(--border)';this.style.background='transparent'"
       ondrop="handleImpDrop(event)">
    <input type="file" id="imp-file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none" onchange="handleImpFile(this)">
    <div style="margin-bottom:12px;color:var(--text3);">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
    </div>
    <div style="font-size:14px;color:var(--text);font-weight:500;margin-bottom:4px;">Click to upload or drag and drop</div>
    <div style="font-size:12px;color:var(--text3);">CSV UTF‑8 or Excel (.xlsx)</div>
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

      status.innerHTML = `
    <span style="color:var(--text);font-weight:500;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> "${filename}" parsed — ${rows.length} rows found</span>
    <span style="color:var(--text2);margin-left:12px">Default module: <strong>${_importTargetModule}</strong></span>
    ${skipCount ? `<span style="color:var(--yellow);margin-left:12px;font-weight:500;">⚠ ${skipCount} row(s) duplicate</span>` : ''}
  `;

      preview.innerHTML = `
    <div style="padding-top:16px;">
      <div style="display:flex;gap:24px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;">
        <div style="font-size:13px;"><span style="color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;font-size:11px;margin-right:6px;">Total rows</span><strong style="font-size:14px;color:var(--text)">${rows.length}</strong></div>
        <div style="font-size:13px;"><span style="color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;font-size:11px;margin-right:6px;">Will import</span><strong style="font-size:14px;color:var(--text)">${newRows.length}</strong></div>
        ${skipCount ? `<div style="font-size:13px;"><span style="color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;font-size:11px;margin-right:6px;">Will skip</span><strong style="font-size:14px;color:var(--yellow)">${skipCount}</strong></div>` : ''}
        <div style="font-size:13px;"><span style="color:var(--text3);text-transform:uppercase;letter-spacing:0.05em;font-size:11px;margin-right:6px;">Auto-bugs</span><strong style="font-size:14px;color:var(--text)">${newRows.filter(r => r.status === 'Fail' || r.status === 'Hold').length}</strong></div>
      </div>
      ${warnings.length ? `<div style="font-size:13px;color:var(--text);border-left:2px solid var(--yellow);padding-left:16px;margin-bottom:16px;line-height:1.6;">${warnings.slice(0, 3).join('<br>')}</div>` : ''}
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;">Preview (first 8 rows)</div>
      <div style="max-height:220px;overflow-y:auto;border:1px solid var(--border);border-radius:4px;background:transparent;">
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
      let added = 0, skipped = 0, bugs = 0, passed = 0;
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
        if (r.status === 'Pass') { passed++; }
        added++;

        // Send test case update to server
        socket.emit('updateData', { type: 'testCase', data: newTC });
      });

      // Send counter update to server
      socket.emit('updateData', { type: 'counters', data: { tcCounter: S.tcCounter, bugCounter: S.bugCounter } });

      audit(`Imported ${added} test cases from CSV (${skipped} duplicates skipped, ${bugs} bugs auto-created, ${passed} passed cases)`);
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
      ${!viewOnly ? `<button class="btn btn-ghost" onclick="modalSubmit()">Save</button>` : ''}
    </div>
  </div>`;
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
      document.body.appendChild(overlay);
      upgradeSelects(overlay);
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
  