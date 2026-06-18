import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def prepend_title(pattern_str, title_text):
    global content
    
    # Prepend the title div before the matched string
    replacement = f'''  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">{title_text}</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>\n''' + pattern_str

    content = content.replace(pattern_str, replacement)


# Escalations
prepend_title('  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">\n    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">\n      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>\n      All Backend Bugs', 'Backend Escalations')

# Bugs
prepend_title('  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">\n    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">\n      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="14" x="8" y="6" rx="4"/><path d="m19 7-3 2"/><path d="m5 7 3 2"/><path d="m19 19-3-2"/><path d="m5 19 3-2"/><path d="M20 13h-4"/><path d="M4 13h4"/><path d="m10 4 1 2"/><path d="m14 4-1 2"/></svg>\n      All Bug Reports', 'Bug Reports')

# Retest
prepend_title('  <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">\n    <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">\n      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>\n      All Retest Queue', 'Retest Queue')

# Modules is a bit tricky, the structure is slightly different now. Let's just do it individually.
def fix_modules():
    global content
    old_mod = '''  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">'''
    new_mod = '''  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Modules</div>
    <div style="display:flex; align-items:center; gap:16px;">
    </div>
  </div>
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">'''
    content = content.replace(old_mod, new_mod)

fix_modules()

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
