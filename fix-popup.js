const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

// Restore the sidebar by replacing the mangled nav with the full nav
let correctNav = `      \${navItem('escalations', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>\`, 'Backend Bugs', escalatedCount, 'var(--orange)')}
      \${navItem('automation', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>\`, 'Automation', 0)}
      \${navItem('modules', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>\`, 'Modules', 0)}
      \${navItem('audit', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>\`, 'Audit Log', 0)}
      \${navItem('report', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>\`, 'Reports', 0)}
      \${S.role === 'admin' ? navItem('users', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>\`, 'User Management', 0) : ''}
    </nav>
    <div class="sidebar-switch" style="padding:12px 8px; border-top:1px solid var(--border);">
      <div class="nav-item" onclick="logout()" style="color:var(--red);" onmouseover="this.style.background='var(--red-bg)'" onmouseout="this.style.background=''" title="Logout">
        <span class="nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red)"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span> <span class="nav-item-label">Logout</span>
      </div>   
    </div>
  </div>`;

// Replace the mangled section (everything from 'retest' navItem to <div class="main">)
f = f.replace(/\$\{navItem\('retest'[\s\S]*?<div class="main">/, 
  `\${navItem('retest', \`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>\`, 'Retest Queue', retestPending, 'var(--yellow)')}\n` + 
  correctNav + 
  `\n  <div class="main">`
);

// Now fix the buildUserRing popup properly.
const properRing = `function buildUserRing() {
      const initial = (S.auth && S.auth.user ? S.auth.user[0] : 'U').toUpperCase();
      const username = S.auth && S.auth.user ? S.auth.user : 'User';
      return \`<div style="position:relative; display:flex; align-items:center;">
        <div onclick="const p = document.getElementById('user-popup'); p.style.display = p.style.display === 'block' ? 'none' : 'block'" style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--accent), var(--purple)); color:#ffffff; border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; cursor:pointer; user-select:none; box-shadow:0 2px 8px rgba(0,0,0,0.1);">\${initial}</div>
        <div id="user-popup" style="display:none; position:absolute; top:48px; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:8px 0; box-shadow:0 8px 24px rgba(0,0,0,0.12); z-index:1000; min-width:180px;">
          <!-- CSS Triangle pointing up towards the ring -->
          <div style="position:absolute; top:-6px; right:12px; width:10px; height:10px; background:var(--bg2); border-left:1px solid var(--border); border-top:1px solid var(--border); transform:rotate(45deg);"></div>
          
          <div style="padding:8px 16px; border-bottom:1px solid var(--border); margin-bottom:4px;">
            <div style="font-weight:600; color:var(--text); font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">\${username}</div>
            <div style="font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px;">\${S.auth && S.auth.user === 'ADMIN' ? 'Administrator' : 'User'}</div>
          </div>
          
          \${S.auth && S.auth.user !== 'ADMIN' ? \`<div onclick="openChangePassword(); document.getElementById('user-popup').style.display='none'" style="padding:8px 16px; font-size:13px; color:var(--text2); cursor:pointer; display:flex; align-items:center; gap:8px; transition:background 0.2s;" onmouseover="this.style.background='var(--bg3)'; this.style.color='var(--text)'" onmouseout="this.style.background='transparent'; this.style.color='var(--text2)'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Change Password
          </div>\` : ''}
        </div>
      </div>\`;
    }`;

f = f.replace(/function buildUserRing\(\) \{[\s\S]*?\}\s*(?=function buildTopbar)/, properRing + '\n\n    ');

fs.writeFileSync('index.html', f);
console.log('Fixed everything safely.');
