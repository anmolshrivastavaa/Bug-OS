import sys
import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix layout of badges again, carefully targeting any variant.
target_layout_flex = '''<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="display:flex; align-items:center; gap:24px;">'''

replacement_layout_flex = '''<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
    <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">'''
if target_layout_flex in content:
    content = content.replace(target_layout_flex, replacement_layout_flex)

target_badges_container = '''<div style="display:flex; gap:10px;  align-items:center; flex-wrap:wrap;">'''
target_badges_container_2 = '''<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">'''
replacement_badges_container = '''<div style="display:flex; gap:10px; align-items:center; overflow-x:auto;">'''
content = content.replace(target_badges_container, replacement_badges_container)
content = content.replace(target_badges_container_2, replacement_badges_container)

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
    idx = content.find('function buildTestCases')
    if idx != -1:
        content = content[:idx] + func_def + content[idx:]

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed layout and added getLangSvg before buildTestCases!')
