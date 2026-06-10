import sys
import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

search_str = '''<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Automation Script - ${tcId}'''

replace_str = '''<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Automation Script - ${tcId}
                <span style="font-size:12px; font-weight:normal; margin-left:8px; display:inline-flex; align-items:center; gap:4px; padding:4px 8px; border-radius:12px; background:var(--bg3); color:var(--text2);">${getLangSvg(scriptObj.language)} ${scriptObj.language === 'python' ? 'Python' : scriptObj.language === 'javascript' ? 'JavaScript' : 'Java'}</span>'''

if search_str in content and replace_str not in content:
    content = content.replace(search_str, replace_str)
    with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Modal icon injected.')
else:
    print('Already injected or not found.')
