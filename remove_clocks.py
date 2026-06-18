import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We look for the block containing live-clock up to buildUserRing()} and the two closing </div>
# The block usually starts with a <div that contains background:var(--bg2); border:1px solid var(--border); border-radius:24px;
# But actually it is enclosed in <div style="display:flex; align-items:center; gap:12px;"> or similar.
# Let's use a regex to match from `<div style="display:flex; align-items:center; gap:12px;">` 
# that contains `id="live-clock"` up to `buildUserRing()}` and `</div></div>`

# First let's just find and remove the block:
# <div style="display:flex; align-items:center; background:var(--bg2); border:1px solid var(--border); border-radius:24px; ... 
# ...
# ${buildUserRing()}
# </div>

pattern = re.compile(r'<div style="display:flex; align-items:center; gap:12px;?">\s*<div style="display:flex; align-items:center; background:var\(--bg2\);.*?buildUserRing\(\)\}\s*</div>', re.DOTALL)

new_content = pattern.sub('', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Removed duplicate clocks/rings. Size changed from {len(content)} to {len(new_content)}")
