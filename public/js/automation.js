import { socket } from './api.js';
import { bugRefsTestCaseKeys, updateTestCaseOptions, loadTestCaseScript } from './testcases.js';
import { S } from './state.js';
import { now, toast, statusBadge, sevBadge } from './utils.js';
import { audit } from './auth.js';
import { render } from './app.js';
import { renderEvidenceCell } from './screenshots.js';
import { autoCreateBug } from './bugs.js';

export
// ─────────────────────────── AUTOMATION ───────────────────────────
function buildAutomation() {
  const moduleOptions = S.modules.map(mod => `<option value="${mod}"${S.selectedAutomationModule === mod ? ' selected' : ''}>${mod}</option>`).join('');
  const testCaseOptions = S.selectedAutomationModule ? S.testCases.filter(tc => tc.module === S.selectedAutomationModule).map(tc => {
    const tcId = String(tc.id);
    const shortDesc = tc.testCase.length > 50 ? tc.testCase.substring(0, 50) + '...' : tc.testCase;
    return `<option value="${tcId}"${S.selectedAutomationTc === tcId ? ' selected' : ''}>${tcId}: ${shortDesc}</option>`;
  }).join('') : '';
  let tbodyHtml = `<tr>
        <td class="td-id">—</td>
        <td class="td-title">—</td>
        <td class="td-truncate">—</td>
        <td>—</td>
        <td>—</td>
        <td class="td-truncate">—</td>
        <td class="td-truncate">—</td>
        <td class="td-truncate">—</td>
        <td>—</td>
        <td>—</td>
        <td class="td-truncate">—</td>
        <td class="td-truncate">—</td>
      </tr>`;
  if (S.selectedAutomationModule && S.selectedAutomationTc) {
    const tc = S.testCases.find(t => String(t.id) === String(S.selectedAutomationTc) && t.module === S.selectedAutomationModule);
    if (tc) {
      tbodyHtml = `<tr>
            <td class="td-id">${tc.id}</td>
            <td class="td-title">${tc.testCase}</td>
            <td class="td-truncate">${tc.scenario || '—'}</td>
            <td>${tc.module}</td>
            <td>${tc.screen || '—'}</td>
            <td class="td-truncate">${tc.steps || '—'}</td>
            <td class="td-truncate">${tc.expected || '—'}</td>
            <td class="td-truncate">${tc.actual || '—'}</td>
            <td>${statusBadge(tc.status)}</td>
            <td>${sevBadge(tc.severity)}</td>
            <td class="td-truncate">${renderEvidenceCell(tc.evidence)}</td><td class="td-truncate">${renderEvidenceCell(tc.evidence2)}</td>
            <td class="td-truncate">${tc.notes || '—'}</td>
          </tr>`;
    }
  }
  const selectedTcPreview = `
        <div class="tbl-wrap scrollable" style="margin-top: 20px; margin-bottom: 20px;"><table>
          <thead><tr><th>ID</th><th>TEST CASE</th><th>SCENARIO</th><th>MODULE</th><th>SCREEN</th><th>TEST STEPS</th><th>EXPECTED</th><th>ACTUAL</th><th>STATUS</th><th>SEVERITY</th><th>EVIDENCE</th><th>NOTES</th></tr></thead>
          <tbody>${tbodyHtml}</tbody>
        </table></div>
      `;
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
    <div style="font-size:28px;font-weight:700;color:var(--text);">Automation</div>
    <div style="display:flex; align-items:center; gap:16px;">
      
    </div>
  </div>
  <style>
    .hover-blur-container { position: relative; overflow: hidden; }
    .hover-blur-overlay {
      position: absolute;
      inset: 0;
      background: rgba(18, 18, 18, 0.6);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    [data-theme='light'] .hover-blur-overlay {
      background: rgba(255, 255, 255, 0.6);
    }
    .hover-blur-container:hover .hover-blur-overlay {
      opacity: 1;
      pointer-events: auto;
    }
    .coming-soon-badge {
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 16px 32px;
      border-radius: 32px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.08);
      transform: translateY(20px) scale(0.95);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .hover-blur-container:hover .coming-soon-badge {
      transform: translateY(0) scale(1);
    }
    .coming-soon-icon {
      color: var(--accent);
      animation: pulse-icon 2s infinite;
    }
    @keyframes pulse-icon {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
    .coming-soon-text {
      background: linear-gradient(90deg, var(--accent), var(--purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-weight: 800;
      font-size: 16px;
      letter-spacing: 0.1em;
    }
    .tech-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      font-family: var(--font);
      background: linear-gradient(180deg, var(--bg3) 0%, var(--bg2) 100%);
      color: var(--text);
      border: 1px solid var(--border);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      cursor: default;
      position: relative;
    }
    [data-theme='light'] .tech-badge {
      background: linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
    }
    .tech-stack-container {
      display: flex;
      gap: 12px;
      margin-top: 16px;
      margin-bottom: 12px;
      align-items: center;
      flex-wrap: wrap;
      padding: 14px 18px;
      background: linear-gradient(90deg, var(--bg3), transparent);
      border-left: 3px solid var(--border2);
      border-radius: 6px 12px 12px 6px;
    }
    [data-theme='light'] .tech-stack-container {
      background: linear-gradient(90deg, var(--bg3), transparent);
    }
    .tech-stack-label {
      font-size: 11px;
      font-weight: 800;
      color: var(--text3);
      margin-right: 8px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>

  <div style="margin-bottom: 24px;">
    <div class="tech-stack-container" style="margin: 0; border-radius: 12px;">
      <span class="tech-stack-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
        Supported Tech Stack
      </span>
      
      <div class="tech-badge" title="Python">
        <svg style="width:16px; height:16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><linearGradient id="python-original-a" gradientUnits="userSpaceOnUse" x1="70.252" y1="1237.476" x2="170.659" y2="1151.089" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#5A9FD4"/><stop offset="1" stop-color="#306998"/></linearGradient><linearGradient id="python-original-b" gradientUnits="userSpaceOnUse" x1="209.474" y1="1098.811" x2="173.62" y2="1149.537" gradientTransform="matrix(.563 0 0 -.568 -29.215 707.817)"><stop offset="0" stop-color="#FFD43B"/><stop offset="1" stop-color="#FFE873"/></linearGradient><path fill="url(#python-original-a)" d="M63.391 1.988c-4.222.02-8.252.379-11.8 1.007-10.45 1.846-12.346 5.71-12.346 12.837v9.411h24.693v3.137H29.977c-7.176 0-13.46 4.313-15.426 12.521-2.268 9.405-2.368 15.275 0 25.096 1.755 7.311 5.947 12.519 13.124 12.519h8.491V67.234c0-8.151 7.051-15.34 15.426-15.34h24.665c6.866 0 12.346-5.654 12.346-12.548V15.833c0-6.693-5.646-11.72-12.346-12.837-4.244-.706-8.645-1.027-12.866-1.008zM50.037 9.557c2.55 0 4.634 2.117 4.634 4.721 0 2.593-2.083 4.69-4.634 4.69-2.56 0-4.633-2.097-4.633-4.69-.001-2.604 2.073-4.721 4.633-4.721z" transform="translate(0 10.26)"/><path fill="url(#python-original-b)" d="M91.682 28.38v10.966c0 8.5-7.208 15.655-15.426 15.655H51.591c-6.756 0-12.346 5.783-12.346 12.549v23.515c0 6.691 5.818 10.628 12.346 12.547 7.816 2.297 15.312 2.713 24.665 0 6.216-1.801 12.346-5.423 12.346-12.547v-9.412H63.938v-3.138h37.012c7.176 0 9.852-5.005 12.348-12.519 2.578-7.735 2.467-15.174 0-25.096-1.774-7.145-5.161-12.521-12.348-12.521h-9.268zM77.809 87.927c2.561 0 4.634 2.097 4.634 4.692 0 2.602-2.074 4.719-4.634 4.719-2.55 0-4.633-2.117-4.633-4.719 0-2.595 2.083-4.692 4.633-4.692z" transform="translate(0 10.26)"/></svg>
        Python
      </div>

      <div class="tech-badge" title="JavaScript">
        <svg style="width:16px; height:16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#F0DB4F" d="M1.408 1.408h125.184v125.185H1.408z"/><path fill="#323330" d="M116.347 96.736c-.917-5.711-4.641-10.508-15.672-14.981-3.832-1.761-8.104-3.022-9.377-5.926-.452-1.69-.512-2.642-.226-3.665.821-3.32 4.784-4.355 7.925-3.403 2.023.678 3.938 2.237 5.093 4.724 5.402-3.498 5.391-3.475 9.163-5.879-1.381-2.141-2.118-3.129-3.022-4.045-3.249-3.629-7.676-5.498-14.756-5.355l-3.688.477c-3.534.893-6.902 2.748-8.877 5.235-5.926 6.724-4.236 18.492 2.975 23.335 7.104 5.332 17.54 6.545 18.873 11.531 1.297 6.104-4.486 8.08-10.234 7.378-4.236-.881-6.592-3.034-9.139-6.949-4.688 2.713-4.688 2.713-9.508 5.485 1.143 2.499 2.344 3.63 4.26 5.795 9.068 9.198 31.76 8.746 35.83-5.176.165-.478 1.261-3.666.38-8.581zM69.462 58.943H57.753l-.048 30.272c0 6.438.333 12.34-.714 14.149-1.713 3.558-6.152 3.117-8.175 2.427-2.059-1.012-3.106-2.451-4.319-4.485-.333-.584-.583-1.036-.667-1.071l-9.52 5.83c1.583 3.249 3.915 6.069 6.902 7.901 4.462 2.678 10.459 3.499 16.731 2.059 4.082-1.189 7.604-3.652 9.448-7.401 2.666-4.915 2.094-10.864 2.07-17.444.06-10.735.001-21.468.001-32.237z"/></svg>
        JavaScript
      </div>

      <div class="tech-badge" title="Java">
        <svg style="width:16px; height:16px;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"/><path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"/><path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"/><path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z"/><path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"/></svg>
        Java
      </div>

      <div class="tech-badge" title="Selenium">
        <svg style="width:16px; height:16px;" viewBox="-6.5 0 269 269" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
          <g>
            <path d="M234.152874,0.00343857381 C234.808025,-0.0379575263 235.429647,0.297028821 235.755341,0.866994098 C236.081036,1.43695938 236.054047,2.14258032 235.685767,2.68600216 L235.685767,2.68600216 L169.388124,92.7434941 C168.902258,93.2919104 168.204691,93.6058549 167.472007,93.6058549 C166.739323,93.6058549 166.041756,93.2919104 165.55589,92.7434941 L165.55589,92.7434941 L142.179265,66.684305 C141.608302,66.0916135 140.79919,65.7901017 139.979599,65.86461 C139.160008,65.9391182 138.418531,66.3815927 137.963808,67.0675283 L137.963808,67.0675283 L123.784543,85.0790267 C123.335922,86.0932522 123.483294,87.2722249 124.167766,88.1448137 L124.167766,88.1448137 L166.322337,131.832278 C166.808203,132.380694 167.50577,132.694639 168.238454,132.694639 C168.971138,132.694639 169.668705,132.380694 170.154571,131.832278 L170.154571,131.832278 L252.930819,38.708999 C253.419531,38.1837537 254.176911,38.0053627 254.848672,38.2572733 C255.520434,38.5091839 255.973764,39.1415911 255.996606,39.8586691 L255.996606,39.8586691 L255.996606,266.343681 C256.028319,266.860939 255.83665,267.366955 255.470206,267.733398 C255.103763,268.099842 254.597747,268.291511 254.080489,268.259798 L254.080489,268.259798 L1.91951123,268.259798 C1.40225345,268.291511 0.896236952,268.099842 0.529793658,267.733398 C0.163350364,267.366955 -0.0283193115,266.860939 0.00339438157,266.343681 L0.00339438157,266.343681 L0.00339438157,1.91955542 C-0.0283193115,1.40229764 0.163350364,0.896281144 0.529793658,0.52983785 C0.896236952,0.163394556 1.40225345,-0.0282751193 1.91951123,0.00343857381 L1.91951123,0.00343857381 Z M169.004901,152.909563 C157.595908,152.708949 146.600443,157.179283 138.568082,165.284007 C130.535722,173.388731 126.164179,184.423846 126.467107,195.830581 C126.467107,222.272993 145.628275,239.134822 170.537794,239.134822 C182.068736,239.421769 193.375993,235.921903 202.728557,229.171014 C203.595534,228.383773 203.758299,227.081655 203.111781,226.105227 L203.111781,226.105227 L196.21376,215.758196 C195.438224,214.868953 194.118537,214.703992 193.147973,215.374973 C187.152367,219.469543 180.095799,221.73297 172.837134,221.88977 C159.424316,221.88977 150.993402,213.458856 149.460509,203.495048 C149.488325,203.083823 149.815731,202.756417 150.226955,202.728601 L150.226955,202.728601 L208.093684,202.728601 C209.327358,202.645153 210.309577,201.662935 210.393025,200.429261 L210.393025,200.429261 L210.393025,198.129921 C210.393025,171.304285 193.531196,152.909563 169.004901,152.909563 Z M111.904618,138.347075 C100.26487,128.832771 85.5368757,123.923439 70.5164945,124.551034 C44.4573053,124.551034 28.3619238,139.879969 28.3619238,158.27469 C28.3619238,200.046038 91.9770032,186.63322 91.9770032,206.177612 C91.9770032,212.309186 85.8454293,218.44076 72.8158347,218.44076 C60.4410031,218.54287 48.5018438,213.876992 39.4754015,205.411165 C38.9365113,204.907341 38.2064628,204.660494 37.4723971,204.733901 C36.7383313,204.807307 36.0716199,205.19383 35.6431678,205.794388 L35.6431678,205.794388 L25.6793602,219.59043 C25.0328421,220.566858 25.1956068,221.868976 26.0625835,222.656217 C36.4096145,232.236801 50.9721026,238.751598 71.2829412,238.751598 C101.174364,238.751598 115.736852,223.422663 116.503299,203.495048 C116.503299,162.106924 52.8882195,173.986849 52.8882195,156.358574 C52.8882195,149.843776 58.63657,145.245096 68.6003776,145.245096 C79.5839899,145.094583 90.2811092,148.750561 98.8750239,155.592127 C99.3802624,156.006036 100.031063,156.198722 100.680205,156.126595 C101.329346,156.054468 101.921977,155.723624 102.324034,155.208903 L102.324034,155.208903 L112.287842,141.796086 C112.701751,141.290847 112.894437,140.640046 112.82231,139.990905 C112.750183,139.341763 112.419339,138.749133 111.904618,138.347075 Z M169.388124,169.771392 C179.811439,169.188344 188.809537,176.998014 189.698963,187.399667 C189.671147,187.810891 189.34374,188.138297 188.932516,188.166113 L188.932516,188.166113 L149.843732,188.166113 C149.432507,188.138297 149.105101,187.810891 149.077285,187.399667 C150.358676,177.20234 159.111948,169.60516 169.388124,169.771392 Z" fill="#2CB134"></path>
          </g>
        </svg>
        Selenium
      </div>

      <div class="tech-badge" title="Playwright">
        <svg style="width:16px; height:16px;" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 508 508" xml:space="preserve">
          <circle style="fill:#FD8469;" cx="254" cy="254" r="254"/>
          <path style="fill:#324A5E;" d="M405.6,163.2c-26.8,15.2-60,29.6-96.8,41.6c-36.8,12-72,19.2-102.8,22.8c2,16.4,5.6,33.6,11.2,50.8
            c29.2,90,99.6,148,157.2,129.6c57.6-18.8,81.2-106.8,52-196.8C420.8,194,413.6,178,405.6,163.2z M236,267.6
            c26-14.4,58.8-5.2,73.6,20.8l0,0C283.2,303.2,250.4,293.6,236,267.6z M360.8,366c-33.2,10.8-68.8-5.6-82.8-36.4
            c19.6,11.2,46.4,14,73.2,5.6c26.4-8.4,46.4-26.4,56-47.2C413.6,321.6,394,355.2,360.8,366z M357.2,273.2L357.2,273.2
            c-3.6-29.6,17.6-56.4,47.2-60C408,242.8,386.8,269.6,357.2,273.2z"/>
          <path style="fill:#FFFFFF;" d="M322.4,155.2c-34-2-73.6-8-114.8-18.8s-78.4-24.8-109.2-40c-8,16.4-14.8,34.4-20,54
            C52,251.6,83.2,347.6,148,364.4c64.8,16.8,138.8-51.2,165.2-152.4C318.4,192.4,321.6,173.6,322.4,155.2z M102.4,151.6
            c32.8,2,58,30.4,56,63.2l0,0C125.6,212.8,100.4,184.4,102.4,151.6z M160.4,317.2c-37.2-9.6-60.8-45.6-55.6-83.2
            c11.6,22.4,35.2,40.8,64.8,48.4s59.2,2.8,80.4-10.8C236,307.2,197.6,327.2,160.4,317.2z M212.4,228.8L212.4,228.8
            c14.4-29.6,50-42,79.6-27.6C277.6,230.8,242,243.2,212.4,228.8z"/>
        </svg>
        Playwright
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-hdr">
      <div style="width: 100%;">
        <div class="section-title">Test Case Automation</div>
      </div>
    </div>
    <div style="padding: 20px;">
      <div class="form-grid">
        <div class="field">
          <label>Select Module</label>
          <select id="auto-module-select" onchange="updateTestCaseOptions()">
            <option value="">Choose a module...</option>
            ${moduleOptions}
          </select>
        </div>
        <div class="field">
          <label>Select Test Case</label>
          <select id="auto-tc-select" onchange="loadTestCaseScript()">
            <option value="">Choose a test case...</option>
            ${testCaseOptions}
          </select>
        </div>
      </div>
      <div id="auto-tc-preview">${selectedTcPreview}</div>
      <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,0.06); display:flex; flex-direction:column; margin-bottom:24px; position:relative;">
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:var(--bg3); border-bottom:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:12px;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--text3)" stroke-width="2" fill="none"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            <span style="font-size:13px; font-weight:600; color:var(--text2);">Bug OS IDE</span>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <select id="auto-language-select" onchange="onAutoLangChange()" style="background:var(--bg); border:1px solid var(--border); color:var(--text); font-size:12px; padding:4px 28px 4px 12px; border-radius:6px; outline:none; cursor:pointer; min-width: 140px;">
              <option value="python"${S.selectedAutomationLanguage === 'python' || !S.selectedAutomationLanguage ? ' selected' : ''}>Python</option>
              <option value="javascript"${S.selectedAutomationLanguage === 'javascript' ? ' selected' : ''}>JavaScript</option>
              <option value="java"${S.selectedAutomationLanguage === 'java' ? ' selected' : ''}>Java</option>
            </select>
          </div>
        </div>

        <div id="codemirror-container" style="height:400px; width:100%; text-align:left;"></div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:var(--bg3); border-top:1px solid var(--border);">
          <div style="display:flex; align-items:center; gap:16px;">
            <span style="font-size:11px; color:var(--text3); display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Auto-saved locally
            </span>
          </div>
          <div style="display:flex; gap:12px;">
            <button class="btn btn-ghost" onclick="clearAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>
              Clear
            </button>
            <button class="btn btn-ghost" onclick="saveAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg> Save (Ctrl+S)
            </button>
            <button class="btn btn-ghost" onclick="runAutomationScript()" ${S.role === 'qa' ? '' : 'disabled style="opacity:0.5;cursor:not-allowed"'}>
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-right:6px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Run Script
            </button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px;">
        
        <div style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:inset 0 2px 10px rgba(0,0,0,0.05);">
          <div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; background:var(--bg3);">
            <div style="display:flex; gap:6px;">
              <div style="width:10px; height:10px; border-radius:50%; background:#ef4444;"></div>
              <div style="width:10px; height:10px; border-radius:50%; background:#f59e0b;"></div>
              <div style="width:10px; height:10px; border-radius:50%; background:#10b981;"></div>
            </div>
            <span style="font-weight:bold; font-size:12px; color:var(--text2); margin-left:8px;">Bug OS Bash</span>
          </div>
          <div id="script-output" style="padding:16px; font-size:12px; color:var(--text2); height:300px; overflow:auto;">
            ${S.automationOutput || `<span style="color:var(--text3);">&gt; Waiting for script execution...</span>`}
          </div>
        </div>

        <div id="video-preview-container" style="background:var(--bg2); border:1px solid var(--border); border-radius:12px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.04); display:flex; flex-direction:column; height:342px;">
          <div style="padding:10px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px; background:var(--bg3);">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="var(--text3)" stroke-width="2" fill="none"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
            <span style="font-size:12px; font-weight:600; color:var(--text2);">Live Playback</span>
          </div>
          <div style="flex:1; display:flex; align-items:center; justify-content:center; background:var(--bg2); overflow:hidden;">
            ${S.automationVideo || `
            <div style="padding:16px; width:100%; height:100%; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
              <div style="text-align:center; padding:30px; border:2px dashed var(--border); border-radius:12px; background:var(--bg); transition:all 0.3s; color:var(--text3); width:100%;">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" style="margin-bottom:12px; opacity:0.6; display:inline-block;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <div style="font-size:14px; font-weight:600; color:var(--text2); margin-bottom:4px;">No Video Recorded</div>
                <div style="font-size:12px; max-width:240px; margin:0 auto; line-height:1.6;">Configure <code style="background:var(--bg3); padding:2px 6px; border-radius:4px; font-family:var(--mono);">record_video_dir</code> in Playwright to see playback here.</div>
              </div>
            </div>
            `}
          </div>
        </div>

      </div>
    </div>
  </div> `;
}
export function clearAutomationScript() {
  if (window.cmEditor) {
    window.cmEditor.dispatch({
      changes: {
        from: 0,
        to: window.cmEditor.state.doc.length,
        insert: ''
      }
    });
  }
  S.currentUnsavedScript = '';
  S.automationOutput = '';
  S.automationVideo = '';
  render();
}
export function saveAutomationScript() {
  const script = window.cmEditor ? window.cmEditor.state.doc.toString().trim() : (S.currentUnsavedScript || '').trim();
  const language = document.getElementById('auto-language-select').value;
  if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
    toast('Please select module and test case first', 'error');
    return;
  }
  if (!script) {
    toast('Please enter a script', 'error');
    return;
  }
  const scriptData = {
    testCaseId: S.selectedAutomationTc,
    module: S.selectedAutomationModule,
    script,
    language,
    updatedAt: now(),
    updatedBy: S.auth.user
  };
  const existingIndex = S.automationScripts.findIndex(s => String(s.testCaseId) === String(scriptData.testCaseId) && s.module === scriptData.module && s.language === scriptData.language);
  if (existingIndex !== -1) {
    S.automationScripts[existingIndex] = scriptData;
  } else {
    S.automationScripts.push(scriptData);
  }
  render();
  socket.emit('updateData', {
    type: 'automationScript',
    data: scriptData
  });
  toast('Script saved', 'success');
}
export async function runAutomationScript() {
  const script = window.cmEditor ? window.cmEditor.state.doc.toString().trim() : (S.currentUnsavedScript || '').trim();
  const language = document.getElementById('auto-language-select').value;
  if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
    toast('Please select module and test case first', 'error');
    return;
  }
  if (!script) {
    toast('Please enter a script', 'error');
    return;
  }
  const tcBefore = S.testCases.find(t => String(t.id) === String(S.selectedAutomationTc) && t.module === S.selectedAutomationModule);
  const oldStatus = tcBefore ? tcBefore.status : null;
  S.automationOutput = `
        <div style="display:flex; align-items:center; gap:8px;">
          <svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> 
          Running automation script...
        </div>
      `;
  S.automationVideo = '';
  render();
  try {
    const response = await fetch('/api/run-automation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testCaseId: S.selectedAutomationTc,
        module: S.selectedAutomationModule,
        script,
        language
      })
    });
    const result = await response.json();
    let videoHtml = '';
    if (result.videoUrl) {
      videoHtml = `
             <video src="${result.videoUrl}" controls autoplay muted style="width:100%; height:100%; object-fit:contain; background:#000; display:block;"></video>
           `;
    } else {
      videoHtml = `
            <div style="padding:16px; width:100%; height:100%; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
              <div style="text-align:center; padding:30px; border:2px dashed var(--border); border-radius:12px; background:var(--bg); transition:all 0.3s; color:var(--text3); width:100%;">
                <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" stroke-width="1.5" fill="none" style="margin-bottom:12px; opacity:0.6; display:inline-block;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <div style="font-size:14px; font-weight:600; color:var(--text2); margin-bottom:4px;">No Video Recorded</div>
                <div style="font-size:12px; max-width:240px; margin:0 auto; line-height:1.6;">Configure <code style="background:var(--bg3); padding:2px 6px; border-radius:4px; font-family:var(--mono);">record_video_dir</code> in Playwright to see playback here.</div>
              </div>
            </div>
           `;
    }
    S.automationVideo = videoHtml;
    if (!response.ok) {
      S.automationOutput = `<div style="color:#ef4444; font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Error: ${result.error || 'Execution failed'}</div><pre style="margin-top:12px; white-space:pre-wrap; font-size:12px; color:var(--text2); line-height:1.5; font-family:inherit;">${result.details || result.output || ''}</pre>`;
      render();
      toast('Script execution failed', 'error');
      return;
    }
    S.automationOutput = `<div style="color:${result.result === 'Pass' ? '#10b981' : '#ef4444'}; font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg> Result: ${result.result}</div><pre style="margin-top:12px; white-space:pre-wrap; font-size:12px; color:var(--text2); line-height:1.5; font-family:inherit;">${result.output || ''}</pre>`;
    render();
    if (tcBefore) {
      const status = result.result;
      const wasActive = oldStatus === 'Fail' || oldStatus === 'Hold';
      const isActive = status === 'Fail' || status === 'Hold';

      // Update test case status globally
      if (tcBefore.status !== status) {
        tcBefore.status = status;
        socket.emit('updateData', {
          type: 'testCase',
          data: tcBefore
        });
        audit(`Automated test changed status of TC ${tcBefore.id} to ${status}`);
      }
      if (isActive && !wasActive) {
        autoCreateBug({
          ...tcBefore,
          status
        });
      }
      if (!isActive && wasActive) {
        const linkedBugs = S.bugs.filter(b => bugRefsTestCaseKeys(b, tcBefore.id, tcBefore.module) && (b.status === 'Open' || b.status === 'Retest Failed' || b.status === 'Escalated'));
        linkedBugs.forEach(linked => {
          linked.status = 'Verified';
          linked.history = linked.history || [];
          const actorName = S.auth.user ? S.auth.user.username || 'SYSTEM' : 'SYSTEM';
          linked.history.push({
            date: now(),
            event: `Bug auto-closed — automated test passed`,
            actor: actorName
          });
          socket.emit('updateData', {
            type: 'bug',
            data: linked
          });
          audit(`Bug ${linked.id} auto-closed (TC ${tcBefore.id} automated pass)`);
        });
      }
    }
    // Skip toast to prevent duplicate with websocket toast
  } catch (error) {
    S.automationOutput = `<div style="color:var(--red); font-weight:600;">Error: ${error.message}</div>`;
    render();
    toast('Script execution failed', 'error');
  }
}
export function initCodeMirror() {
  if (window.cmEditor) return;
  const container = document.getElementById('codemirror-container');
  if (!container || !window.CM) return;
  const langSelect = document.getElementById('auto-language-select');
  const langKey = langSelect ? langSelect.value : 'python';
  const langExt = window.CM.langs[langKey] ? window.CM.langs[langKey]() : window.CM.langs.python();
  window.cmLangCompartment = new window.CM.Compartment();
  window.cmThemeCompartment = new window.CM.Compartment();
  const themeExt = S.currentTheme === 'dark' ? window.CM.themes.oneDark : window.CM.EditorView.theme({});
  const customKeymap = window.CM.keymap.of([{
    key: "Mod-s",
    run: () => {
      saveAutomationScript();
      return true;
    }
  }, {
    key: "Mod-Enter",
    run: () => {
      runAutomationScript();
      return true;
    }
  }]);
  const state = window.CM.EditorState.create({
    doc: S.currentUnsavedScript || '',
    extensions: [window.CM.basicSetup, window.cmLangCompartment.of(langExt), window.cmThemeCompartment.of(themeExt), customKeymap, window.CM.EditorView.updateListener.of(update => {
      if (update.docChanged) {
        S.currentUnsavedScript = update.state.doc.toString();
      }
    })]
  });
  window.cmEditor = new window.CM.EditorView({
    state,
    parent: container
  });
}
export function onAutoLangChange(skipTemplateInjection = false) {
  const langSelect = document.getElementById('auto-language-select');
  const langKey = langSelect ? langSelect.value : 'python';
  S.selectedAutomationLanguage = langKey;
  if (window.cmEditor && window.cmLangCompartment && window.CM.langs[langKey]) {
    window.cmEditor.dispatch({
      effects: window.cmLangCompartment.reconfigure(window.CM.langs[langKey]())
    });
    if (skipTemplateInjection !== true) {
      const templates = {
        python: `from selenium import webdriver\nfrom selenium.webdriver.chrome.options import Options\n# OR: from playwright.sync_api import sync_playwright\n\ntry:\n    # DOCKER REQUIRED OPTIONS (For Selenium):\n    # options = Options()\n    # options.add_argument("--headless=new")\n    # options.add_argument("--no-sandbox")\n    # options.add_argument("--disable-dev-shm-usage")\n    \n    # Your logic here...\n    \n    # IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n    print("PASS")\nexcept Exception as e:\n    print("FAIL")\n    print(str(e))`.trim(),
        javascript: `const { Builder, By } = require("selenium-webdriver");\nconst chrome = require("selenium-webdriver/chrome");\n// OR: const { chromium } = require('playwright');\n\n(async function() {\n  try {\n    // DOCKER REQUIRED OPTIONS (For Selenium):\n    // const options = new chrome.Options();\n    // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\n    \n    // Your logic here...\n    \n    // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n    console.log("PASS");\n  } catch (err) {\n    console.log("FAIL");\n    console.log(err.message);\n  }\n})();`.trim(),
        java: `public class Script {\n    public static void main(String[] args) {\n        try {\n            // DOCKER REQUIRED OPTIONS (For Selenium):\n            // ChromeOptions options = new ChromeOptions();\n            // options.addArguments("--headless=new", "--no-sandbox", "--disable-dev-shm-usage");\n\n            // Your logic here...\n\n            // IMPORTANT: BugOS requires the script to explicitly output PASS or FAIL\n            System.out.println("PASS");\n        } catch (Exception e) {\n            System.out.println("FAIL");\n            e.printStackTrace();\n        }\n    }\n}`.trim()
      };
      S.currentUnsavedScript = templates[langKey] || '';
      window.cmEditor.dispatch({
        changes: {
          from: 0,
          to: window.cmEditor.state.doc.length,
          insert: S.currentUnsavedScript
        }
      });
    }
  }
}

// ─────────────────────────── MODULES ───────────────────────────
export
// ─────────────────────────── MODALS ───────────────────────────
function updateAutoTcId() {
  const mod = document.getElementById('f-mod').value;
  let count = S.testCases.filter(t => t.module === mod).length + 1;
  let newId = 'TC-' + count;
  while (S.testCases.some(t => t.module === mod && t.id === newId)) {
    count++;
    newId = 'TC-' + count;
  }
  const idField = document.getElementById('f-id');
  if (idField) {
    idField.value = newId;
  }
}