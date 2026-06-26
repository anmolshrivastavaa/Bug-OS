import { socket, doImport } from './api.js';
import { normalizeTcRowId, normalizeTcModule, formatDate, now, toast, openConfirm, statusBadge, sevBadge, showBannedModal, showModal, closeModal, viewScriptModal } from './utils.js';
import { S } from './state.js';
import { save, textMatchesQuery, liveFilter, render, handleImpDrop, handleImpFile } from './app.js';
import { audit } from './auth.js';
import { onAutoLangChange, updateAutoTcId } from './automation.js';
import { renderEvidenceCell, renderEvidencePreview, onEvidenceTextChange } from './screenshots.js';
import { autoCreateBug, viewBug } from './bugs.js';

export function testcaseKeysMatch(tc, data) {
  return normalizeTcRowId(tc.id) === normalizeTcRowId(data.id) && normalizeTcModule(tc.module) === normalizeTcModule(data.module);
}
export function bugRefsTestCaseKeys(bug, tcId, module) {
  return normalizeTcRowId(bug.tcId) === normalizeTcRowId(tcId) && normalizeTcModule(bug.module) === normalizeTcModule(module);
}
export
  // ─────────────────────────── TEST CASES ───────────────────────────
  function switchTestCasesTab(tabId) {
  S.testCasesTab = tabId;
  render();
}
export function buildTestCases() {
  S.testCasesTab = S.testCasesTab || 'all';
  const tabStyle = isActive => isActive ? `background:var(--text); color:var(--bg); border-color:var(--text); cursor:default; box-shadow:0 2px 8px rgba(0,0,0,0.1);` : `background:transparent; color:var(--text2); border-color:transparent; cursor:pointer; opacity:0.8; transition:all 0.2s;`;
  const tabsHtml = `
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:24px; padding:4px; background:var(--bg2); border-radius:30px; display:inline-flex; border:1px solid var(--border);">
          <div onclick="switchTestCasesTab('all')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.testCasesTab === 'all')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.testCasesTab === 'all' ? '1' : '0.8'}'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            All Test Cases
          </div>
          ${['qa', 'dev', 'admin'].includes(S.role) ? `
          <div onclick="switchTestCasesTab('add')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.testCasesTab === 'add')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.testCasesTab === 'add' ? '1' : '0.8'}'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Test Case
          </div>
          <div onclick="switchTestCasesTab('import')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.testCasesTab === 'import')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.testCasesTab === 'import' ? '1' : '0.8'}'">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Import Test Cases
          </div>
          ` : ''}
          <div onclick="switchTestCasesTab('capture')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.testCasesTab === 'capture')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.testCasesTab === 'capture' ? '1' : '0.8'}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            BugOS Capture
          </div>
          <div onclick="switchTestCasesTab('excel')" style="padding:8px 20px; font-size:13px; font-weight:600; border-radius:24px; border:1px solid; display:inline-flex; align-items:center; gap:6px; ${tabStyle(S.testCasesTab === 'excel')}" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${S.testCasesTab === 'excel' ? '1' : '0.8'}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            BugOS Excel
          </div>
        </div>
      `;
  let contentHtml = '';
  if (S.testCasesTab === 'add' && ['qa', 'dev', 'admin'].includes(S.role)) {
    contentHtml = buildAddTestCaseTab();
  } else if (S.testCasesTab === 'import' && ['qa', 'dev', 'admin'].includes(S.role)) {
    contentHtml = buildImportTestCaseTab();
  } else if (S.testCasesTab === 'capture') {
    contentHtml = buildCaptureInfoTab();
  } else if (S.testCasesTab === 'excel') {
    contentHtml = buildExcelTab();
  } else {
    contentHtml = buildAllTestCasesTab();
  }
  return `
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Test Cases</div>
    <div style="display:flex; align-items:center; gap:16px;">
      
    </div>
  </div>
  ${tabsHtml}
  ${contentHtml}
  `;
}
export function buildAllTestCasesTab() {
  const modF = (document.getElementById('tcModF') || {
    value: ''
  }).value;
  const stF = (document.getElementById('tcStF') || {
    value: ''
  }).value;
  const sevF = (document.getElementById('tcSevF') || {
    value: ''
  }).value;
  const tcQ = (document.getElementById('tcQ') || {
    value: ''
  }).value.toLowerCase();
  const dlMod = (document.getElementById('tcDlMod') || {
    value: ''
  }).value;
  const dlSt = (document.getElementById('tcDlSt') || {
    value: ''
  }).value;
  let data = [...S.testCases];
  if (modF) data = data.filter(t => t.module === modF);
  if (stF) data = data.filter(t => t.status === stF);
  if (sevF) data = data.filter(t => t.severity === sevF);
  if (tcQ) {
    data = data.filter(t => [t.id, t.testCase, t.scenario, t.module, t.screen, t.steps, t.testData, t.expected, t.actual, t.status, t.severity, t.evidence, t.notes].some(v => textMatchesQuery(v, tcQ)));
  }
  const modOpts = S.modules.map(m => `<option${modF === m ? ' selected' : ''}>${m}</option>`).join('');
  const dlModOpts = S.modules.map(m => `<option value="${m}"${dlMod === m ? ' selected' : ''}>${m}</option>`).join('');
  const rows = data.map(tc => {
    const isQA = S.role === 'qa';
    const canModify = S.role === 'qa' && tc.createdBy === S.auth.user;
    const idArg = encodeURIComponent(tc.id || '');
    const modArg = encodeURIComponent(tc.module || '');
    const hasScript = S.automationScripts.some(s => s.testCaseId == tc.id && s.module === tc.module);
    let iconSvg = '';
    if (hasScript) {
      iconSvg = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#10b981" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    }
    const autoStatusHtml = hasScript ? `<div style="display:flex; gap:8px; align-items:center; justify-content:center;">${iconSvg}<button class="btn btn-ghost btn-sm" onclick="viewScriptModal(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))" title="View Script" style="padding:4px; height:24px; min-height:24px;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></button></div>` : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="#ef4444" stroke-width="2" fill="none" style="display:block; margin:0 auto;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    return `<tr>
      <td class="td-id">${tc.id}</td>
      <td class="td-title">${tc.testCase}</td>
      <td class="td-truncate">${tc.scenario || ''}</td>
      <td>${tc.module}</td>
      <td>${tc.screen || '—'}</td>
      <td class="td-truncate">${tc.steps || ''}</td>
      <td class="td-truncate">${tc.testData || ''}</td>
      <td class="td-truncate">${tc.expected || ''}</td>
      <td class="td-truncate">${tc.actual || ''}</td>
      <td>${statusBadge(tc.status)}</td>
      <td>${sevBadge(tc.severity)}</td>
      <td class="td-truncate">${renderEvidenceCell(tc.evidence, tc, 'evidence')}</td><td class="td-truncate">${renderEvidenceCell(tc.evidence2, tc, 'evidence2')}</td>
      <td class="td-truncate">${tc.notes || '—'}</td>
      <td style="text-align:center;">${autoStatusHtml}</td>
      <td style="white-space:nowrap;">
        <div style="display:flex; gap:6px; align-items:center; justify-content:flex-end; min-width:max-content;">
          <button class="btn btn-ghost btn-sm" onclick="viewTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">View</button>
          ${canModify ? `<button class="btn btn-ghost btn-sm" style="color:var(--yellow);border-color:var(--yellow-border);" onclick="openEditTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">Edit</button>` : ''}
          ${canModify ? `<button class="btn btn-danger btn-sm" onclick="deleteTC(decodeURIComponent('${idArg}'), decodeURIComponent('${modArg}'))">Delete</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');
  return `
  <div class="section">
    <div class="section-hdr">
      <div style="display:flex; align-items:center; gap:10px;"><div class="section-title">All Test Cases</div><div class="section-meta">${data.length} Shown · ${S.testCases.length} Total</div></div>
      <div class="filters">
        <select class="filter-select${modF ? ' filter-active' : ''}" id="tcModF" onchange="render()">
          <option value="">All Modules</option>${modOpts}
        </select>
        <select class="filter-select${stF ? ' filter-active' : ''}" id="tcStF" onchange="render()">
          <option value="">All Status</option>
          <option${stF === 'Pass' ? ' selected' : ''}>Pass</option>
          <option${stF === 'Fail' ? ' selected' : ''}>Fail</option>
          <option${stF === 'Hold' ? ' selected' : ''}>Hold</option>
        </select>
        <select class="filter-select${sevF ? ' filter-active' : ''}" id="tcSevF" onchange="render()">
          <option value="">All Severity</option>
          <option${sevF === 'High' ? ' selected' : ''}>High</option>
          <option${sevF === 'Medium' ? ' selected' : ''}>Medium</option>
          <option${sevF === 'Low' ? ' selected' : ''}>Low</option>
        </select>
        <div style="position:relative; width:220px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text3); pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input class="filter-select${tcQ ? ' filter-active' : ''}" id="tcQ" style="width:100%; padding-left:36px; border-radius:24px;" placeholder="Search test cases..." value="${tcQ.replace(/"/g, '&quot;')}" oninput="liveFilter(this)">
        </div>
      </div>
    </div>
    <div style="padding:8px 24px; background:rgba(0,0,0,0.005); border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:flex-start; gap:8px; flex-wrap:wrap;">
      <button onclick="downloadTestCasesCSV()" class="btn btn-ghost" style="padding:4px 12px; font-size:11px; font-weight:600; border-radius:12px; display:inline-flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:0.06em; margin-right:8px; cursor:pointer;"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> EXPORT CSV</button>
      <select class="filter-select" id="tcDlMod" onchange="render()" style="background:transparent; border:1px dashed var(--btn-border); height:26px; padding:0 24px 0 8px;">
        <option value="">All Modules</option>${dlModOpts}
      </select>
      <select class="filter-select" id="tcDlSt" onchange="render()" style="background:transparent; border:1px dashed var(--btn-border); height:26px; padding:0 24px 0 8px;">
        <option value="">All Status</option>
        <option${dlSt === 'Pass' ? ' selected' : ''}>Pass</option>
        <option${dlSt === 'Fail' ? ' selected' : ''}>Fail</option>
        <option${dlSt === 'Hold' ? ' selected' : ''}>Hold</option>
      </select>
    </div>
    <div class="tbl-wrap scrollable"><table>
      <thead><tr><th>ID</th><th>Test Case</th><th>Scenario</th><th>Module</th><th>Screen</th><th>Test Steps</th><th>Test Data</th><th>Expected</th><th>Actual</th><th>Status</th><th>Severity</th><th>Evidence-1</th><th>Evidence-2</th><th>Notes</th><th>Automation Status</th><th>Actions</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="15" class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15l2 2 4-4"></path></svg></div>No test cases matches filters</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

export function buildCaptureInfoTab() {
  return `
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">BugOS Capture Extension</div>
    </div>
    <div style="padding: 32px; max-width: 800px; line-height: 1.6;">
      <h2 style="margin-top:0;">How to Install & Use BugOS Capture</h2>
      <p>BugOS Capture is a Chrome Extension that helps you quickly capture screenshots, annotate them, and directly attach them to test cases as evidence.</p>
      
      <div style="margin: 24px 0; padding: 24px; background: var(--bg2); border: 1px solid var(--border); border-radius: 12px;">
        <h3 style="margin-top:0;">1. Download the Extension</h3>
        <p>Download the zipped extension files here:</p>
        <a href="/extension.zip" download class="btn primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; margin-top:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download BugOS Capture.zip
        </a>
      </div>

      <div style="margin: 24px 0;">
        <h3>2. Install in Chrome</h3>
        <ol style="padding-left: 20px;">
          <li style="margin-bottom:24px;">Unzip the downloaded <strong>extension.zip</strong> folder to a location on your computer.<br><img src="assets/1.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
          <li style="margin-bottom:24px;">Open Google Chrome and navigate to <code style="background:var(--bg3); padding:2px 6px; border-radius:4px;">chrome://extensions/</code><br><img src="assets/2.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
          <li style="margin-bottom:24px;">Turn on <strong>Developer mode</strong> using the toggle switch in the top right corner.<br><img src="assets/3.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
          <li style="margin-bottom:24px;">Click the <strong>Load unpacked</strong> button that appears in the top left.<br><img src="assets/4.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
          <li style="margin-bottom:24px;">Select the unzipped <code>extension</code> folder you extracted in step 1.<br><img src="assets/5.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
          <li style="margin-bottom:24px;">The BugOS Capture extension will now appear in your extensions list! Pin it to your toolbar for easy access.<br><img src="assets/6.png" style="width:100%; border-radius:8px; margin-top:8px; border:1px solid var(--border); box-shadow:0 4px 12px rgba(0,0,0,0.05); display:block;"></li>
        </ol>
      </div>

      <div style="margin: 24px 0;">
        <h3>3. How to Use</h3>
        <ul style="padding-left: 20px;">
          <li style="margin-bottom:12px;"><strong>Normal Mode:</strong> Click the extension icon in your toolbar, log in, and select a module and test case. Click "Capture Screen" to take a screenshot of your current tab, then attach or annotate it.</li>
          <li style="margin-bottom:12px;"><strong>Auto-Fill Mode:</strong> When creating or editing a test case in BugOS, click the "Capture" button next to an evidence field. Then open the extension—it will automatically enter Draft Mode and fill the field with your captured screenshot!</li>
        </ul>
      </div>
    </div>
  </div>`;
}

export function buildExcelTab() {
  return `
  <style>
    /* Fix for Jspreadsheet auto-fill handle floating due to global body zoom: 0.9 */
    #spreadsheet-container {
      zoom: 1.11111111;
    }
    .jexcel_container * {
      box-sizing: content-box !important;
    }
    .jexcel_corner {
      box-sizing: content-box !important;
    }
  </style>
  <div class="section" style="display: flex; flex-direction: column; height: 800px; padding: 0;">
    <div class="section-hdr" style="padding: 16px 24px; flex-shrink: 0; display: flex; justify-content: space-between; align-items: center;">
      <div class="section-title">BugOS Excel</div>
      <button class="btn btn-ghost" onclick="saveExcelData()">Save to System</button>
    </div>
    <div id="spreadsheet-container" style="flex: 1; width: 100%; border-top: 1px solid var(--border); overflow: hidden;"></div>
  </div>`;
}

export function saveExcelData() {
  if (S.role !== 'qa' && S.role !== 'admin') {
    toast('You do not have permission to save test cases.', 'error');
    return;
  }
  if (!window.spreadsheetInstance) return;

  const data = window.spreadsheetInstance.getData();
  const validRows = [];
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    // ID: row[0], TestCase: row[1], Scenario: row[2], Module: row[3], Screen: row[4], Steps: row[5], TestData: row[6], Expected: row[7], Actual: row[8], Status: row[9], Severity: row[10], Ev1: row[11], Ev2: row[12], Notes: row[13]
    const id = normalizeTcRowId(row[0]);
    const moduleStr = normalizeTcModule(row[3]);
    const tcTitle = String(row[1] || '').trim();
    const scenario = String(row[2] || '').trim();
    const screen = String(row[4] || '').trim();
    const steps = String(row[5] || '').trim();
    const expected = String(row[7] || '').trim();
    const actual = String(row[8] || '').trim();
    const status = String(row[9] || '').trim();
    const severity = String(row[10] || '').trim();
    const ev1 = String(row[11] || '').trim();

    if (!id && !moduleStr && !tcTitle) continue; // Skip entirely empty rows

    const missingFields = [];
    if (!id) missingFields.push('ID');
    if (!tcTitle) missingFields.push('Test Case');
    if (!scenario) missingFields.push('Scenario');
    if (!moduleStr) missingFields.push('Module');
    if (!screen) missingFields.push('Screen');
    if (!steps) missingFields.push('Test Steps');
    if (!expected) missingFields.push('Expected');
    if (!actual) missingFields.push('Actual');
    if (!status) missingFields.push('Status');
    if (!severity) missingFields.push('Severity');
    if (!ev1) missingFields.push('Evidence-1');

    if (missingFields.length > 0) {
      errors.push(`Row ${i + 1}: Missing mandatory fields: ${missingFields.join(', ')}.`);
      continue;
    }

    if (S.testCases.find(t => testcaseKeysMatch(t, { id, module: moduleStr }))) {
      errors.push(`Row ${i + 1}: Test Case ID "${id}" already exists in module "${moduleStr}".`);
      continue;
    }

    validRows.push({
      id,
      testCase: tcTitle,
      scenario,
      module: moduleStr,
      screen,
      steps,
      testData: String(row[6] || '').trim(),
      expected,
      actual,
      status: status.toLowerCase(),
      severity: severity.toLowerCase(),
      evidence: ev1,
      evidence2: String(row[12] || '').trim(),
      notes: String(row[13] || '').trim(),
      createdAt: now(),
      createdBy: S.auth.user,
      updatedAt: now(),
      history: []
    });
  }

  if (errors.length > 0) {
    toast(`Cannot save. ${errors.length} errors found: ${errors[0]}`, 'error');
    return;
  }

  if (validRows.length === 0) {
    toast('No valid data found to save.', 'error');
    return;
  }

  // Save all valid rows
  validRows.forEach(tc => {
    S.testCases.push(tc);
    S.tcCounter++;
    audit(`${tc.id} added from BugOS Excel to module ${tc.module} with status ${tc.status}`);

    socket.emit('updateData', {
      type: 'testCase',
      data: tc
    });

    if (tc.status === 'fail' || tc.status === 'hold') {
      autoCreateBug(tc);
    }
  });

  socket.emit('updateData', {
    type: 'counters',
    data: {
      tcCounter: S.tcCounter,
      bugCounter: S.bugCounter
    }
  });

  save();
  toast(`Successfully saved ${validRows.length} test cases to the system!`, 'success');

  // Clear excel grid and local draft
  const emptyData = Array(100).fill().map(() => Array(14).fill(''));
  window.spreadsheetInstance.setData(emptyData);
  const u = S.users.find(x => x.username === (S.auth?.user || 'guest'));
  if (u) {
    u.excelDraft = '';
    socket.emit('updateData', { type: 'user', data: u });
  }
}

export function initJspreadsheet() {
  const container = document.getElementById('spreadsheet-container');
  if (!container) return;

  // Bypass native window.confirm for Jspreadsheet deletions
  if (!window.originalConfirm) {
    window.originalConfirm = window.confirm;
    window.confirm = function (msg) {
      if (msg && msg.toLowerCase().includes("delete")) {
        return true; // Auto-confirm to prevent ugly native prompts
      }
      return window.originalConfirm(msg);
    };
  }

  try {
    if (window.spreadsheetInstance) {
      window.spreadsheetInstance.destroy();
      window.spreadsheetInstance = null;
    }

    let draftData = null;
    try {
      const u = S.users.find(x => x.username === (S.auth?.user || 'guest'));
      if (u && u.excelDraft) {
        draftData = JSON.parse(u.excelDraft);
      }
    } catch (e) {
      console.warn("Failed to load excel draft", e);
    }

    const initialData = draftData || Array(100).fill().map(() => Array(14).fill(''));

    let draftTimeout;
    const saveDraft = () => {
      if (window.spreadsheetInstance) {
        clearTimeout(draftTimeout);
        draftTimeout = setTimeout(() => {
          const u = S.users.find(x => x.username === (S.auth?.user || 'guest'));
          if (u) {
            u.excelDraft = JSON.stringify(window.spreadsheetInstance.getData());
            socket.emit('updateData', { type: 'user', data: u });
          }
        }, 500); // Debounce to prevent lag when editing fast
      }
    };

    // Initialize the spreadsheet
    window.spreadsheetInstance = window.jspreadsheet(container, {
      about: false,
      data: initialData, // Use draft data or empty rows
      columns: [
        { type: 'text', title: 'ID', width: 80 },
        { type: 'text', title: 'Test Case', width: 200, wordWrap: true },
        { type: 'text', title: 'Scenario', width: 150, wordWrap: true },
        { type: 'dropdown', title: 'Module', width: 100, source: S.modules.length ? S.modules : ['No modules available'] },
        { type: 'text', title: 'Screen', width: 100, wordWrap: true },
        { type: 'text', title: 'Test Steps', width: 250, wordWrap: true },
        { type: 'text', title: 'Test Data', width: 150, wordWrap: true },
        { type: 'text', title: 'Expected', width: 200, wordWrap: true },
        { type: 'text', title: 'Actual', width: 200, wordWrap: true },
        { type: 'dropdown', title: 'Status', width: 100, source: ['pass', 'fail', 'hold'] },
        { type: 'dropdown', title: 'Severity', width: 100, source: ['high', 'medium', 'low'] },
        { type: 'text', title: 'Evidence-1', width: 150, wordWrap: true },
        { type: 'text', title: 'Evidence-2', width: 150, wordWrap: true },
        { type: 'text', title: 'Notes', width: 200, wordWrap: true },
      ],
      minDimensions: [14, 100],
      tableOverflow: true,
      tableWidth: "100%",
      tableHeight: "100%",
      defaultColWidth: 100,
      allowInsertRow: true,
      allowManualInsertRow: true,
      allowInsertColumn: false,
      allowManualInsertColumn: false,
      allowDeleteColumn: false,
      allowRenameColumn: false,
      onchange: saveDraft,
      oninsertrow: saveDraft,
      ondeleterow: saveDraft,
      onundo: saveDraft,
      onredo: saveDraft,
      updateTable: function(instance, cell, col, row, val, label, cellName) {
        if (col === 11 || col === 12) {
          cell.style.position = 'relative';
          // Ensure button is appended after jspreadsheet renders text
          setTimeout(() => {
            let btn = cell.querySelector('.excel-capture-btn');
            if (!btn) {
              btn = document.createElement('button');
              btn.className = 'excel-capture-btn btn btn-ghost btn-sm';
              btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
              btn.style.position = 'absolute';
              btn.style.right = '2px';
              btn.style.top = '50%';
              btn.style.transform = 'translateY(-50%)';
              btn.style.padding = '2px 4px';
              btn.style.zIndex = '10';
              btn.style.background = 'var(--bg)';
              btn.style.border = '1px dashed var(--border)';
              btn.title = 'Capture Evidence';
              btn.onmousedown = function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.excelActiveCell = { row, col };
                window.requestExtensionCapture('excel-capture-target');
              };
              cell.appendChild(btn);
            }
          }, 0);
        }
      }
    });
  } catch (err) {
    container.innerHTML = `<div style="color:red; padding: 24px; font-family: monospace;"><b>Failed to initialize BugOS Excel:</b><br><br>${err.message}<br><br>${err.stack}</div>`;
  }
}

export function destroyJspreadsheet() {
  if (window.spreadsheetInstance) {
    try { window.spreadsheetInstance.destroy(); } catch (e) { }
    window.spreadsheetInstance = null;
  }
}

// ─────────────────────────── BUGS ───────────────────────────
export function updateTestCaseOptions() {
  const moduleSelect = document.getElementById('auto-module-select');
  S.selectedAutomationModule = moduleSelect.value;
  S.selectedAutomationTc = ''; // Reset test case selection
  S.automationOutput = '';
  S.automationVideo = '';
  S.currentUnsavedScript = '';

  // Destroy CodeMirror so render() doesn't overwrite S.currentUnsavedScript with the old script
  if (window.cmEditor) {
    window.cmEditor.destroy();
    window.cmEditor = null;
  }
  render();
}
export function loadTestCaseScript() {
  const tcSelect = document.getElementById('auto-tc-select');
  S.selectedAutomationTc = tcSelect.value;
  S.automationOutput = '';
  S.automationVideo = '';
  const scriptArea = document.getElementById('auto-script');
  const langSelect = document.getElementById('auto-language-select');
  const previewArea = document.getElementById('auto-tc-preview');
  if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
    if (scriptArea) scriptArea.value = '';
    S.currentUnsavedScript = '';
    if (window.cmEditor) {
      window.cmEditor.dispatch({
        changes: {
          from: 0,
          to: window.cmEditor.state.doc.length,
          insert: ''
        }
      });
    }
    if (langSelect) {
      langSelect.value = S.selectedAutomationLanguage || 'python';
      langSelect.dispatchEvent(new Event('custom-update'));
      onAutoLangChange();
    }
    if (previewArea) previewArea.innerHTML = '';
    return;
  }
  const tc = S.testCases.find(t => String(t.id) === String(S.selectedAutomationTc) && t.module === S.selectedAutomationModule);
  if (tc && previewArea) {
    previewArea.innerHTML = `
          <div class="tbl-wrap scrollable" style="margin-top: 20px; margin-bottom: 20px;" > <table>
            <thead><tr><th>ID</th><th>TEST CASE</th><th>SCENARIO</th><th>MODULE</th><th>SCREEN</th><th>TEST STEPS</th><th>TEST DATA</th><th>EXPECTED</th><th>ACTUAL</th><th>STATUS</th><th>SEVERITY</th><th>EVIDENCE</th><th>NOTES</th></tr></thead>
            <tbody>
              <tr>
                <td class="td-id">${tc.id}</td>
                <td class="td-title">${tc.testCase}</td>
                <td class="td-truncate">${tc.scenario || '—'}</td>
                <td>${tc.module}</td>
                <td>${tc.screen || '—'}</td>
                <td class="td-truncate">${tc.steps || '—'}</td>
                <td class="td-truncate">${tc.testData || '—'}</td>
                <td class="td-truncate">${tc.expected || '—'}</td>
                <td class="td-truncate">${tc.actual || '—'}</td>
                <td>${statusBadge(tc.status)}</td>
                <td>${sevBadge(tc.severity)}</td>
                <td class="td-truncate">${renderEvidenceCell(tc.evidence, tc, 'evidence')}</td><td class="td-truncate">${renderEvidenceCell(tc.evidence2, tc, 'evidence2')}</td>
                <td class="td-truncate">${tc.notes || '—'}</td>
              </tr>
            </tbody>
          </table></div>
            `;
  } else if (previewArea) {
    previewArea.innerHTML = `
            <div class="tbl-wrap scrollable" style="margin-top: 20px; margin-bottom: 20px;" > <table>
              <thead><tr><th>ID</th><th>TEST CASE</th><th>SCENARIO</th><th>MODULE</th><th>SCREEN</th><th>TEST STEPS</th><th>TEST DATA</th><th>EXPECTED</th><th>ACTUAL</th><th>STATUS</th><th>SEVERITY</th><th>EVIDENCE</th><th>NOTES</th></tr></thead>
              <tbody>
                <tr>
                  <td class="td-id">—</td>
                  <td class="td-title">—</td>
                  <td class="td-truncate">—</td>
                  <td>—</td>
                  <td>—</td>
                  <td class="td-truncate">—</td>
                  <td class="td-truncate">—</td>
                  <td class="td-truncate">—</td>
                  <td class="td-truncate">—</td>
                  <td>—</td>
                  <td>—</td>
                  <td class="td-truncate">—</td>
                  <td class="td-truncate">—</td>
                </tr>
              </tbody>
            </table></div>
              `;
  }
  const langKey = S.selectedAutomationLanguage || (document.getElementById('auto-language-select') || {}).value || 'python';
  const script = S.automationScripts.find(s => String(s.testCaseId) === String(S.selectedAutomationTc) && s.module === S.selectedAutomationModule && s.language === langKey);

  // Update editor text
  const templates = {
    python: `from selenium import webdriver\nfrom selenium.webdriver.chrome.options import Options\n# OR: from playwright.sync_api import sync_playwright\n\ntry: \n    # DOCKER REQUIRED OPTIONS(For Selenium): \n    # options = Options() \n    # options.add_argument("--headless=new") \n    # options.add_argument("--no-sandbox") \n    # options.add_argument("--disable-dev-shm-usage") \n    \n    # Your logic here...\n    \n    # IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n    print("PASS") \nexcept Exception as e: \n    print("FAIL") \n    print(str(e))`,
    javascript: `const { Builder, By } = require("selenium-webdriver"); \nconst chrome = require("selenium-webdriver/chrome"); \n// OR: const { chromium } = require('playwright');\n\n(async function() {\n  try {\n    // DOCKER REQUIRED OPTIONS (For Selenium):\n    // const options = new chrome.Options();\n    // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\n    \n    // Your logic here...\n    \n    // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n    console.log("PASS");\n  } catch (err) {\n    console.log("FAIL");\n    console.log(err.message);\n  }\n})();`,
    java: `public class Script {\n    public static void main(String[] args) {\n        try {\n            // DOCKER REQUIRED OPTIONS (For Selenium):\n            // ChromeOptions options = new ChromeOptions();\n            // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\n\n            // Your logic here...\n\n            // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n            System.out.println("PASS");\n        } catch (Exception e) {\n            System.out.println("FAIL");\n            e.printStackTrace();\n        }\n    }\n}`
  };
  const existingScript = script && script.script && script.script.trim() !== '' ? script.script : '';
  S.currentUnsavedScript = existingScript ? existingScript : templates[langKey] || '';
  if (window.cmEditor) {
    window.cmEditor.dispatch({
      changes: {
        from: 0,
        to: window.cmEditor.state.doc.length,
        insert: S.currentUnsavedScript
      }
    });
  }

  // Update language selection
  if (langSelect) {
    langSelect.value = langKey;
    // Explicitly update options so that default selection matches
    Array.from(langSelect.options).forEach(opt => opt.selected = opt.value === langKey);
    langSelect.dispatchEvent(new Event('custom-update'));
    onAutoLangChange(true);
  }
}
export function buildAddTestCaseTab() {
  if (!S.initialDataReceived) return `<div class="empty">Waiting for server data...</div>`;
  const mods = S.modules.map(m => `<option>${m}</option>`).join('');
  setTimeout(updateAutoTcId, 50);
  return `
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Add New Test Case</div>
    </div>
    <div style="padding: 24px;">
      <div class="form-grid">
        <div class="field">
          <label>Test Case ID <span class="required">*</span></label>
          <input id="f-id" disabled style="opacity:0.6;cursor:not-allowed;" placeholder="e.g. TC-1001">
        </div>
        <div class="field">
          <label>Module <span class="required">*</span></label>
          <select id="f-mod" onchange="updateAutoTcId()">${mods}</select>
        </div>
        <div class="field form-full">
          <label>Test Case Title <span class="required">*</span></label>
          <input id="f-tc" placeholder="What is being tested?">
        </div>
        <div class="field form-full">
          <label>Scenario <span class="required">*</span></label>
          <input id="f-scenario" placeholder="Test scenario description">
        </div>
        <div class="field">
          <label>Screen Name <span class="required">*</span></label>
          <input id="f-screen" placeholder="e.g. FD Booking > All Bookings">
        </div>
        <div class="field">
          <label>Severity <span class="required">*</span></label>
          <select id="f-sev"><option>High</option><option selected>Medium</option><option>Low</option></select>
        </div>
        <div class="field form-full">
          <label>Test Steps <span class="required">*</span></label>
          <textarea id="f-steps" placeholder="1. Go to...&#10;2. Click...&#10;3. Observe..."></textarea>
        </div>
        <div class="field form-full">
          <label>Test Data</label>
          <textarea id="f-testData" placeholder="Enter test data..."></textarea>
        </div>
        <div class="field form-full">
          <label>Expected Results <span class="required">*</span></label>
          <textarea id="f-expected" placeholder="What should happen?"></textarea>
        </div>
        <div class="field form-full">
          <label>Actual Results <span class="required">*</span></label>
          <textarea id="f-actual" placeholder="What actually happened?"></textarea>
        </div>
        <div class="field">
          <label>Status <span class="required">*</span></label>
          <select id="f-status"><option>Pass</option><option>Fail</option><option>Hold</option></select>
        </div>
        <div class="field">
          <label>Evidence-1 (URL/filename) <span class="required">*</span></label>
          <div style="display:flex; gap:8px;">
            <input id="f-evidence" placeholder="Paste evidence URL" oninput="onEvidenceTextChange('f-evidence','f-evidence-file','f-evidence-preview')" style="flex:1;">
            <button type="button" class="btn btn-ghost btn-sm" style="border:1px dashed var(--border); display:flex; align-items:center; gap:6px;" onclick="requestExtensionCapture('f-evidence')" title="Capture with Extension">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture
            </button>
          </div>
          <div id="f-evidence-preview"></div>
          <label style="margin-top:12px;">Evidence-2 (URL/filename)</label>
          <div style="display:flex; gap:8px;">
            <input id="f-evidence2" placeholder="Paste evidence 2 URL" oninput="onEvidenceTextChange('f-evidence2','f-evidence2-file','f-evidence2-preview')" style="flex:1;">
            <button type="button" class="btn btn-ghost btn-sm" style="border:1px dashed var(--border); display:flex; align-items:center; gap:6px;" onclick="requestExtensionCapture('f-evidence2')" title="Capture with Extension">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture
            </button>
          </div>
          <div id="f-evidence2-preview"></div>
        </div>
        <div class="field form-full">
          <label>Notes</label>
          <textarea id="f-notes" placeholder="Additional notes..."></textarea>
        </div>
        <div class="form-full" style="display:flex; flex-direction:row; justify-content:flex-end; align-items:center; gap:12px; margin-top:16px;">
          <button class="btn btn-ghost" onclick="clearAddTestCase()">Cancel</button>
          <button class="btn btn-ghost" onclick="submitTC()" style="padding:7px 20px;">Save Test Case</button>
        </div>
      </div>
    </div>
  </div>`;
}
export function submitTC() {
  if (S.role !== 'qa') {
    showBannedModal();
    return;
  }
  const id = normalizeTcRowId(document.getElementById('f-id').value);
  const tc = document.getElementById('f-tc').value.trim();
  const mod = normalizeTcModule(document.getElementById('f-mod').value);
  const scenario = document.getElementById('f-scenario').value.trim();
  const screen = document.getElementById('f-screen').value.trim();
  const actual = document.getElementById('f-actual').value.trim();
  const expected = document.getElementById('f-expected').value.trim();
  const testData = document.getElementById('f-testData').value.trim();
  const status = document.getElementById('f-status').value;
  const steps = document.getElementById('f-steps').value.trim();
  const evidenceText = (document.getElementById('f-evidence') || {
    value: ''
  }).value.trim();
  const evidence2Text = (document.getElementById('f-evidence2') || {
    value: ''
  }).value.trim();
  if (!id || !tc || !mod || !actual || !expected || !steps || !scenario || !screen || !evidenceText) {
    toast('Please fill all required fields', 'error');
    return;
  }
  if (S.testCases.find(t => testcaseKeysMatch(t, {
    id,
    module: mod
  }))) {
    toast(`Test Case ID "${id}" already exists in module "${mod}"`, 'error');
    return;
  }
  const newTC = {
    id,
    testCase: tc,
    scenario: document.getElementById('f-scenario').value.trim(),
    module: mod,
    screen: document.getElementById('f-screen').value.trim(),
    steps,
    testData,
    expected,
    actual,
    status,
    severity: document.getElementById('f-sev').value,
    evidence: evidenceText,
    evidence2: evidence2Text,
    notes: document.getElementById('f-notes').value.trim(),
    createdAt: now(),
    createdBy: S.auth.user,
    updatedAt: now(),
    history: []
  };
  S.testCases.push(newTC);
  S.tcCounter++;
  audit(`${id} added to module ${mod} with status ${status}`);

  // Send test case update to server
  socket.emit('updateData', {
    type: 'testCase',
    data: newTC
  });
  socket.emit('updateData', {
    type: 'counters',
    data: {
      tcCounter: S.tcCounter,
      bugCounter: S.bugCounter
    }
  });
  if (status === 'Fail' || status === 'Hold') {
    autoCreateBug(newTC);
  }
  save();
  toast(`Test case ${id} added successfully`, 'success');
  switchTestCasesTab('all');
}
export function viewTC(id, module) {
  const tc = S.testCases.find(t => testcaseKeysMatch(t, {
    id,
    module
  }));
  if (!tc) return;
  const linkedBug = S.bugs.find(b => bugRefsTestCaseKeys(b, id, tc.module));
  const viewIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;vertical-align:middle;color:var(--text2);"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  showModal(`<div style="display:flex;align-items:center;">${viewIcon}View Mode <span style="color:var(--text3);margin-left:6px;font-size:14px;font-weight:400;">| ${tc.id}</span></div>`, `
  <div style="display:flex; flex-direction:column; gap:24px; text-align:left;">
    <!-- Top Details Card -->
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        Test Case Details
      </h4>
      <div class="detail-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">ID</div><div class="detail-value" style="font-family:var(--font);color:var(--text2); font-weight:600; font-size:15px;">${tc.id}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Status</div><div class="detail-value">${statusBadge(tc.status)}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Module</div><div class="detail-value" style="color:var(--text2);">${tc.module}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Screen</div><div class="detail-value" style="color:var(--text2);">${tc.screen || '—'}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Severity</div><div class="detail-value">${sevBadge(tc.severity)}</div></div>
        <div class="detail-item"><div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.05em;">Created</div><div class="detail-value" style="font-family:var(--font); font-size:13px; color:var(--text2); background:var(--bg3); padding:4px 8px; border-radius:4px; display:inline-block;">${formatDate(tc.createdAt)}</div></div>
      </div>
    </div>

    <!-- Test Information Card -->
    <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
      <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--purple);"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        Test Information
      </h4>
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div>
          <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Scenario</div>
          <div class="detail-value" style="color:var(--text2); font-size:13px;">${tc.scenario || '—'}</div>
        </div>
        <div>
          <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Test Steps</div>
          <div class="minimal-well" style="color:var(--text2); font-size:13px; margin:0;">${tc.steps}</div>
        </div>
        <div>
          <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Test Data</div>
          <div class="minimal-well" style="color:var(--text2); font-size:13px; margin:0;">${tc.testData || '—'}</div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
          <div>
            <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Expected Results</div>
            <div class="minimal-well" style="color:var(--text2); font-size:13px; margin:0;">${tc.expected}</div>
          </div>
          <div>
            <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Actual Results</div>
            <div class="minimal-well" style="color:${tc.status === 'Fail' ? 'var(--red)' : 'var(--text2)'}; border-left-color:${tc.status === 'Fail' ? 'var(--red)' : 'var(--border)'}; font-size:13px; margin:0;">${tc.actual}</div>
          </div>
        </div>
        ${tc.evidence ? `
        <div>
          <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-1</div>
          <div><a href="${tc.evidence}" target="_blank" class="attachment-pill" style="display:inline-flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div>
          ${tc.evidence2 ? `<div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-top:8px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Evidence-2</div>
          <div><a href="${tc.evidence2}" target="_blank" class="attachment-pill" style="display:inline-flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg> View Attachment</a></div>` : ''}
        </div>` : ''}
        ${tc.notes ? `
        <div>
          <div class="detail-label" style="font-size:11px; color:var(--text); text-shadow:0 0 8px rgba(255,255,255,0.3); margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">Notes</div>
          <div class="minimal-well" style="color:var(--text2); font-size:13px; margin:0;">${tc.notes}</div>
        </div>` : ''}
      </div>
    </div>
  </div>
  ${linkedBug ? `
  <div style="background:var(--bg2); border:1px solid var(--red-border); border-radius:12px; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.05); margin-top:24px;">
    <h4 style="margin-top:0; margin-bottom:16px; font-size:14px; color:var(--text); display:flex; align-items:center; justify-content:flex-start; gap:8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--red);"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
      Linked Bug
    </h4>
    <div class="linked-bug-card" onclick="closeModal(); setTimeout(()=>viewBug('${linkedBug.id}'),100);">
      <div style="color:var(--red);font-weight:600;">${linkedBug.id}</div>
      <div style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;color:var(--text);">${linkedBug.bugTitle || linkedBug.testCase}</div>
      <div>${statusBadge(linkedBug.status)}</div>
    </div>
  </div>` : ''}
  `, null, true);
}
export function deleteTC(id, module) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const tc = S.testCases.find(t => testcaseKeysMatch(t, {
    id,
    module
  }));
  if (!tc) return;
  openConfirm('Permanently Delete Test Case', `Delete "${tc.testCase}" (${id})?This will also remove any linked bugs and CANNOT be undone. The record will be completely removed from the system.`, () => {
    const deletedBugIds = S.bugs.filter(b => bugRefsTestCaseKeys(b, id, module)).map(b => b.id);
    S.bugs = S.bugs.filter(b => !bugRefsTestCaseKeys(b, id, module));
    S.testCases = S.testCases.filter(t => !testcaseKeysMatch(t, {
      id,
      module
    }));
    audit(`Test case ${id} "${tc.testCase}" permanently deleted along with linked bugs`);
    socket.emit('updateData', {
      type: 'testCase',
      data: {
        id: normalizeTcRowId(id),
        module: normalizeTcModule(module),
        deleted: true
      }
    });
    deletedBugIds.forEach(bugId => {
      socket.emit('updateData', {
        type: 'bug',
        data: {
          id: bugId,
          deleted: true
        }
      });
    });
    save();
    toast(`Test case ${id} permanently deleted`, 'success');
  });
}
export
  // ─────────────────────────── EDIT TEST CASE ───────────────────────────
  function openEditTC(id, module) {
  if (!S.initialDataReceived) {
    toast('Waiting for server data...', 'error');
    return;
  }
  const tc = S.testCases.find(t => testcaseKeysMatch(t, {
    id,
    module
  }));
  if (!tc) return;
  const evidenceInputValue = /^data:image\//i.test(tc.evidence || '') ? '' : tc.evidence || '';
  const evidence2InputValue = /^data:image\//i.test(tc.evidence2 || '') ? '' : tc.evidence2 || '';
  const mods = S.modules.map(m => `<option${m === tc.module ? ' selected' : ''}>${m}</option>`).join('');
  showModal('<div style="display:flex;align-items:center;gap:8px;"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit Mode</div>', `
  <div style="margin-bottom:24px;font-size:13px;color:var(--text3);display:flex;align-items:center;gap:8px;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
    Editing <span style="color:var(--text);font-weight:500;">${tc.id}</span> of <span style="color:var(--text);font-weight:500;">${tc.module.replace(/"/g, '&quot;')}</span>
  </div>
  <div class="form-grid">
    <div class="field">
      <label>Test Case ID <span class="required">*</span></label>
      <input value="${tc.id}" disabled style="opacity:.45;cursor:not-allowed;">
    </div>
    <div class="field">
      <label>Module <span class="required">*</span></label>
      <select id="e-mod" disabled style="opacity:.45;cursor:not-allowed;">${mods}</select>
    </div>
    <div class="field form-full">
      <label>Test Case Title <span class="required">*</span></label>
      <input id="e-tc" value="${tc.testCase.replace(/"/g, '&quot;').replace(/</g, '&lt;')}">
    </div>
    <div class="field form-full">
      <label>Scenario <span class="required">*</span></label>
      <input id="e-scenario" value="${(tc.scenario || '').replace(/"/g, '&quot;').replace(/</g, '&lt;')}">
    </div>
    <div class="field">
      <label>Screen Name <span class="required">*</span></label>
      <input id="e-screen" value="${(tc.screen || '').replace(/"/g, '&quot;')}">
    </div>
    <div class="field">
      <label>Severity <span class="required">*</span></label>
      <select id="e-sev">
        <option${tc.severity === 'High' ? ' selected' : ''}>High</option>
        <option${tc.severity === 'Medium' ? ' selected' : ''}>Medium</option>
        <option${tc.severity === 'Low' ? ' selected' : ''}>Low</option>
      </select>
    </div>
    <div class="field form-full">
      <label>Test Steps <span class="required">*</span></label>
      <textarea id="e-steps">${(tc.steps || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field form-full">
      <label>Test Data</label>
      <textarea id="e-testData">${(tc.testData || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field form-full">
      <label>Expected Results <span class="required">*</span></label>
      <textarea id="e-expected">${(tc.expected || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field form-full">
      <label>Actual Results <span class="required">*</span></label>
      <textarea id="e-actual">${(tc.actual || '').replace(/</g, '&lt;')}</textarea>
    </div>
    <div class="field">
      <label>Status <span class="required">*</span></label>
      <select id="e-status">
        <option${tc.status === 'Pass' ? ' selected' : ''}>Pass</option>
        <option${tc.status === 'Fail' ? ' selected' : ''}>Fail</option>
        <option${tc.status === 'Hold' ? ' selected' : ''}>Hold</option>
      </select>
    </div>
    <div class="field">
      <label>Evidence-1 (URL/filename) <span class="required">*</span></label>
      <div style="display:flex; gap:8px;">
        <input id="e-evidence" value="${evidenceInputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence','e-evidence-file','e-evidence-preview')" style="flex:1;">
        <button type="button" class="btn btn-ghost btn-sm" style="border:1px dashed var(--border); display:flex; align-items:center; gap:6px;" onclick="requestExtensionCapture('e-evidence')" title="Capture with Extension">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture
        </button>
      </div>
      <input id="e-evidence-file" type="hidden">
      <div id="e-evidence-preview"></div>
      
      <label style="margin-top:12px;">Evidence-2 (URL/filename)</label>
      <div style="display:flex; gap:8px;">
        <input id="e-evidence2" value="${evidence2InputValue.replace(/"/g, '&quot;')}" oninput="onEvidenceTextChange('e-evidence2','e-evidence2-file','e-evidence2-preview')" style="flex:1;">
        <button type="button" class="btn btn-ghost btn-sm" style="border:1px dashed var(--border); display:flex; align-items:center; gap:6px;" onclick="requestExtensionCapture('e-evidence2')" title="Capture with Extension">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg> Capture
        </button>
      </div>
      <input id="e-evidence2-file" type="hidden">
      <div id="e-evidence2-preview"></div>
    </div>
    <div class="field form-full">
      <label>Notes</label>
      <textarea id="e-notes">${(tc.notes || '').replace(/</g, '&lt;')}</textarea>
    </div>
  </div>
  <input type="hidden" id="e-tcid" value="${tc.id}">
  <input type="hidden" id="e-tcmodold" value="${tc.module.replace(/"/g, '&quot;')}">
  `, () => submitEditTC());
  const eHidden = document.getElementById('e-evidence-file');
  if (eHidden && /^data:image\//i.test(tc.evidence || '')) eHidden.value = tc.evidence;
  renderEvidencePreview('e-evidence-preview', tc.evidence || '');
  const e2Hidden = document.getElementById('e-evidence2-file');
  if (e2Hidden && /^data:image\//i.test(tc.evidence2 || '')) e2Hidden.value = tc.evidence2;
  renderEvidencePreview('e-evidence2-preview', tc.evidence2 || '');
}
export function submitEditTC() {
  const id = normalizeTcRowId((document.getElementById('e-tcid') || {
    value: ''
  }).value);
  const oldMod = normalizeTcModule((document.getElementById('e-tcmodold') || {
    value: ''
  }).value);
  const title = (document.getElementById('e-tc') || {
    value: ''
  }).value.trim();
  const mod = normalizeTcModule((document.getElementById('e-mod') || {
    value: ''
  }).value);
  const scenario = (document.getElementById('e-scenario') || {
    value: ''
  }).value.trim();
  const screen = (document.getElementById('e-screen') || {
    value: ''
  }).value.trim();
  const steps = (document.getElementById('e-steps') || {
    value: ''
  }).value.trim();
  const testData = (document.getElementById('e-testData') || {
    value: ''
  }).value.trim();
  const expected = (document.getElementById('e-expected') || {
    value: ''
  }).value.trim();
  const actual = (document.getElementById('e-actual') || {
    value: ''
  }).value.trim();
  const status = (document.getElementById('e-status') || {
    value: ''
  }).value;
  const evidence = (document.getElementById('e-evidence') || {
    value: ''
  }).value.trim();
  if (!title || !mod || !steps || !expected || !actual || !scenario || !screen || !evidence) {
    toast('Please fill all required fields', 'error');
    return;
  }
  const tc = S.testCases.find(t => testcaseKeysMatch(t, {
    id,
    module: oldMod
  }));
  if (!tc) {
    toast('Test case not found', 'error');
    return;
  }
  if (oldMod !== mod && S.testCases.find(t => t !== tc && testcaseKeysMatch(t, {
    id,
    module: mod
  }))) {
    toast(`Test Case ID "${id}" already exists in module "${mod}"`, 'error');
    return;
  }
  const oldStatus = tc.status;
  const prevModule = tc.module;
  tc.testCase = title;
  tc.module = mod;
  tc.scenario = (document.getElementById('e-scenario') || {
    value: ''
  }).value.trim();
  tc.screen = (document.getElementById('e-screen') || {
    value: ''
  }).value.trim();
  tc.severity = (document.getElementById('e-sev') || {
    value: 'Medium'
  }).value;
  tc.steps = steps;
  tc.testData = testData;
  tc.expected = expected;
  tc.actual = actual;
  tc.status = status;
  const evidenceText = (document.getElementById('e-evidence') || {
    value: ''
  }).value.trim();
  const evidence2Text = (document.getElementById('e-evidence2') || {
    value: ''
  }).value.trim();
  tc.evidence = evidenceText;
  tc.evidence2 = evidence2Text;
  tc.notes = (document.getElementById('e-notes') || {
    value: ''
  }).value.trim();
  tc.updatedAt = now();
  tc.history = tc.history || [];
  tc.history.push({
    date: now(),
    event: `Edited. Status: ${oldStatus} → ${status}`
  });

  // Send test case update to server
  socket.emit('updateData', {
    type: 'testCase',
    data: tc
  });

  // Keep linked bug module aligned when test case module changes
  if (prevModule !== mod) {
    S.bugs.filter(b => bugRefsTestCaseKeys(b, id, prevModule)).forEach(b => {
      b.module = mod;
      b.history = b.history || [];
      b.history.push({
        date: now(),
        event: `Module updated to ${mod} after test case edit`,
        actor: S.auth.user
      });
      socket.emit('updateData', {
        type: 'bug',
        data: b
      });
    });
  }

  // If newly failing/hold and no active bug, auto-create
  const wasActive = oldStatus === 'Fail' || oldStatus === 'Hold';
  const isActive = status === 'Fail' || status === 'Hold';
  if (isActive && !wasActive) {
    autoCreateBug(tc);
  }
  // If changed to Pass, close any open linked bug
  if (!isActive && wasActive) {
    const linked = S.bugs.find(b => bugRefsTestCaseKeys(b, id, tc.module) && (b.status === 'Open' || b.status === 'Retest Failed'));
    if (linked) {
      linked.status = 'Verified';
      linked.history.push({
        date: now(),
        event: `Bug auto-closed — test case changed to ${status}`,
        actor: S.auth.user
      });

      // Send bug update to server
      socket.emit('updateData', {
        type: 'bug',
        data: linked
      });
      audit(`Bug ${linked.id} auto-closed (TC ${id} changed to ${status})`);
    }
  }
  audit(`Test case ${id} edited — status ${oldStatus} → ${status}`);
  closeModal();
  save();
  toast(`Test case ${id} updated`, 'success');
}

// ─────────────────────────── ESCALATE BUG ───────────────────────────
export
  // ─────────────────────────── DOWNLOAD TEST CASES CSV ───────────────────────────
  function downloadImportTemplate() {
  const headers = 'Test Case ID,Test Case,Scenario,Module Name,Screen Name,Test Step,Test Data,Expected Results,Actual Results,Status,Severity,Evidence-1,Evidence-2,Notes';
  const example = 'TC-1,Verify login button,User enters valid credentials,DMS,Login Page,1. Go to login page2. Enter credentials3. Click login,valid@email.com / Pass@123,User should be logged in successfully,User logged in,Pass,Medium,,,';
  const csv = headers + '\n' + example;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'bugos-test-case-template.csv';
  a.click();
  toast('Template downloaded — fill it in and import', 'success');
}
export function downloadTestCasesCSV() {
  const dlMod = (document.getElementById('tcDlMod') || {
    value: ''
  }).value;
  const dlSt = (document.getElementById('tcDlSt') || {
    value: ''
  }).value;
  let data = [...S.testCases];
  if (dlMod) data = data.filter(t => t.module === dlMod);
  if (dlSt) data = data.filter(t => t.status === dlSt);
  if (!data.length) {
    toast('No test cases match selected filters', 'error');
    return;
  }
  const esc = v => `"${(v || '').replace(/"/g, '""')}"`;
  let csv = 'Test Case ID,Test Case,Scenario,Module,Screen Name,Test Steps,Test Data,Expected Results,Actual Results,Status,Severity,Evidence-1,Evidence-2,Notes,Created,Updated\n';
  data.forEach(tc => {
    csv += `${tc.id},${esc(tc.testCase)},${esc(tc.scenario)},${tc.module},${esc(tc.screen)},${esc(tc.steps)},${esc(tc.testData)},${esc(tc.expected)},${esc(tc.actual)},${tc.status},${tc.severity},${esc(tc.evidence)},${esc(tc.evidence2)},${esc(tc.notes)},${formatDate(tc.createdAt)},${formatDate(tc.updatedAt)}\n`;
  });
  const fname = `test-cases${dlMod ? '-' + dlMod : ''}${dlSt ? '-' + dlSt : ''}-${now()}.csv`;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = fname;
  a.click();
  toast(`Downloaded ${data.length} test cases`, 'success');
}

// ─────────────────────────── IMPORT CSV ───────────────────────────


export function buildImportTestCaseTab() {
  if (!S.initialDataReceived) {
    return `<div class="empty">Waiting for server data...</div>`;
  }
  if (!S.modules.length) {
    return `<div class="empty">Please add a module before importing test cases</div>`;
  }
  if (!S._importTargetModule) {
    S._importRows = [];
    S._importTargetModule = S.modules[0] || '';
  }
  const moduleOptions = S.modules.map(m => `<option value="${m.replace(/"/g, '&quot;')}">${m}</option>`).join('');
  return `
  <div class="section">
    <div class="section-hdr">
      <div class="section-title">Import Test Cases</div>
    </div>
    <div style="padding: 24px;">
      <div class="form-grid">
        <!-- LEFT COLUMN -->
        <div>
          <div class="field" style="margin-bottom:24px;">
            <label>Import To Module</label>
            <select id="imp-module" class="${S._importTargetModule ? 'filter-active' : ''}" style="width:100%; transition:all 0.2s ease;" onmouseover="this.classList.add('filter-active')" onmouseout="if(!this.value) this.classList.remove('filter-active')" onchange="setImportModule(this.value); if(this.value) this.classList.add('filter-active'); else this.classList.remove('filter-active');">${moduleOptions}</select>
            <div style="margin-top:8px;font-size:12px;color:var(--text3);line-height:1.5;">
              Used when a row has no <strong>Module Name</strong> column value. Uniqueness is enforced per module.
            </div>
          </div>

          <div id="imp-dropzone"
               class="dropzone-area"
               onclick="document.getElementById('imp-file').click()"
               ondragover="event.preventDefault();this.classList.add('dragover')"
               ondragleave="this.classList.remove('dragover')"
               ondrop="this.classList.remove('dragover');handleImpDrop(event)">
            <input type="file" id="imp-file" accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none" onchange="handleImpFile(this)">
            <div style="margin-bottom:12px;color:var(--text3);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </div>
            <div style="font-size:14px;color:var(--text);font-weight:500;margin-bottom:4px;">Click to upload or drag and drop</div>
            <div style="font-size:12px;color:var(--text3);">CSV UTF‑8 or Excel (.xlsx)</div>
          </div>

          <div style="margin-top:24px;text-align:center;background:var(--bg3);padding:16px;border-radius:var(--radius);border:1px dashed var(--border);">
            <div style="margin-bottom:12px;">
              <button class="attachment-pill" style="border:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;" onclick="downloadImportTemplate()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download Template</button>
            </div>
            <div style="font-size:12px;color:var(--text3);">
              Status accepted: <span style="color:var(--text);font-weight:500">Pass / Fail / Hold</span> &nbsp;&nbsp; 
              Severity accepted: <span style="color:var(--text);font-weight:500">High / Medium / Low</span>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN -->
        <div style="display:flex; flex-direction:column; height:100%; min-height:0;">
          <div id="imp-stats"></div>
          <div id="imp-preview" style="flex:1; display:flex; flex-direction:column; min-height:0; margin-top:22px;">
            <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px dashed var(--border); border-radius:var(--radius); background:var(--bg3); padding:24px; text-align:center; color:var(--text3);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:16px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              <div style="font-size:14px;font-weight:500;color:var(--text);margin-bottom:4px;">No File Uploaded</div>
              <div style="font-size:12px;">Upload a CSV or Excel file to see the preview here.</div>
            </div>
          </div>
          <div id="imp-status"></div>
        </div>

        <div class="form-full" style="display:flex; flex-direction:row; justify-content:flex-end; align-items:center; gap:12px; margin-top:40px;">
          <button class="btn btn-ghost" onclick="clearImportTestCase()">Cancel</button>
          <button class="btn btn-ghost" id="imp-btn" onclick="doImport()" style="padding:7px 20px; opacity:0.5; pointer-events:none;">Run Import</button>
        </div>
      </div>
    </div>
  </div>`;
}
export function setImportModule(moduleName) {
  S._importTargetModule = moduleName || '';
}

// Listen for captures from the BugOS extension for the Excel grid
const excelCaptureTarget = document.getElementById('excel-capture-target');
if (excelCaptureTarget) {
  excelCaptureTarget.addEventListener('input', (e) => {
    const url = e.target.value;
    if (window.excelActiveCell && window.spreadsheetInstance && url) {
      const { row, col } = window.excelActiveCell;
      const currentVal = window.spreadsheetInstance.getValueFromCoords(col, row);
      const newVal = currentVal ? currentVal + '\n' + url : url;
      window.spreadsheetInstance.setValueFromCoords(col, row, newVal);
    }
    e.target.value = '';
  });
}

window.clearAddTestCase = function() {
  if (S.role !== 'qa') { showBannedModal(); return; }
  document.querySelectorAll('#f-tc, #f-scenario, #f-screen, #f-steps, #f-testData, #f-expected, #f-actual, #f-evidence, #f-evidence2, #f-notes').forEach(el => el.value = '');
  const sev = document.getElementById('f-sev'); if(sev) sev.value = 'Medium';
  const st = document.getElementById('f-status'); if(st) st.value = 'Pass';
  const pv1 = document.getElementById('f-evidence-preview'); if(pv1) pv1.innerHTML = '';
  const pv2 = document.getElementById('f-evidence2-preview'); if(pv2) pv2.innerHTML = '';
  toast('Form cleared', 'info');
};

window.clearImportTestCase = function() {
  if (S.role !== 'qa') { showBannedModal(); return; }
  S._importRows = [];
  S._importTargetModule = '';
  const f = document.getElementById('imp-file');
  if (f) f.value = '';
  const stats = document.getElementById('imp-stats');
  if (stats) stats.innerHTML = '';
  const status = document.getElementById('imp-status');
  if (status) status.innerHTML = '';
  const preview = document.getElementById('imp-preview');
  if (preview) {
    preview.innerHTML = `
      <div style="flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; border:1px dashed var(--border); border-radius:var(--radius); background:var(--bg3); padding:24px; text-align:center; color:var(--text3);">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;margin-bottom:16px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        <div style="font-size:14px;font-weight:500;color:var(--text);margin-bottom:4px;">No File Uploaded</div>
        <div style="font-size:12px;">Upload a CSV or Excel file to see the preview here.</div>
      </div>`;
  }
  const btn = document.getElementById('imp-btn');
  if (btn) {
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
  }
  toast('Import cleared', 'info');
};