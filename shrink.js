const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

f = f.replace(/border-radius:30px; padding:6px 14px;/g, 'border-radius:24px; padding:4px 8px;');
f = f.replace(/font-size:16px; font-weight:700; color:var\(--text\); padding:6px 16px; display:flex; align-items:center; gap:10px;/g, 'font-size:12px; font-weight:600; color:var(--text3); padding:4px 12px; display:flex; align-items:center; gap:6px;');
f = f.replace(/<svg viewBox="0 0 24 24" width="20" height="20"/g, '<svg viewBox="0 0 24 24" width="16" height="16"');
f = f.replace(/width:42px; height:42px;/g, 'width:32px; height:32px;');

fs.writeFileSync('index.html', f);
console.log("Done");
