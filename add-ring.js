const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

// The pill starting tag
const pillStart = '<div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba(0,0,0,0.03); gap:6px;';

// Let's replace all occurrences of pillStart with the wrapper.
// Notice that some might have ` margin-left:16px;">` (in topbar) and some just `">` (in others).
f = f.replace(/<div style="display:flex; align-items:center; background:var\(--bg2\); border:1px solid var\(--border\); border-radius:24px; padding:4px 8px; box-shadow:0 2px 12px rgba\(0,0,0,0\.03\); gap:6px;[^>]*>/g, (match) => {
  return '<div style="display:flex; align-items:center; gap:12px;">\n        ' + match;
});

// Now we find the end of the pill. The pill always ends right after the toggleTheme button.
f = f.replace(/(<button class="theme-btn" onclick="toggleTheme\(\)"[\s\S]*?<\/button>\s*<\/div>)/g, (match) => {
  return match + '\n        ${buildUserRing()}\n      </div>';
});

// Add buildUserRing function to the global scope
const ringFunc = `
    function buildUserRing() {
      const initial = (S.auth && S.auth.user ? S.auth.user[0] : 'U').toUpperCase();
      const username = S.auth && S.auth.user ? S.auth.user : 'User';
      return \`<div style="position:relative; display:flex; align-items:center;">
        <div onclick="const p = document.getElementById('user-popup'); p.style.display = p.style.display === 'block' ? 'none' : 'block'" style="width:36px; height:36px; border-radius:50%; background:var(--blue); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; cursor:pointer; user-select:none; box-shadow:0 2px 8px rgba(0,0,0,0.1);">\${initial}</div>
        <div id="user-popup" style="display:none; position:absolute; top:46px; right:0; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:12px 16px; box-shadow:0 4px 16px rgba(0,0,0,0.15); z-index:1000; white-space:nowrap; font-weight:600; color:var(--text); font-size:14px;">
          \${username}
        </div>
      </div>\`;
    }
`;

if (!f.includes('function buildUserRing()')) {
  f = f.replace('function buildTopbar() {', ringFunc + '\n    function buildTopbar() {');
}

// Ensure clicking anywhere else closes the popup
if (!f.includes('user-popup')) {
  f = f.replace(/document\.addEventListener\('click', function \(e\) \{/, `document.addEventListener('click', function (e) {
      const p = document.getElementById('user-popup');
      if (p && p.style.display === 'block' && !e.target.closest('[onclick*="user-popup"]')) {
        p.style.display = 'none';
      }`);
}

fs.writeFileSync('index.html', f);
console.log('Fixed');
