import sys
import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the line:
content = re.sub(
    r"if \(\['dashboard', 'testcases'.*?return '';\s*",
    "",
    content,
    flags=re.DOTALL
)

# 2. Add 'users' action in buildTopbar()
actions_code = """      if (S.view === 'modules' && S.role === 'qa') {
        actions = `<button class="btn btn-ghost btn-sm" onclick="openAddModule()">+ Add Module</button>`;
      }"""
new_actions_code = actions_code + """
      if (S.view === 'users' && S.role === 'admin') {
        actions = `<button class="btn btn-ghost btn-sm" style="display:inline-flex; align-items:center; gap:6px;" onclick="openAddUser()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> Create User</button>`;
      }"""

content = content.replace(actions_code, new_actions_code)

# 3. Remove all duplicate headers.
header_pattern = re.compile(
    r'[ \t]*<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; gap:16px;">.*?buildUserRing\(\)\}\s*</div>\s*</div>\s*</div>\n*',
    re.DOTALL
)
content = header_pattern.sub('', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done patching.")
