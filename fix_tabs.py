import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def inject_tabs(view_name, tabs_code):
    global content
    
    # We find the 'return ' block that starts with <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    # and ends right before <div class="section"> inside the specific function
    
    pattern = r'(function build' + view_name + r'\(\).*?return \s*)<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">.*?</div>\s*</div>\s*(<div class="section">)'
    
    def repl(m):
        return m.group(1) + tabs_code + '\n  ' + m.group(2)
        
    content = re.sub(pattern, repl, content, flags=re.DOTALL)

bug_tabs = """
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>
      All Bug Reports
    </div>
  </div>"""

esc_tabs = """
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
      All Backend Bugs
    </div>
  </div>"""

ret_tabs = """
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      All Retest Queue
    </div>
  </div>"""

mod_tabs = """
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
      All Modules
    </div>
    
  </div>"""

inject_tabs('Bugs', bug_tabs)
inject_tabs('Escalations', esc_tabs)
inject_tabs('Retest', ret_tabs)
inject_tabs('Modules', mod_tabs)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
