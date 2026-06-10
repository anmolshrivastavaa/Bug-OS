import sys
import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix top-level header:
content = re.sub(
    r'<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;.*?>',
    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap:16px;">',
    content,
    count=1
)

# Fix left section:
content = re.sub(
    r'<div style="display:flex; align-items:center; gap:24px;.*?>',
    '<div style="display:flex; align-items:center; gap:24px; flex:1; min-width:0;">',
    content,
    count=1
)

# Fix Automation title:
content = re.sub(
    r'<div style="font-size:28px;font-weight:700;color:var\(--text\).*?>Automation</div>',
    '<div style="font-size:28px;font-weight:700;color:var(--text); flex-shrink:0;">Automation</div>',
    content,
    count=1
)

# Fix Right section (Clock + Avatar):
content = content.replace(
    '<div style="display:flex; align-items:center; gap:16px;">',
    '<div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">',
    1
)

# Fix SUPPORTED TECH STACK:
content = re.sub(
    r'<span style="font-size:13px; font-weight:700; color:var\(--text3\); margin-right:4px; text-transform:uppercase; letter-spacing:0.05em;.*?">Supported Tech Stack:</span>',
    '<span style="font-size:13px; font-weight:700; color:var(--text3); margin-right:4px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;">Supported Tech Stack:</span>',
    content
)

# Fix test cases table pill word-wrapping!
content = content.replace(
    'padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600; color:var(--text2);">',
    'padding:4px 8px; border-radius:12px; font-size:12px; font-weight:600; color:var(--text2); white-space:nowrap;">'
)

# Fix badges container to pad bottom for scrollbar and hide overflow neatly
content = content.replace(
    '<div style="display:flex; gap:10px; align-items:center; overflow-x:auto;">',
    '<div style="display:flex; gap:10px; align-items:center; overflow-x:auto; padding-bottom:4px;">'
)

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
