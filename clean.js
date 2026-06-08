const fs = require('fs');
let f = fs.readFileSync('index.html', 'utf8');

// First, clean up the literal '\n' characters that the user/editor injected
f = f.split('\\n').join('');

// Now, restore the CSS completely back to the stable, NO-ANIMATION version:
f = f.replace(/\.sidebar\.collapsed \.logo-text,[\s\S]*?\.sidebar\.collapsed \.nav-item \{\s*padding: 9px 17px;\s*\}/, `.sidebar.collapsed .logo-text,
    .sidebar.collapsed .nav-item-label,
    .sidebar.collapsed .nav-badge {
      display: none !important;
    }

    .sidebar.collapsed .sidebar-logo {
      justify-content: center;
      padding: 18px 0;
    }

    .sidebar.collapsed .hamburger-btn {
      margin-left: 0 !important;
    }

    .sidebar.collapsed .nav-item {
      justify-content: center;
      padding: 12px 0;
    }`);

// The user also requested "DONT WANT THAT TEXT BUGOS".
// So let's make sure .logo-text doesn't contain "BUG OS" but does contain the QA badge.
f = f.replace(/<div class="logo-name" style="font-size:20px; font-weight:800; color:var\(--text\); letter-spacing:-0.02em; margin-bottom:4px; line-height:1;">BUG OS<\/div>/, '');

fs.writeFileSync('index.html', f);
console.log('Fixed');
