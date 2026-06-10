import re

with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update autoStatusHtml to show the language SVG icon
target_auto_status_regex = r'const autoStatusHtml = hasScript\s*\?\s*`<div.*?><svg.*?>.*?<polyline points="20 6 9 17 4 12".*?</svg><button class="btn btn-ghost btn-sm" onclick="viewScriptModal.*?</div>`\s*:\s*`<svg.*?</svg>`;'

new_auto_status = '''const scriptObj = S.automationScripts.find(s => s.testCaseId == tc.id && s.module === tc.module);
        const hasScript = !!scriptObj;
        let iconSvg = '';
        if (hasScript && scriptObj.language) {
          iconSvg = getLangSvg(scriptObj.language).replace('width="16"', 'width="18"').replace('height="16"', 'height="18"');
        } else if (hasScript) {
          iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#10b981" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        
        const autoStatusHtml = hasScript
          ? `<div style="display:flex; gap:8px; align-items:center; justify-content:center;">${iconSvg}<button class="btn btn-ghost btn-sm" onclick="viewScriptModal(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))" title="View Script" style="padding:4px; height:24px; min-height:24px;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div>`
          : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#ef4444" stroke-width="2" fill="none" style="display:block; margin:0 auto;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;'''

content = re.sub(target_auto_status_regex, new_auto_status, content, flags=re.DOTALL)


# 2. Fix buildAutomationEditor()
# Remove oninput from textarea
content = content.replace('<textarea id="auto-script" class="code-editor" spellcheck="false" oninput="saveAutomationScript()" placeholder="Write your automation script here..."></textarea>',
                          '<textarea id="auto-script" class="code-editor" spellcheck="false" placeholder="Write your automation script here..."></textarea>')

# Add Save button next to Clear
old_buttons = '''<button class="btn btn-ghost btn-sm" onclick="document.getElementById('auto-script').value=''; saveAutomationScript()">Clear</button>
          <button class="btn btn-primary btn-sm" onclick="runAutomationScript()"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Script</button>'''

new_buttons = '''<button class="btn btn-ghost btn-sm" onclick="document.getElementById('auto-script').value=''">Clear</button>
          <button class="btn btn-ghost btn-sm" onclick="saveAutomationScript()"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save (Ctrl+S)</button>
          <button class="btn btn-primary btn-sm" onclick="runAutomationScript()"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Script</button>'''

content = content.replace(old_buttons, new_buttons)


# 3. Update loadAutomationScript() to fetch by language
old_load_func = '''    function loadAutomationScript() {
      const ta = document.getElementById('auto-script');
      const info = document.getElementById('auto-info');
      if (!ta || !info) return;

      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        ta.value = '';
        ta.disabled = true;
        info.innerHTML = '<span style="color:var(--text3);">Select a module and test case to view/edit script.</span>';
        document.getElementById('auto-language-select').disabled = true;
        return;
      }

      ta.disabled = false;
      document.getElementById('auto-language-select').disabled = false;
      const scriptObj = S.automationScripts.find(s => s.testCaseId == S.selectedAutomationTc && s.module === S.selectedAutomationModule);
      if (scriptObj) {
        ta.value = scriptObj.script;
        document.getElementById('auto-language-select').value = scriptObj.language || 'python';
        info.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Auto-saved locally`;
      } else {
        ta.value = '';
        info.innerHTML = `<span style="color:var(--text3);">No script saved yet.</span>`;
      }
    }'''

new_load_func = '''    function loadAutomationScript() {
      const ta = document.getElementById('auto-script');
      const info = document.getElementById('auto-info');
      const langSelect = document.getElementById('auto-language-select');
      if (!ta || !info) return;

      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        ta.value = '';
        ta.disabled = true;
        info.innerHTML = '<span style="color:var(--text3);">Select a module and test case to view/edit script.</span>';
        if (langSelect) langSelect.disabled = true;
        return;
      }

      ta.disabled = false;
      if (langSelect) langSelect.disabled = false;
      const selectedLang = langSelect ? langSelect.value : 'python';
      
      const scriptObj = S.automationScripts.find(s => s.testCaseId == S.selectedAutomationTc && s.module === S.selectedAutomationModule && s.language === selectedLang);
      if (scriptObj) {
        ta.value = scriptObj.script;
        info.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Saved locally`;
      } else {
        ta.value = '';
        info.innerHTML = `<span style="color:var(--text3);">No script saved for ${selectedLang} yet.</span>`;
      }
    }'''

content = content.replace(old_load_func, new_load_func)

# 4. Update saveAutomationScript to show 'Saved' message
content = content.replace("info.innerHTML = `<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" stroke=\"currentColor\" stroke-width=\"2\" fill=\"none\"><circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline></svg> Auto-saved locally`;",
                          "info.innerHTML = `<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" stroke=\"var(--green)\" stroke-width=\"2\" fill=\"none\"><path d=\"M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z\"></path><polyline points=\"17 21 17 13 7 13 7 21\"></polyline><polyline points=\"7 3 7 8 15 8\"></polyline></svg> <span style=\"color:var(--green);\">Saved successfully!</span>`; setTimeout(()=>loadAutomationScript(), 2000);")

# 5. Add Ctrl+S listener
ctrl_s_listener = '''
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const ta = document.getElementById('auto-script');
        if (ta && document.activeElement === ta) {
          e.preventDefault();
          saveAutomationScript();
        }
      }
    });
'''
if "if ((e.ctrlKey || e.metaKey) && e.key === 's')" not in content:
    content = content.replace('// INIT', '// INIT' + ctrl_s_listener)


with open('c:/Users/Anmol Shrivastava/Downloads/bugOS/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied patch_bugs.py!")
