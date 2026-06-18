import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add switchModulesTab, buildAddModuleTab, and submitInlineModule
functions_code = """
    function switchModulesTab(tabId) {
      S.modulesTab = tabId;
      render();
    }

    function buildAddModuleTab() {
      return `
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Add New Module</div>
    </div>
    <div style="padding: 24px;">
      <div class="field" style="max-width: 400px;">
        <label>Module Name <span class="required">*</span></label>
        <input id="f-inline-modname" placeholder="e.g. User Management, Payment, Reports">
      </div>
      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn btn-primary" onclick="submitInlineModule()">Add Module</button>
        <button class="btn btn-ghost" onclick="switchModulesTab('all')">Cancel</button>
      </div>
    </div>
  </div>`;
    }

    function submitInlineModule() {
      const name = document.getElementById('f-inline-modname').value.trim();
      if (!name) { toast('Module name required', 'error'); return; }
      if (S.modules.includes(name)) { toast('Module already exists', 'error'); return; }
      S.modules.push(name);
      audit(`Module "${name}" added`);
      socket.emit('updateData', { type: 'module', data: { name } });
      save();
      toast(`Module "${name}" added`, 'success');
      switchModulesTab('all');
    }

"""

# Insert right before function buildModules()
if "function switchModulesTab" not in content:
    content = content.replace("function buildModules() {", functions_code + "    function buildModules() {")

# 2. Add S.modulesTab and tabStyle to buildModules()
build_mod_start = """    function buildModules() {
      S.modulesTab = S.modulesTab || 'all';
      const tabStyle = (isActive) => isActive
        ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);`
        : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
"""
if "S.modulesTab = S.modulesTab || 'all';" not in content:
    content = content.replace("    function buildModules() {", build_mod_start, 1)

# 3. Modify the pills in header
old_pills = """    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
      <div style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        All Modules
      </div>
      ${(S.role === 'qa' || S.role === 'admin') ? `
      <div onclick="openAddModule()" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Module
      </div>
      ` : ''}
    </div>"""

new_pills = """    <div style="display:flex; align-items:center; gap:8px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
      <div onclick="switchModulesTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.modulesTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.modulesTab === 'all' ? '1' : '0.8'}'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
        All Modules
      </div>
      ${(S.role === 'qa' || S.role === 'admin') ? `
      <div onclick="switchModulesTab('add')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.modulesTab === 'add')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.modulesTab === 'add' ? '1' : '0.8'}'">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Module
      </div>
      ` : ''}
    </div>"""

content = content.replace(old_pills, new_pills)

# 4. Remove redundant Add Module button in header right
redundant_btn = """      ${S.role === 'qa' ? `<button class="btn btn-ghost" style="padding:6px 16px; font-size:12px; font-weight:600; border-radius:24px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onclick="openAddModule()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Module</button>` : ''}"""
content = content.replace(redundant_btn, "")

# 5. Return early for inline form if 'add' tab is active
old_return = "return header + (cards || `<div class=\"empty\"><div class=\"empty-icon\">"
new_return = """if (S.modulesTab === 'add') {
        return header + buildAddModuleTab();
      }
      return header + (cards || `<div class=\"empty\"><div class=\"empty-icon\">"""
if "buildAddModuleTab()" not in content:
    content = content.replace(old_return, new_return)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
