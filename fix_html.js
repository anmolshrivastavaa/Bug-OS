const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/<\s+([a-zA-Z0-9]+)/g, (match, p1) => '<' + p1);
html = html.replace(/<\s*\/([a-zA-Z0-9]+)\s+>/g, (match, p1) => '</' + p1 + '>');
html = html.replace(/<([a-zA-Z0-9]+)\s+>/g, (match, p1) => '<' + p1 + '>');

fs.writeFileSync('index.html', html);
console.log('Fixed tags');
