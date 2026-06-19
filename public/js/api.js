import { normalizeTcRowId, normalizeTcModule, now, toast, showBannedModal } from './utils.js';
import { testcaseKeysMatch, switchTestCasesTab, _importRows, _importTargetModule } from './testcases.js';
import { S.S } from './state.js';
import { save, renderImpPreview } from './app.js';
import { audit } from './auth.js';
import { autoCreateBug } from './bugs.js';

export
// ─────────────────────────── STATE ───────────────────────────

// Socket.IO connection
const socket = io();

/** Business key fields for test cases: same TC number must be allowed across different modules. */
export function refreshData() {
  const app = document.getElementById('app');
  if (app && !document.getElementById('refresh-overlay')) {
    const isLight = S.currentTheme === 'light';
    const bg = 'color-mix(in srgb, var(--text) 5%, var(--bg2))';
    const imgSrc = isLight ? 'assets/draft light.png' : 'assets/draft.png';
    const overlay = document.createElement('div');
    overlay.id = 'refresh-overlay';
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${bg};backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:9999;`;
    overlay.innerHTML = `<div class="loader-wrapper"><div class="loader-ring"></div><img src="${imgSrc}" class="loader-image" alt="Loading" /></div>`;
    app.appendChild(overlay);
  }
  window.isRefreshing = true;
  socket.disconnect();
  setTimeout(() => {
    socket.connect();
  }, 500);
}
export function parseImpFile(file) {
  const status = document.getElementById('imp-status');
  const preview = document.getElementById('imp-preview');
  const selectedModule = (document.getElementById('imp-module') || {
    value: ''
  }).value;
  if (status) status.textContent = `Reading "${file.name}"...`;
  if (preview) preview.innerHTML = '';
  _importRows = [];
  _importTargetModule = selectedModule || _importTargetModule;
  if (!_importTargetModule) {
    if (status) status.innerHTML = `<span style="color:var(--red)">❌ Please select a module before importing.</span>`;
    return;
  }

  // Accept CSV, TXT, Excel files
  if (!file.name.match(/\.(csv|txt|xlsx|xls)$/i)) {
    if (status) status.innerHTML = `<span style="color:var(--red)">❌ Use a .csv, .txt, .xlsx, or .xls file.</span>`;
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => {
    if (status) status.innerHTML = `<span style="color:var(--red)">❌ Failed to read file.</span>`;
  };
  reader.onload = e => {
    try {
      let raw;
      if (file.name.match(/\.xlsx?$/i)) {
        const workbook = XLSX.read(e.target.result, {
          type: 'array'
        });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        raw = XLSX.utils.sheet_to_csv(sheet);
      } else {
        raw = e.target.result;
      }
      // Parse entire CSV handling quotes properly
      const parsedRows = parseCSVData(raw);
      if (parsedRows.length < 2) {
        if (status) status.innerHTML = `<span style="color:var(--red)">❌ File appears empty or has no data rows.</span>`;
        return;
      }

      // Parse headers — be very flexible
      const rawHeaders = parsedRows[0];
      const headers = rawHeaders.map(h => h.toLowerCase().trim().replace(/[^a-z0-9 ]/g, ' ') // strip special chars
      .replace(/\s+/g, ' ') // collapse spaces
      .trim());
      if (status) status.textContent = `Parsed ${parsedRows.length - 1} data rows. Mapping columns...`;

      // Column finder — tries multiple aliases
      const col = aliases => {
        for (const alias of aliases) {
          const idx = headers.findIndex(h => h === alias);
          if (idx >= 0) return idx;
        }
        for (const alias of aliases) {
          const idx = headers.findIndex(h => h.startsWith(alias));
          if (idx >= 0) return idx;
        }
        return -1;
      };
      const colMap = {
        id: col(['test case id', 'testcase id', 'tc id', 'tc_id', 'tcid', 'case id', 'tc no', 'tc number', 'id']),
        testCase: col(['test case']),
        scenario: col(['scenario']),
        module: col(['module name', 'module']),
        screen: col(['screen name', 'screen']),
        steps: col(['test step', 'test steps']),
        testData: col(['test data']),
        expected: col(['expected results', 'expected result']),
        actual: col(['actual results', 'actual result']),
        status: col(['status']),
        severity: col(['severity']),
        evidence: col(['evidence-1', 'evidence']),
        evidence2: col(['evidence-2', 'evidence 2']),
        notes: col(['notes'])
      };
      const rows = [];
      const warnings = [];
      for (let i = 1; i < parsedRows.length; i++) {
        const cols = parsedRows[i];
        if (cols.every(c => !c.trim())) continue; // skip blank rows

        const get = (key, fallback = '') => {
          const idx = colMap[key];
          return idx >= 0 ? (cols[idx] || '').trim() : fallback;
        };

        // Normalise Status
        let rawSt = get('status', 'Pass');
        let status = 'Pass';
        if (/^fail/i.test(rawSt)) status = 'Fail';else if (/^hold/i.test(rawSt) || /^block/i.test(rawSt)) status = 'Hold';else if (/^pass/i.test(rawSt)) status = 'Pass';else {
          warnings.push(`Row ${i + 1}: status "${rawSt}" not recognised, defaulted to Pass`);
        }

        // Normalise Severity
        let rawSev = get('severity', 'Medium');
        let severity = 'Medium';
        if (/^high/i.test(rawSev) || rawSev === '1') severity = 'High';else if (/^low/i.test(rawSev) || rawSev === '3') severity = 'Low';else if (/^med/i.test(rawSev) || rawSev === '2') severity = 'Medium';

        // Use module from CSV if available, otherwise fall back to dropdown selection (same TC# can repeat in other modules).
        const csvModule = normalizeTcModule(get('module', ''));
        const modVal = csvModule || normalizeTcModule(_importTargetModule);

        // Generate ID if missing
        let rowId = normalizeTcRowId(get('id', ''));
        if (!rowId) {
          warnings.push(`Row ${i + 1}: missing Test Case ID — row skipped`);
          continue;
        }
        rows.push({
          id: rowId,
          testCase: get('testCase') || `Imported TC ${i}`,
          scenario: get('scenario'),
          module: modVal || normalizeTcModule(_importTargetModule),
          screen: get('screen'),
          steps: get('steps'),
          testData: get('testData'),
          expected: get('expected'),
          actual: get('actual'),
          status,
          severity,
          evidence: get('evidence'),
          evidence2: get('evidence2'),
          notes: get('notes'),
          _rowNum: i + 1
        });
      }
      const newModules = Array.from(new Set(rows.map(r => normalizeTcModule(r.module)).filter(m => m && !S.modules.includes(m))));
      if (newModules.length) {
        warnings.push(`New module detected: ${newModules.join(', ')}. This will be created automatically on import.`);
      }
      const seenSameFile = Object.create(null);
      let intraFileDupRows = 0;
      rows.forEach(row => {
        const k = `${normalizeTcRowId(row.id)}\t${normalizeTcModule(row.module)}`;
        if (seenSameFile[k]) intraFileDupRows++;else seenSameFile[k] = true;
      });
      if (intraFileDupRows > 0) {
        warnings.unshift(`${intraFileDupRows} row(s) repeat the same Test Case ID within the same module — extras will be skipped on import`);
      }
      _importRows = rows;
      renderImpPreview(rows, warnings, file.name);
    } catch (err) {
      console.error('Import parse error:', err);
      if (status) status.innerHTML = `<span style="color:var(--red)">❌ Parse error: ${err.message}</span>`;
    }
  };
  if (file.name.match(/\.xlsx?$/i)) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file, 'UTF-8');
  }
}

// Robust CSV parser — handles quoted fields, commas and newlines inside quotes, escaped quotes
export function parseCSVData(raw) {
  const rows = [];
  let curRow = [];
  let curCell = '';
  let inQ = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQ && raw[i + 1] === '"') {
        curCell += '"';
        i++;
      } // escaped quote ""
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      curRow.push(curCell.trim());
      curCell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && raw[i + 1] === '\n') i++; // handle \r\n
      curRow.push(curCell.trim());
      if (curRow.some(c => c.trim().length > 0)) rows.push(curRow);
      curRow = [];
      curCell = '';
    } else {
      curCell += ch;
    }
  }
  curRow.push(curCell.trim());
  if (curRow.some(c => c.trim().length > 0)) rows.push(curRow);
  return rows;
}
export function doImport() {
  if (S.role !== 'qa') {
    showBannedModal();
    return;
  }
  if (!_importRows.length) {
    toast('No data loaded — please select a CSV file first', 'error');
    return;
  }
  let added = 0,
    skipped = 0,
    bugs = 0,
    passed = 0;
  _importRows.forEach(r => {
    if (S.testCases.find(t => testcaseKeysMatch(t, r))) {
      skipped++;
      return;
    }
    const {
      _rowNum,
      ...tcData
    } = r; // strip internal field
    const newTC = {
      ...tcData,
      id: normalizeTcRowId(tcData.id),
      module: normalizeTcModule(tcData.module),
      createdAt: now(),
      createdBy: S.auth && S.auth.user ? S.auth.user : 'QA',
      updatedAt: now(),
      history: []
    };

    // Persist new module names created during import.
    if (newTC.module && !S.modules.includes(newTC.module)) {
      S.modules.push(newTC.module);
      socket.emit('updateData', {
        type: 'module',
        data: {
          name: newTC.module
        }
      });
    }
    S.testCases.push(newTC);
    S.tcCounter++;
    if (r.status === 'Fail' || r.status === 'Hold') {
      autoCreateBug(newTC);
      bugs++;
    }
    if (r.status === 'Pass') {
      passed++;
    }
    added++;

    // Send test case update to server
    socket.emit('updateData', {
      type: 'testCase',
      data: newTC
    });
  });

  // Send counter update to server
  socket.emit('updateData', {
    type: 'counters',
    data: {
      tcCounter: S.tcCounter,
      bugCounter: S.bugCounter
    }
  });
  audit(`Imported ${added} test cases from CSV (${skipped} duplicates skipped, ${bugs} bugs auto-created, ${passed} passed cases)`);
  _importRows = [];
  save();
  toast(`✓ Imported ${added} test cases${skipped ? `, ${skipped} skipped` : ''}${bugs ? `, ${bugs} bugs created` : ''}`, 'success');
  switchTestCasesTab('all');
}

// ─────────────────────────── MODAL ENGINE ───────────────────────────