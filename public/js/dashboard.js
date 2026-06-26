import { S } from './state.js';
import { toggleHmModDropdown, toggleHmModFilter, removeHmModFilter, clearHmModFilter, toggleDashModDropdown, toggleDashModFilter, removeDashModFilter, clearDashModFilter, textMatchesQuery, render } from './app.js';
import { formatDate, now, statusBadge, sevBadge, nav } from './utils.js';

export
  // ─────────────────────────── MODULE-WISE TRACKER ───────────────────────────
  function buildModuleTracker() {
  // Collect all dates with data
  const allDates = new Set();
  S.testCases.forEach(tc => {
    if (tc.createdAt) {
      const date = tc.createdAt.split(' ')[0];
      allDates.add(date);
    }
  });
  S.bugs.forEach(bug => {
    if (bug.fixedAt) {
      const date = bug.fixedAt.split(' ')[0];
      allDates.add(date);
    }
    if (bug.retestAt) {
      const date = bug.retestAt.split(' ')[0];
      allDates.add(date);
    }
  });

  // Sort dates
  let dates = Array.from(allDates).sort();
  if (dates.length === 0) {
    // Generate last 7 days if no data
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
  } else if (dates.length > 14) {
    dates = dates.slice(-14);
  }

  // Build data structure: date -> metric -> {module: count}
  const chartData = {};
  dates.forEach(date => {
    chartData[date] = {
      testCreated: {},
      bugFixed: {},
      retestDone: {}
    };
  });

  // Count test cases created per module per date
  S.testCases.forEach(tc => {
    if (tc.createdAt && tc.module) {
      const date = tc.createdAt.split(' ')[0];
      if (chartData[date]) {
        if (!chartData[date].testCreated[tc.module]) chartData[date].testCreated[tc.module] = 0;
        chartData[date].testCreated[tc.module]++;
      }
    }
  });

  // Count bugs fixed per module per date
  S.bugs.forEach(bug => {
    if (bug.fixedAt && bug.module) {
      const date = bug.fixedAt.split(' ')[0];
      if (chartData[date]) {
        if (!chartData[date].bugFixed[bug.module]) chartData[date].bugFixed[bug.module] = 0;
        chartData[date].bugFixed[bug.module]++;
      }
    }
  });

  // Count retests done per module per date
  S.bugs.forEach(bug => {
    if (bug.retestAt && bug.module) {
      const date = bug.retestAt.split(' ')[0];
      if (chartData[date]) {
        if (!chartData[date].retestDone[bug.module]) chartData[date].retestDone[bug.module] = 0;
        chartData[date].retestDone[bug.module]++;
      }
    }
  });

  // Calculate totals and find max value
  const totals = {};
  dates.forEach(date => {
    totals[date] = {
      testCreated: Object.values(chartData[date].testCreated).reduce((a, b) => a + b, 0),
      bugFixed: Object.values(chartData[date].bugFixed).reduce((a, b) => a + b, 0),
      retestDone: Object.values(chartData[date].retestDone).reduce((a, b) => a + b, 0)
    };
  });
  let maxValue = 0;
  Object.values(totals).forEach(dayData => {
    maxValue = Math.max(maxValue, dayData.testCreated, dayData.bugFixed, dayData.retestDone);
  });
  maxValue = Math.max(maxValue, 5);

  // Generate interactive SVG chart
  const chartHeight = 500;
  const padding = 80;
  const leftPad = padding + 6; // move chart start slightly right of Y-axis
  const rightPad = 20; // small right margin
  const barGroupWidth = 80; // fixed gap between dates
  const requiredGraphWidth = dates.length * barGroupWidth;
  const graphHeight = chartHeight - padding * 2;
  const barWidth = 12; // wider bars
  const barGap = 4; // gap between bars within a date
  const minChartWidth = leftPad + requiredGraphWidth + padding + rightPad;
  let chartSVG = `<svg width="100%" height="${chartHeight}" style="min-width:${minChartWidth}px; border:1px solid var(--border);border-radius:var(--radius);background:var(--bg2);overflow:visible;cursor:default;">`;

  // Background grid
  for (let i = 0; i <= 5; i++) {
    const y = padding + graphHeight / 5 * i;
    const value = Math.round(maxValue * (5 - i) / 5);
    chartSVG += `<line x1="${leftPad}" y1="${y}" x2="100%" y2="${y}" stroke="var(--border)" stroke-dasharray="2,2" stroke-width="0.5"/>`;
    chartSVG += `<text x="${leftPad - 10}" y="${y + 4}" font-size="11" fill="var(--text3)" text-anchor="end">${value}</text>`;
  }

  // Y-axis (moved to leftPad)
  chartSVG += `<line x1="${leftPad}" y1="${padding}" x2="${leftPad}" y2="${chartHeight - padding}" stroke="var(--border)" stroke-width="1.5"/>`;
  chartSVG += `<text x="40" y="${chartHeight / 2}" font-size="12" fill="var(--text3)" text-anchor="middle" transform="rotate(-90 40 ${chartHeight / 2})">Work Count</text>`;

  // X-axis
  chartSVG += `<line x1="${leftPad}" y1="${chartHeight - padding}" x2="100%" y2="${chartHeight - padding}" stroke="var(--border)" stroke-width="1.5"/>`;
  chartSVG += `<text x="50%" y="${chartHeight - padding + 40}" font-size="12" fill="var(--text3)" text-anchor="middle">Dates</text>`;

  // Draw bars for each date
  dates.forEach((date, dateIdx) => {
    const baseX = leftPad + dateIdx * barGroupWidth;
    const centerX = baseX + barGroupWidth / 2;
    const testCount = totals[date].testCreated;
    const fixCount = totals[date].bugFixed;
    const retestCount = totals[date].retestDone;

    // Bar 1: Test Created (Blue)
    let testHeight = testCount / maxValue * graphHeight;
    let testY = chartHeight - padding - testHeight;
    const testX1 = centerX - barWidth - barGap;
    if (!testHeight || testHeight < 2) {
      testHeight = 2;
      testY = chartHeight - padding - testHeight;
      chartSVG += `<rect x="${testX1}" y="${testY}" width="${barWidth}" height="${testHeight}" fill="var(--accent)" opacity="0.35" class="bar-test zero" data-date="${date}" data-metric="testCreated" data-count="${testCount}" style="cursor:pointer;"/>`;
    } else {
      chartSVG += `<rect x="${testX1}" y="${testY}" width="${barWidth}" height="${testHeight}" fill="var(--accent)" opacity="0.85" class="bar-test" data-date="${date}" data-metric="testCreated" data-count="${testCount}" style="cursor:pointer;"/>`;
    }

    // Bar 2: Bug Fixed (Green)
    let fixHeight = fixCount / maxValue * graphHeight;
    let fixY = chartHeight - padding - fixHeight;
    const fixX = centerX;
    if (!fixHeight || fixHeight < 2) {
      fixHeight = 2;
      fixY = chartHeight - padding - fixHeight;
      chartSVG += `<rect x="${fixX}" y="${fixY}" width="${barWidth}" height="${fixHeight}" fill="var(--green)" opacity="0.35" class="bar-fix zero" data-date="${date}" data-metric="bugFixed" data-count="${fixCount}" style="cursor:pointer;"/>`;
    } else {
      chartSVG += `<rect x="${fixX}" y="${fixY}" width="${barWidth}" height="${fixHeight}" fill="var(--green)" opacity="0.85" class="bar-fix" data-date="${date}" data-metric="bugFixed" data-count="${fixCount}" style="cursor:pointer;"/>`;
    }

    // Bar 3: Retest Done (Orange)
    let retestHeight = retestCount / maxValue * graphHeight;
    let retestY = chartHeight - padding - retestHeight;
    const retestX = centerX + barWidth + barGap;
    if (!retestHeight || retestHeight < 2) {
      retestHeight = 2;
      retestY = chartHeight - padding - retestHeight;
      chartSVG += `<rect x="${retestX}" y="${retestY}" width="${barWidth}" height="${retestHeight}" fill="var(--orange)" opacity="0.35" class="bar-retest zero" data-date="${date}" data-metric="retestDone" data-count="${retestCount}" style="cursor:pointer;"/>`;
    } else {
      chartSVG += `<rect x="${retestX}" y="${retestY}" width="${barWidth}" height="${retestHeight}" fill="var(--orange)" opacity="0.85" class="bar-retest" data-date="${date}" data-metric="retestDone" data-count="${retestCount}" style="cursor:pointer;"/>`;
    }

    // Date label on X-axis
    chartSVG += `<text x="${centerX}" y="${chartHeight - padding + 25}" font-size="11" fill="var(--text3)" text-anchor="middle">${formatDate(date)}</text>`;
  });
  chartSVG += `</svg>`;

  // Legend and instructions
  const legend = `
        <div style="display:flex;gap:24px;margin-top:16px;flex-wrap:wrap;padding:12px;background:var(--bg3);border-radius:var(--radius);align-items:center;justify-content:center;">
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--accent);border-radius:2px;"></div>
              <span style="font-size:12px;">Test Cases Created</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--green);border-radius:2px;"></div>
              <span style="font-size:12px;">Bugs Fixed</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:12px;height:12px;background:var(--orange);border-radius:2px;"></div>
              <span style="font-size:12px;">Retests Done</span>
            </div>
          </div>
        </div>
      `;

  // Tooltip container
  const tooltipId = 'moduleTrackerTooltip_' + Math.random().toString(36).substr(2, 9);
  const tooltip = `<div id="${tooltipId}" style="position:fixed;background:color-mix(in srgb, var(--bg3) 90%, transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px;max-width:300px;z-index:9999;display:none;box-shadow:0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px var(--border);pointer-events:none;transition:opacity 0.15s ease, transform 0.15s ease;transform:translateY(4px);opacity:0;"></div>`;
  const html = `<div style="position:relative;overflow-x:auto;padding:16px;background:var(--bg3);border-radius:var(--radius);">
        ${chartSVG}
        ${tooltip}
        ${legend}
      </div>`;

  // Setup event listeners after the DOM is rendered
  setTimeout(() => {
    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) return;
    const parent = tooltip.parentElement;
    const chart = parent.querySelector('svg');
    if (!chart) return;
    const bars = chart.querySelectorAll('rect[data-metric]');
    bars.forEach(bar => {
      bar.addEventListener('mouseenter', function (e) {
        const date = this.getAttribute('data-date');
        const metric = this.getAttribute('data-metric');
        const count = parseInt(this.getAttribute('data-count'));

        // Get module breakdown from our data
        let moduleBreakdown = [];
        const metrics = {
          'testCreated': 'Test Cases Created',
          'bugFixed': 'Bugs Fixed',
          'retestDone': 'Retests Done'
        };

        // Build breakdown from stored data
        if (metric === 'testCreated') {
          const tcs = S.testCases.filter(tc => tc.module && tc.createdAt && tc.createdAt.split(' ')[0] === date);
          const modCounts = {};
          tcs.forEach(tc => {
            modCounts[tc.module] = (modCounts[tc.module] || 0) + 1;
          });
          moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
        } else if (metric === 'bugFixed') {
          const bugs = S.bugs.filter(b => b.module && b.fixedAt && b.fixedAt.split(' ')[0] === date);
          const modCounts = {};
          bugs.forEach(b => {
            modCounts[b.module] = (modCounts[b.module] || 0) + 1;
          });
          moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
        } else if (metric === 'retestDone') {
          const bugs = S.bugs.filter(b => b.module && b.retestAt && b.retestAt.split(' ')[0] === date);
          const modCounts = {};
          bugs.forEach(b => {
            modCounts[b.module] = (modCounts[b.module] || 0) + 1;
          });
          moduleBreakdown = Object.entries(modCounts).sort((a, b) => b[1] - a[1]);
        }
        let html = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent);"></div>';
        html += '<div style="font-weight:700;font-size:13px;color:var(--text);">' + metrics[metric] + '</div>';
        html += '</div>';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;margin-bottom:12px;background:var(--bg2);padding:6px 8px;border-radius:6px;border:1px solid var(--border);">';
        html += '<span><span style="color:var(--text);font-weight:600;margin-right:4px;">Date:</span><span style="color:var(--text2);">' + formatDate(date) + '</span></span>';
        html += '<span><span style="color:var(--text);font-weight:600;margin-right:4px;">Total:</span><span style="color:var(--text2);font-family:var(--mono);font-weight:600;">' + count + '</span></span>';
        html += '</div>';
        html += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);font-weight:700;margin-bottom:6px;">Module Breakdown</div>';
        html += '<div style="display:flex;flex-direction:column;gap:4px;">';
        if (moduleBreakdown.length > 0) {
          moduleBreakdown.forEach(([mod, cnt]) => {
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text);">';
            html += '<span style="font-size:12px;">' + mod + '</span>';
            html += '<span style="font-family:var(--mono);font-weight:700;font-size:13px;background:var(--bg2);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">' + cnt + '</span>';
            html += '</div>';
          });
        } else {
          html += '<div style="color:var(--text3);font-size:12px;padding:4px 0;">No data</div>';
        }
        html += '</div>';
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        setTimeout(() => {
          tooltip.style.opacity = '1';
          tooltip.style.transform = 'translateY(0)';
        }, 10);
        const rect = this.getBoundingClientRect();
        let tooltipX = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
        let tooltipY = rect.top - tooltip.offsetHeight - 10;
        if (tooltipY < 10) {
          tooltipY = rect.bottom + 10;
        }
        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
      });
      bar.addEventListener('mouseleave', function () {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(4px)';
        setTimeout(() => {
          tooltip.style.display = 'none';
        }, 150);
      });
    });
  }, 100);
  return html;
}
export function buildModuleHeatmap() {
  const hmModFilter = S.hmModFilter || [];
  const displayedModules = hmModFilter.length > 0 ? S.modules.filter(m => hmModFilter.includes(m)) : S.modules;
  let maxPass = 1,
    maxFail = 1,
    maxHold = 1;
  const modData = displayedModules.map(mod => {
    const tcs = S.testCases.filter(t => t.module === mod);
    const p = tcs.filter(t => t.status === 'Pass').length;
    const f = tcs.filter(t => t.status === 'Fail').length;
    const h = tcs.filter(t => t.status === 'Hold').length;
    maxPass = Math.max(maxPass, p);
    maxFail = Math.max(maxFail, f);
    maxHold = Math.max(maxHold, h);
    return {
      mod,
      p,
      f,
      h
    };
  });
  const modHeaders = displayedModules.map(m => `<div style="padding:10px 4px 4px 4px; font-size:11px; color:var(--text3); text-transform:uppercase; letter-spacing:0.06em; background:var(--bg2); display:flex; align-items:flex-start; justify-content:center; text-align:center; min-height:100px;"><span style="writing-mode:vertical-rl; transform:rotate(180deg);">${m}</span></div>`).join('');
  if (!window.hmHover) {
    window.hmHover = function (e, id, mod, status, count) {
      const tt = document.getElementById(id);
      if (tt) {
        const color = status === 'Pass' ? 'var(--green)' : status === 'Fail' ? 'var(--red)' : 'var(--orange)';
        const html = `
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text3);margin-bottom:6px;font-weight:700;">${mod}</div>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};"></div>
                  <span style="font-size:14px;color:var(--text);font-weight:600;">${status}</span>
                </div>
                <span style="font-family:var(--mono);font-size:14px;font-weight:700;background:var(--bg2);padding:2px 8px;border-radius:6px;border:1px solid var(--border);">${count}</span>
              </div>
            `;
        tt.innerHTML = html;
        tt.style.display = 'block';
        setTimeout(() => {
          tt.style.opacity = '1';
          tt.style.transform = 'translateY(0)';
        }, 10);
        let left = e.clientX + 15;
        let top = e.clientY + 15;
        if (left + tt.offsetWidth > window.innerWidth) left = e.clientX - tt.offsetWidth - 15;
        if (top + tt.offsetHeight > window.innerHeight) top = e.clientY - tt.offsetHeight - 15;
        tt.style.left = left + 'px';
        tt.style.top = top + 'px';
      }
    };
    window.hmLeave = function (id) {
      const tt = document.getElementById(id);
      if (tt) {
        tt.style.opacity = '0';
        tt.style.transform = 'translateY(4px)';
        setTimeout(() => {
          tt.style.display = 'none';
        }, 150);
      }
    };
  }
  const tooltipId = 'hmTooltip_' + Math.random().toString(36).substr(2, 9);
  const tooltipHTML = `<div id="${tooltipId}" style="position:fixed;background:color-mix(in srgb, var(--bg3) 90%, transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:12px 14px;z-index:9999;display:none;box-shadow:0 10px 30px rgba(0,0,0,0.15), 0 0 0 1px var(--border);pointer-events:none;white-space:nowrap;transition:opacity 0.15s ease, transform 0.15s ease;transform:translateY(4px);opacity:0;"></div>`;
  const passRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Pass</div>` + modData.map(d => {
    const pPct = d.p ? Math.max(8, Math.round(d.p / maxPass * 100)) : 0;
    return `<div style="background:color-mix(in srgb, var(--green) ${pPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod}', 'Pass', ${d.p})" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
  }).join('');
  const failRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Fail</div>` + modData.map(d => {
    const fPct = d.f ? Math.max(8, Math.round(d.f / maxFail * 100)) : 0;
    return `<div style="background:color-mix(in srgb, var(--red) ${fPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod}', 'Fail', ${d.f})" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
  }).join('');
  const holdRow = `<div style="padding:10px 16px; background:var(--bg2); font-size:12px; font-weight:normal; color:var(--text); display:flex; align-items:center; justify-content:center; text-align:center;">Hold</div>` + modData.map(d => {
    const hPct = d.h ? Math.max(8, Math.round(d.h / maxHold * 100)) : 0;
    return `<div style="background:color-mix(in srgb, var(--orange) ${hPct}%, var(--bg)); min-height:45px; transition:background 0.3s; cursor:crosshair; box-sizing:border-box;" onmousemove="window.hmHover(event, '${tooltipId}', '${d.mod}', 'Hold', ${d.h})" onmouseleave="window.hmLeave('${tooltipId}')"></div>`;
  }).join('');
  return `
      ${tooltipHTML}
      <div style="padding:24px; overflow-x:auto;">
        <div style="display:grid; grid-template-columns: 80px repeat(${displayedModules.length}, minmax(40px, 1fr)); gap:0; background:transparent; border:none; overflow:hidden; min-width:max-content; border-radius:var(--radius);">
          ${passRow}
          ${failRow}
          ${holdRow}
          <div style="background:transparent; min-height:100px;"></div>
          ${modHeaders}
        </div>
      </div>
      `;
}

// ─────────────────────────── DASHBOARD ───────────────────────────
export function buildDashboard() {
  const dashModFilter = S.dashModFilter || [];
  const dashStF = (document.getElementById('dashStF') || {
    value: ''
  }).value;
  const dashQ = (document.getElementById('dashQ') || {
    value: ''
  }).value.toLowerCase();
  const dashBugStF = (document.getElementById('dashBugStF') || {
    value: ''
  }).value;
  const modHealthF = (document.getElementById('modHealthF') || {
    value: ''
  }).value || (S.modules.length ? S.modules[0] : '');
  const workPendingModF = (document.getElementById('workPendingModF') || {
    value: ''
  }).value;
  let tData = [...S.testCases];
  if (dashModFilter.length > 0) tData = tData.filter(t => dashModFilter.includes(t.module));
  if (dashStF) tData = tData.filter(t => t.status === dashStF);
  if (dashQ) {
    tData = tData.filter(t => [t.id, t.testCase, t.scenario, t.module, t.screen, t.steps, t.testData, t.expected, t.actual, t.notes, t.evidence, t.status, t.severity].some(v => textMatchesQuery(v, dashQ)));
  }
  let bData = [...S.bugs];
  if (dashModFilter.length > 0) bData = bData.filter(b => dashModFilter.includes(b.module));
  if (dashBugStF) bData = bData.filter(b => b.status === dashBugStF);
  if (dashQ) {
    bData = bData.filter(b => [b.id, b.tcId, b.testCase, b.module, b.screen, b.status, b.severity, b.devNotes, b.escalationReason].some(v => textMatchesQuery(v, dashQ)));
  }
  const total = tData.length;
  const pass = tData.filter(t => t.status === 'Pass').length;
  const fail = tData.filter(t => t.status === 'Fail').length;
  const hold = tData.filter(t => t.status === 'Hold').length;
  const openBugs = bData.filter(b => b.status === 'Open').length;
  const escalatedBugs = bData.filter(b => b.status === 'Escalated').length;
  const retestBugs = bData.filter(b => b.status === 'Fixed').length;
  const pct = total ? Math.round(pass / total * 100) : 0;
  const totH = tData.filter(t => t.severity === 'High').length;
  const totM = tData.filter(t => t.severity === 'Medium').length;
  const totL = tData.filter(t => t.severity === 'Low').length;
  const passH = tData.filter(t => t.status === 'Pass' && t.severity === 'High').length;
  const passM = tData.filter(t => t.status === 'Pass' && t.severity === 'Medium').length;
  const passL = tData.filter(t => t.status === 'Pass' && t.severity === 'Low').length;
  const retestH = bData.filter(b => b.status === 'Fixed' && b.severity === 'High').length;
  const retestM = bData.filter(b => b.status === 'Fixed' && b.severity === 'Medium').length;
  const retestL = bData.filter(b => b.status === 'Fixed' && b.severity === 'Low').length;
  const modList = dashModFilter.length > 0 ? dashModFilter : S.modules;
  const modSummary = modList.map(mod => {
    const tcs = tData.filter(t => t.module === mod);
    const p = tcs.filter(t => t.status === 'Pass').length;
    const f = tcs.filter(t => t.status === 'Fail').length;
    const ob = bData.filter(b => b.module === mod && b.status === 'Open').length;
    const pp = tcs.length ? Math.round(p / tcs.length * 100) : 0;
    return `<tr>
      <td class="td-title">${mod}</td>
      <td>${tcs.length}</td>
      <td style="color:var(--green)">${p}</td>
      <td style="color:var(--red)">${f}</td>
      <td style="color:${ob > 0 ? 'var(--red)' : 'var(--green)'}">${ob}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="flex:1;height:5px;background:var(--bg4);border-radius:3px;min-width:80px;">
            <div style="width:${pp}%;height:100%;background:${pp > 70 ? 'var(--green)' : pp > 40 ? 'var(--yellow)' : 'var(--red)'};border-radius:3px;"></div>
          </div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text3)">${pp}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
  const recentBugs = [...bData].slice(0, 5).map(b => `<tr>
    <td class="td-id">${b.id}</td>
    <td class="td-title">${b.testCase}</td>
    <td>${b.module}</td>
    <td>${sevBadge(b.severity)}</td>
    <td>${statusBadge(b.status)}</td>
    <td class="date-col">${formatDate(b.failedAt)}</td>
  </tr>`).join('');

  // Module health donut chart data
  const selectedMod = modHealthF || S.modules[0] || '';
  const modTcs = selectedMod ? S.testCases.filter(t => t.module === selectedMod) : [];
  const modPass = modTcs.filter(t => t.status === 'Pass').length;
  const modFail = modTcs.filter(t => t.status === 'Fail').length;
  const modHold = modTcs.filter(t => t.status === 'Hold').length;
  const modTotal = modTcs.length;
  const modPassPct = modTotal > 0 ? Math.round(modPass / modTotal * 100) : 0;
  const modFailPct = modTotal > 0 ? Math.round(modFail / modTotal * 100) : 0;
  const modHoldPct = modTotal > 0 ? 100 - modPassPct - modFailPct : 0;

  // Work pending pie chart data
  let wpData = [...S.bugs];
  if (workPendingModF) wpData = wpData.filter(b => b.module === workPendingModF);
  const devWork = wpData.filter(b => b.status === 'Open' || b.status === 'Escalated').length;
  const qaWork = wpData.filter(b => b.status === 'Fixed').length;
  const totalWork = devWork + qaWork;
  const devPct = totalWork > 0 ? Math.round(devWork / totalWork * 100) : 0;
  const qaPct = totalWork > 0 ? 100 - devPct : 0;

  // Calculate pie chart path data
  const devAngle = devPct / 100 * 360;
  const devRad = devAngle * Math.PI / 180;
  const devX = 100 + 80 * Math.cos(devRad - Math.PI / 2);
  const devY = 100 + 80 * Math.sin(devRad - Math.PI / 2);
  const devLargeArc = devAngle > 180 ? 1 : 0;
  const devPath = devPct === 100 ? `M 100 100 L 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z` : `M 100 100 L 100 20 A 80 80 0 ${devLargeArc} 1 ${devX} ${devY} Z`;
  const qaStartAngle = devAngle;
  const qaRad = (qaStartAngle + qaPct / 100 * 360) * Math.PI / 180;
  const qaX = 100 + 80 * Math.cos(qaRad - Math.PI / 2);
  const qaY = 100 + 80 * Math.sin(qaRad - Math.PI / 2);
  const qaLargeArc = qaPct > 50 ? 1 : 0;
  const qaPath = qaPct === 100 ? `M 100 100 L 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z` : qaPct > 0 ? `M 100 100 L ${devX} ${devY} A 80 80 0 ${qaLargeArc} 1 100 20 Z` : '';

  // Check if data changed to conditionally trigger animations
  const hData = `${modPass},${modFail},${modHold}`;
  const animH = !S._lastHData || S._lastHData !== hData;
  S._lastHData = hData;
  const wpDataStr = `${devWork},${qaWork}`;
  const animWP = !S._lastWPData || S._lastWPData !== wpDataStr;
  S._lastWPData = wpDataStr;
  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
      <div style="font-size:28px;font-weight:700;color:var(--text); letter-spacing:-0.02em;">BUG OS Dashboard</div>
      
    </div>
  <div class="section" style="overflow:visible;">
    <div class="section-hdr" style="overflow:visible; align-items:center; border-bottom:none; padding-bottom:16px;">
      <div class="section-title" style="margin-top:0;">KPI Filter</div>
      <div class="filters" style="display:flex; gap:12px; align-items:center; overflow:visible;">
        <div id="dashModFilterContainer" style="position:relative; width:350px; font-size:12px; font-family:var(--font);">
          <div onclick="window.toggleDashModDropdown(event)" style="border:1px solid var(--btn-border); border-radius:var(--radius); padding:4px 32px 4px 8px; min-height:28px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg3); align-items:center; transition: border-color 0.15s;" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--btn-border)'">
            ${!S.dashModFilter || S.dashModFilter.length === 0 ? `<span style="color:var(--text3); padding:0px;">Select KPI modules...</span>` : S.dashModFilter.map(m => `
              <div style="background:rgba(34, 197, 94, 0.1); border:1px solid rgba(34, 197, 94, 0.3); color:var(--green); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
                <span style="font-weight:600;">${m}</span>
                <span style="cursor:pointer; font-weight:bold; font-size:11px; opacity:0.8;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'" onclick="window.removeDashModFilter(event, '${m}')">×</span>
              </div>
            `).join('')}
            <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
              ${S.dashModFilter && S.dashModFilter.length > 0 ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearDashModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
              <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          <div id="dashModDropdown" style="display:${S.dashModDropdownOpen ? 'block' : 'none'}; position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); max-height:250px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px 0;">
            ${S.modules.map(m => {
    const isSel = (S.dashModFilter || []).includes(m);
    return `
              <div class="custom-select-option" onclick="window.toggleDashModFilter(event, '${m}')" style="display:flex; align-items:center; padding:8px 12px; transition:all 0.2s; ${isSel ? 'background:rgba(59, 130, 246, 0.08); color:var(--accent); font-weight:600;' : 'color:var(--text2);'}">
                <div style="width:16px; height:16px; flex-shrink:0; border-radius:50%; border:2px solid ${isSel ? 'var(--accent)' : 'var(--text3)'}; background:${isSel ? 'var(--accent)' : 'transparent'}; margin-right:12px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                  ${isSel ? `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
                </div>
                <span>${m}</span>
              </div>
            `;
  }).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:24px; margin-bottom:32px;">
    <!-- Card 1 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(0,0,0,0.08)';this.style.borderColor='var(--accent)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--text2); text-transform:uppercase; letter-spacing:0.8px;">Total Test Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${total}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${totL}</span></div>
      </div>
    </div>
    <!-- Card 2 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(22, 163, 74, 0.12)';this.style.borderColor='var(--green)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--green); text-transform:uppercase; letter-spacing:0.8px;">Total Passed Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--green); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${pass}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${passL}</span></div>
      </div>
    </div>
    <!-- Card 3 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(220, 38, 38, 0.12)';this.style.borderColor='var(--red)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--red); text-transform:uppercase; letter-spacing:0.8px;">Total Failed Cases</div>
      <div style="font-size:42px; font-weight:800; color:var(--red); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${fail + hold}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">Fail</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${fail}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Hold</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${hold}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; opacity:0; pointer-events:none;"><span style="font-weight:600;">Hidden</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">0</span></div>
      </div>
    </div>
    <!-- Card 4 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(245, 158, 11, 0.12)';this.style.borderColor='var(--orange)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--orange); text-transform:uppercase; letter-spacing:0.8px;">Bug Queue</div>
      <div style="font-size:42px; font-weight:800; color:var(--text); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${openBugs + retestBugs + escalatedBugs}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Open</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${openBugs}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Fixed</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestBugs}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--orange); font-weight:600;">Escalated</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${escalatedBugs}</span></div>
      </div>
    </div>
    <!-- Card 5 -->
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:24px; padding:24px; box-shadow:0 8px 32px rgba(0,0,0,0.04); display:flex; flex-direction:column; gap:12px; transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor:default;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 16px 48px rgba(168, 85, 247, 0.12)';this.style.borderColor='var(--purple)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 8px 32px rgba(0,0,0,0.04)';this.style.borderColor='var(--border)'">
      <div style="font-size:12px; font-weight:700; color:var(--purple); text-transform:uppercase; letter-spacing:0.8px;">Retest Queue</div>
      <div style="font-size:42px; font-weight:800; color:var(--purple); line-height:1; font-family:var(--mono); letter-spacing:-1px;">${retestBugs}</div>
      <div style="margin-top:auto; padding-top:12px; border-top:1px solid var(--border); display:flex; flex-direction:column; gap:6px;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--red); font-weight:600;">High</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestH}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--yellow); font-weight:600;">Medium</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestM}</span></div>
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span style="color:var(--green); font-weight:600;">Low</span><span style="font-weight:700; font-family:var(--mono); color:var(--text);">${retestL}</span></div>
      </div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">Module Health</div>
        <select class="filter-select" id="modHealthF" style="border-color: var(--border);" onchange="render()">
          ${S.modules.map(m => `<option value="${m}"${modHealthF === m ? ' selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;">
          <defs>
            <mask id="donutFillMask">
              <circle cx="100" cy="100" r="80" fill="none" stroke="white" stroke-width="20" stroke-dasharray="502.7 502.7" stroke-dashoffset="${animH ? '502.7' : '0'}" transform="rotate(-90 100 100)">
                ${animH ? '<animate attributeName="stroke-dashoffset" from="502.7" to="0" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />' : ''}
              </circle>
            </mask>
          </defs>
          <g mask="url(#donutFillMask)">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--green)" stroke-width="20" stroke-dasharray="${modPassPct * 5.03} 502.4" stroke-dashoffset="0" transform="rotate(-90 100 100)"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--red)" stroke-width="20" stroke-dasharray="${modFailPct * 5.03} 502.4" stroke-dashoffset="${-modPassPct * 5.03}" transform="rotate(-90 100 100)"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--yellow)" stroke-width="20" stroke-dasharray="${modHoldPct * 5.03} 502.4" stroke-dashoffset="${-(modPassPct + modFailPct) * 5.03}" transform="rotate(-90 100 100)"/>
          </g>
          <circle cx="100" cy="100" r="50" fill="var(--bg2)"/>
          <g>
            <text x="100" y="95" text-anchor="middle" font-size="24" font-weight="600" fill="var(--text)" font-family="var(--mono)" opacity="${animH ? '0' : '1'}">${modPassPct}%${animH ? '<animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" /><animate attributeName="y" from="105" to="95" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />' : ''}</text>
            <text x="100" y="115" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--text3)" font-family="var(--mono)" opacity="${animH ? '0' : '1'}">Pass Rate${animH ? '<animate attributeName="opacity" from="0" to="1" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" /><animate attributeName="y" from="125" to="115" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />' : ''}</text>
          </g>
        </svg>
        <div style="margin-left:24px;font-size:13px;line-height:1.8;">
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;margin-right:8px;"></span>Pass: ${modPass} - ${modPassPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--red);border-radius:2px;margin-right:8px;"></span>Fail: ${modFail} - ${modFailPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--yellow);border-radius:2px;margin-right:8px;"></span>Hold: ${modHold} - ${modHoldPct}%</div>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-hdr">
        <div class="section-title">Work Pending</div>
        <select class="filter-select" id="workPendingModF" style="border-color: var(--border);" onchange="render()">
          <option value="">All Modules</option>
          ${S.modules.map(m => `<option value="${m}"${workPendingModF === m ? ' selected' : ''}>${m}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;padding:24px;">
        <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;">
          <defs>
            <mask id="pieFillMask">
              <circle cx="100" cy="100" r="50" fill="none" stroke="white" stroke-width="100" stroke-dasharray="314.2 314.2" stroke-dashoffset="${animWP ? '314.2' : '0'}" transform="rotate(-90 100 100)">
                ${animWP ? '<animate attributeName="stroke-dashoffset" from="314.2" to="0" dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1" />' : ''}
              </circle>
            </mask>
          </defs>
          <g mask="url(#pieFillMask)">
            ${totalWork > 0 ? `
            ${devPct > 0 ? `<path d="${devPath}" fill="var(--purple)"/>` : ''}
            ${qaPath ? `<path d="${qaPath}" fill="var(--green)"/>` : ''}
            ` : ''}
          </g>
        </svg>
        <div style="margin-left:24px;font-size:13px;line-height:1.8;">
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--purple);border-radius:2px;margin-right:8px;"></span>Dev Team: ${devWork} Items - ${devPct}%</div>
          <div><span style="display:inline-block;width:12px;height:12px;background:var(--green);border-radius:2px;margin-right:8px;"></span>QA Team: ${qaWork} Items - ${qaPct}%</div>
        </div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-hdr"><div class="section-title">Module-wise Work Tracker</div></div>
    ${buildModuleTracker()}
  </div>
  <div class="section">
    <div class="section-hdr" style="overflow:visible;">
      <div class="section-title">Module Health Heatmap</div>
      <div id="hmModFilterContainer" style="position:relative; width:350px; font-size:12px; font-family:var(--font);">
        <div onclick="window.toggleHmModDropdown(event)" style="border:1px solid var(--btn-border); border-radius:var(--radius); padding:4px 32px 4px 8px; min-height:28px; display:flex; flex-wrap:wrap; gap:4px; cursor:pointer; background:var(--bg3); align-items:center; transition: border-color 0.15s;" onmouseover="this.style.borderColor='var(--border2)'" onmouseout="this.style.borderColor='var(--btn-border)'">
          ${!S.hmModFilter || S.hmModFilter.length === 0 ? `<span style="color:var(--text3); padding:0px;">Select modules...</span>` : S.hmModFilter.map(m => `
            <div style="background:rgba(34, 197, 94, 0.1); border:1px solid rgba(34, 197, 94, 0.3); color:var(--green); border-radius:4px; padding:2px 6px; display:flex; align-items:center; gap:6px;">
              <span style="font-weight:600;">${m}</span>
              <span style="cursor:pointer; font-weight:bold; font-size:11px; opacity:0.8;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'" onclick="window.removeHmModFilter(event, '${m}')">×</span>
            </div>
          `).join('')}
          <div style="position:absolute; right:8px; top:50%; transform:translateY(-50%); display:flex; gap:4px; align-items:center;">
            ${S.hmModFilter && S.hmModFilter.length > 0 ? `<span style="cursor:pointer; font-size:14px; color:var(--text3);" onclick="window.clearHmModFilter(event)">×</span> <span style="color:var(--border);">|</span>` : ''}
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
        <div id="hmModDropdown" style="display:${S.hmModDropdownOpen ? 'block' : 'none'}; position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--bg2); border:1px solid var(--border); border-radius:var(--radius); max-height:250px; overflow-y:auto; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.15); padding:4px 0;">
          ${S.modules.map(m => {
    const isSel = (S.hmModFilter || []).includes(m);
    return `
            <div class="custom-select-option" onclick="window.toggleHmModFilter(event, '${m}')" style="display:flex; align-items:center; padding:8px 12px; transition:all 0.2s; ${isSel ? 'background:rgba(59, 130, 246, 0.08); color:var(--accent); font-weight:600;' : 'color:var(--text2);'}">
              <div style="width:16px; height:16px; flex-shrink:0; border-radius:50%; border:2px solid ${isSel ? 'var(--accent)' : 'var(--text3)'}; background:${isSel ? 'var(--accent)' : 'transparent'}; margin-right:12px; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                ${isSel ? `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
              </div>
              <span>${m}</span>
            </div>
          `;
  }).join('')}
        </div>
      </div>
    </div>
    ${buildModuleHeatmap()}
  </div>
  <div class="section">
    <div class="section-hdr"><div class="section-title">Recent Bug Reports</div><button class="btn btn-ghost btn-sm" onclick="nav('bugs')">View all →</button></div>
    <div class="tbl-wrap"><table><thead><tr><th>Bug ID</th><th>Test Case</th><th>Module</th><th>Severity</th><th>Status</th><th>Failed On</th></tr></thead><tbody>${recentBugs || '<tr><td colspan="6" class="empty">No bugs yet</td></tr>'}</tbody></table></div>
  </div>`;
}

// ─────────────────────────── TEST CASES ───────────────────────────