const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

// I will find the buildLogin function up to the end of login-screen
// and manually rewrite it.

const properLogin = `function buildLogin() {
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

      const flipClockHtml = \`
      <div id="login-flip-clock" style="position:absolute; bottom:60px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; gap:12px; z-index:10;">
        <div id="login-greeting" style="display:flex; align-items:center; gap:6px; font-size:16px; font-weight:700; color:var(--text); letter-spacing:0.5px;">
          \${greetIcon} <span>\${greeting}</span>
        </div>
        <div style="display:flex; gap:6px; align-items:center; justify-content:center;">
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-ampm" style="position:absolute; top:4px; left:4px; font-size:8px; font-weight:800; color:var(--text3); letter-spacing:0.05em; line-height:1; font-family:'Inter', var(--font);">\${ampm}</div>
            <div id="fc-hours" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">\${h}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
          <div style="font-size:20px; font-weight:900; color:var(--text3); padding-bottom:4px;">:</div>
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-mins" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">\${m}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
          <div style="font-size:20px; font-weight:900; color:var(--text3); padding-bottom:4px;">:</div>
          <div style="position:relative; width:44px; height:52px; background:var(--bg3); border-radius:6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); border:1px solid var(--border); overflow:hidden;">
            <div id="fc-secs" style="font-size:26px; font-weight:900; color:var(--text); line-height:1; font-family:'Inter', var(--font); letter-spacing:-1px; padding-top:1px;">\${s}</div>
            <div style="position:absolute; top:50%; left:0; width:100%; height:1px; background:var(--bg); transform:translateY(-50%); opacity:0.8;"></div>
          </div>
        </div>
      </div>\`;

      return \`
  <div class="login-screen" style="padding-bottom: 120px;">
    <div style="position: absolute; top: 24px; right: 24px; z-index: 10;">`;

f = f.replace(/function buildLogin\(\) \{[\s\S]*?<div class="login-screen"[^>]*>[\s\S]*?<div style="position: absolute; top: 24px; right: 24px; z-index: 10;">/, properLogin);

fs.writeFileSync('index.html', f);
console.log('Restored buildLogin successfully.');
