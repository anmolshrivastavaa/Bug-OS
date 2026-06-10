import sys
import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Revert Automation top header back to original
original_top_header = '''  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>
    <div style="display:flex; align-items:center; gap:16px;">'''

start_marker = '<span style="font-size:13px; font-weight:700; color:var(--text3); margin-right:4px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;">Supported Tech Stack:</span>'
end_marker = '</div>\n    </div>\n    <div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">'

start_idx = content.find(start_marker)
if start_idx != -1:
    end_idx = content.find(end_marker, start_idx)
    badges_html_block = content[start_idx:end_idx]
    
    header_start = content.rfind('<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;', 0, start_idx)
    content = content[:header_start] + original_top_header + content[end_idx + len(end_marker) - len('<div style="display:flex; align-items:center; gap:16px;">'):]

    # Revert styling on badges_html_block
    badges_html_block = badges_html_block.replace('margin-right:4px; text-transform:uppercase; letter-spacing:0.05em; white-space:nowrap;', 'margin-right:4px; text-transform:uppercase; letter-spacing:0.05em;')
    badges_html_block = badges_html_block.replace('font-size:13px;', 'font-size:12px;')
    badges_html_block = badges_html_block.replace('style="font-size:14px; padding:6px 12px; gap:8px;" ', '')
    badges_html_block = badges_html_block.replace('width:20px; height:20px;', 'width:16px; height:16px;')

    # Insert badges back under Test Case Automation
    test_case_automation_target = '<div class="section-title">Test Case Automation</div>\n      </div>\n    </div>\n    <div style="padding: 20px;">'
    
    if test_case_automation_target in content:
        original_test_case_automation = '''<div class="section-title">Test Case Automation</div>
      </div>
    </div>
    <div style="padding: 20px;">
      <div style="display:flex; gap:10px; margin-top:16px; margin-bottom: 8px; align-items:center; flex-wrap:wrap;">
        ''' + badges_html_block + '''
      </div>'''
        content = content.replace(test_case_automation_target, original_test_case_automation)

# 2. Revert autoStatusHtml in buildTestCases
bad_autoStatusHtml_part1 = '''const scriptObj = S.automationScripts.find(s => s.testCaseId == tc.id && s.module === tc.module);'''
bad_autoStatusHtml_part2 = '''        const hasScript = !!scriptObj;'''

original_autoStatusHtml = '''const hasScript = S.automationScripts.some(s => s.testCaseId == tc.id && s.module === tc.module);
        const autoStatusHtml = hasScript
          ? `<div style="display:flex; gap:8px; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="#10b981" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg><button class="btn btn-ghost btn-sm" onclick="viewScriptModal(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))" title="View Script" style="padding:4px; height:24px; min-height:24px;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div>`
          : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#ef4444" stroke-width="2" fill="none" style="display:block; margin:0 auto;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;'''

content = re.sub(r'const scriptObj = S\.automationScripts.*?const hasScript = !!scriptObj;.*?const autoStatusHtml = hasScript.*?</svg>`;', original_autoStatusHtml, content, flags=re.DOTALL)

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done reverting layout and status column!')
