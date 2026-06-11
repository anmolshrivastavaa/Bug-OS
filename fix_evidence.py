import re

def main():
    path = "index.html"
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Update CSV Templates
    content = content.replace(
        "'Test Case ID,Test Case,Scenario,Module Name,Screen Name,Test Step,Test Data,Expected Results,Actual Results,Status,Severity,Evidence,Notes'",
        "'Test Case ID,Test Case,Scenario,Module Name,Screen Name,Test Step,Test Data,Expected Results,Actual Results,Status,Severity,Evidence-1,Evidence-2,Notes'"
    )
    content = content.replace(
        "'TC-1,Verify login button,User enters valid credentials,DMS,Login Page,1. Go to login page2. Enter credentials3. Click login,valid@email.com / Pass@123,User should be logged in successfully,User logged in,Pass,Medium,,'",
        "'TC-1,Verify login button,User enters valid credentials,DMS,Login Page,1. Go to login page2. Enter credentials3. Click login,valid@email.com / Pass@123,User should be logged in successfully,User logged in,Pass,Medium,,,'"
    )
    
    content = content.replace(
        "'Test Case ID,Test Case,Scenario,Module,Screen Name,Test Steps,Expected Results,Actual Results,Status,Severity,Evidence,Notes,Created,Updated\\n'",
        "'Test Case ID,Test Case,Scenario,Module,Screen Name,Test Steps,Expected Results,Actual Results,Status,Severity,Evidence-1,Evidence-2,Notes,Created,Updated\\n'"
    )
    
    content = content.replace(
        "${tc.severity},${esc(tc.evidence)},${esc(tc.notes)},",
        "${tc.severity},${esc(tc.evidence)},${esc(tc.evidence2)},${esc(tc.notes)},"
    )

    # 2. Update Table Headers
    content = content.replace("<th>Evidence</th>", "<th>Evidence-1</th><th>Evidence-2</th>")
    
    # 3. Update Table Rows
    content = content.replace(
        "<td class=\"td-truncate\">${renderEvidenceCell(tc.evidence)}</td>",
        "<td class=\"td-truncate\">${renderEvidenceCell(tc.evidence)}</td><td class=\"td-truncate\">${renderEvidenceCell(tc.evidence2)}</td>"
    )
    content = content.replace(
        "<td class=\"td-truncate\">${renderEvidenceCell(linkedTc?.evidence)}</td>",
        "<td class=\"td-truncate\">${renderEvidenceCell(linkedTc?.evidence)}</td><td class=\"td-truncate\">${renderEvidenceCell(linkedTc?.evidence2)}</td>"
    )

    # 4. Update Detail Views
    content = content.replace(
        """<div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Evidence</div>
          <div><a href="${tc.evidence}" target="_blank" class="attachment-pill" style="display:inline-flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div>""",
        """<div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-1</div>
          <div><a href="${tc.evidence}" target="_blank" class="attachment-pill" style="display:inline-flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div>
          ${tc.evidence2 ? `<div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-top:8px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-2</div>
          <div><a href="${tc.evidence2}" target="_blank" class="attachment-pill" style="display:inline-flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div>` : ''}"""
    )
    content = content.replace(
        """<div class="detail-item" style="margin-bottom:12px;"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Evidence</div><div style="font-size:13px;color:var(--text2)">${renderEvidenceCell(linkedTc?.evidence)}</div></div>""",
        """<div class="detail-item" style="margin-bottom:12px;"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-1</div><div style="font-size:13px;color:var(--text2)">${renderEvidenceCell(linkedTc?.evidence)}</div></div>
        <div class="detail-item" style="margin-bottom:12px;"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-2</div><div style="font-size:13px;color:var(--text2)">${renderEvidenceCell(linkedTc?.evidence2)}</div></div>"""
    )

    # 5. Form Add Inputs
    content = content.replace(
        """<label>Evidence (URL/filename) <span class="required">*</span></label>
          <input id="f-evidence" placeholder="Paste evidence URL" oninput="onEvidenceTextChange('f-evidence','f-evidence-file','f-evidence-preview')">
          <div id="f-evidence-preview"></div>""",
        """<label>Evidence-1 (URL/filename) <span class="required">*</span></label>
          <input id="f-evidence" placeholder="Paste evidence URL" oninput="onEvidenceTextChange('f-evidence','f-evidence-file','f-evidence-preview')">
          <div id="f-evidence-preview"></div>
          <label style="margin-top:12px;">Evidence-2 (URL/filename)</label>
          <input id="f-evidence2" placeholder="Paste evidence 2 URL" oninput="onEvidenceTextChange('f-evidence2','f-evidence2-file','f-evidence2-preview')">
          <div id="f-evidence2-preview"></div>"""
    )
    
    # Update Form Save Logic (Add)
    content = content.replace(
        "const evidenceText = (document.getElementById('f-evidence') || { value: '' }).value.trim();",
        "const evidenceText = (document.getElementById('f-evidence') || { value: '' }).value.trim();\n      const evidence2Text = (document.getElementById('f-evidence2') || { value: '' }).value.trim();"
    )
    content = content.replace(
        "evidence: evidenceText,",
        "evidence: evidenceText,\n        evidence2: evidence2Text,"
    )

    # 6. Form Edit Inputs
    content = content.replace(
        "const evidenceInputValue = /^data:image\\//i.test(tc.evidence || '') ? '' : (tc.evidence || '');",
        "const evidenceInputValue = /^data:image\\//i.test(tc.evidence || '') ? '' : (tc.evidence || '');\n      const evidence2InputValue = /^data:image\\//i.test(tc.evidence2 || '') ? '' : (tc.evidence2 || '');"
    )
    content = content.replace(
        """<label>Evidence (URL/filename) <span class="required">*</span></label>
      <input id="e-evidence" value="${evidenceInputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence','e-evidence-file','e-evidence-preview')">
      <input id="e-evidence-file" type="hidden">
      <div id="e-evidence-preview"></div>""",
        """<label>Evidence-1 (URL/filename) <span class="required">*</span></label>
      <input id="e-evidence" value="${evidenceInputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence','e-evidence-file','e-evidence-preview')">
      <input id="e-evidence-file" type="hidden">
      <div id="e-evidence-preview"></div>
      
      <label style="margin-top:12px;">Evidence-2 (URL/filename)</label>
      <input id="e-evidence2" value="${evidence2InputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence2','e-evidence2-file','e-evidence2-preview')">
      <input id="e-evidence2-file" type="hidden">
      <div id="e-evidence2-preview"></div>"""
    )
    
    content = content.replace(
        """const eHidden = document.getElementById('e-evidence-file');
      if (eHidden && /^data:image\\//i.test(tc.evidence || '')) eHidden.value = tc.evidence;
      renderEvidencePreview('e-evidence-preview', tc.evidence || '');""",
        """const eHidden = document.getElementById('e-evidence-file');
      if (eHidden && /^data:image\\//i.test(tc.evidence || '')) eHidden.value = tc.evidence;
      renderEvidencePreview('e-evidence-preview', tc.evidence || '');
      
      const e2Hidden = document.getElementById('e-evidence2-file');
      if (e2Hidden && /^data:image\\//i.test(tc.evidence2 || '')) e2Hidden.value = tc.evidence2;
      renderEvidencePreview('e-evidence2-preview', tc.evidence2 || '');"""
    )
    
    # Update Form Save Logic (Edit)
    content = content.replace(
        "const evidenceText = (document.getElementById('e-evidence') || { value: '' }).value.trim();",
        "const evidenceText = (document.getElementById('e-evidence') || { value: '' }).value.trim();\n      const evidence2Text = (document.getElementById('e-evidence2') || { value: '' }).value.trim();"
    )
    content = content.replace(
        "tc.evidence = evidenceText;",
        "tc.evidence = evidenceText;\n      tc.evidence2 = evidence2Text;"
    )

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    main()
