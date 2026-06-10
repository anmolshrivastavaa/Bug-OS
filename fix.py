import sys
import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix layout of badges
target_layout = '''    <div style="display:flex; align-items:center; gap:24px;">
      <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>
      <div style="display:flex; gap:10px;  align-items:center; flex-wrap:wrap;">'''
replacement_layout = '''    <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
      <div style="font-size:28px;font-weight:700;color:var(--text); white-space:nowrap;">Automation</div>
      <div style="display:flex; gap:10px; align-items:center; overflow-x:auto;">'''

content = content.replace(target_layout, replacement_layout)

# Also fix another possible version of the layout if it got formatted differently
target_layout_2 = '''    <div style="display:flex; align-items:center; gap:24px;">
      <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">'''
content = content.replace(target_layout_2, replacement_layout)

# Add getLangSvg function back
python_match = re.search(r'<div class="tech-badge"[^>]*title="Python">.*?<svg[^>]*>(.*?)</svg>', content, re.DOTALL)
js_match = re.search(r'<div class="tech-badge"[^>]*title="JavaScript">.*?<svg[^>]*>(.*?)</svg>', content, re.DOTALL)
java_match = re.search(r'<div class="tech-badge"[^>]*title="Java">.*?<svg[^>]*>(.*?)</svg>', content, re.DOTALL)

python_svg = f'<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">{python_match.group(1)}</svg>' if python_match else ''
js_svg = f'<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">{js_match.group(1)}</svg>' if js_match else ''
java_svg = f'<svg style="width:14px; height:14px; margin-right:4px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">{java_match.group(1)}</svg>' if java_match else ''

func_def = '''    function getLangSvg(lang) {
      if (lang === 'python') return `''' + python_svg + '''`;
      if (lang === 'javascript') return `''' + js_svg + '''`;
      if (lang === 'java') return `''' + java_svg + '''`;
      return '';
    }
'''

if 'function getLangSvg' not in content:
    inject_marker = '    // ─────────────────────────── HELPERS ───────────────────────────\n'
    idx = content.find(inject_marker)
    if idx != -1:
        content = content[:idx+len(inject_marker)] + func_def + content[idx+len(inject_marker):]

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed layout and added getLangSvg back!')
