import re
with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# find badges block
match = re.search(r'(<div style="display:flex; gap:10px; align-items:center; overflow-x:auto; padding-bottom:4px;">\s*<span style="font-size:13px; font-weight:700; color:var\(--text3\);.*?>Supported Tech Stack:</span>.*?</div>\s*</div>)', content, re.DOTALL)
if match:
    badges_block = match.group(1)
    
    # remove from top header
    content = content.replace(badges_block, '')
    
    # fix the top header layout
    content = re.sub(
        r'<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">\s*<div style="display:flex; align-items:center; gap:24px; flex:1; min-width:0;">\s*<div style="font-size:28px;font-weight:700;color:var\(--text\); flex-shrink:0;">Automation</div>',
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">\n    <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>',
        content
    )
    # fix right section flex-shrink
    content = content.replace('<div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">', '<div style="display:flex; align-items:center; gap:16px;">')

    # clean badges
    badges_block = re.sub(r'<div style="display:flex; gap:10px; align-items:center; overflow-x:auto; padding-bottom:4px;">', '<div style="display:flex; gap:10px; margin-top:16px; margin-bottom: 8px; align-items:center; flex-wrap:wrap;">', badges_block)
    badges_block = badges_block.replace('margin-right:4px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;', 'margin-right:4px; text-transform:uppercase; letter-spacing:0.05em;')
    badges_block = badges_block.replace('font-size:13px;', 'font-size:12px;')
    badges_block = badges_block.replace('style="font-size:14px; padding:6px 12px; gap:8px;" ', '')
    badges_block = badges_block.replace('width:20px; height:20px;', 'width:16px; height:16px;')
    badges_block = re.sub(r'</div>\s*$', '', badges_block) # remove extra closing div

    # insert back
    target = '<div class="section-title">Test Case Automation</div>\n      </div>\n    </div>\n    <div style="padding: 20px;">'
    if target in content:
        content = content.replace(target, '<div class="section-title">Test Case Automation</div>\n        ' + badges_block + '\n      </div>\n    </div>\n    <div style="padding: 20px;">')

    with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed missing badges!")
else:
    print("Could not find badges block")
