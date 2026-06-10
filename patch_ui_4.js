const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

const oldFunc = `    async function runAutomationScript() {
      const script = document.getElementById('auto-script').value.trim();
      const language = document.getElementById('auto-language-select').value;
      const output = document.getElementById('script-output');

      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        toast('Please select module and test case first', 'error');
        return;
      }

      if (!script) {
        toast('Please enter a script', 'error');
        return;
      }

      output.textContent = 'Running automation script...';

      try {
        const response = await fetch('/api/run-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseId: S.selectedAutomationTc, module: S.selectedAutomationModule, script, language })
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Execution failed');
        }
        output.textContent = \`Result: \${result.result} | Output: \${result.output}\`;
        toast(\`Test case updated to \${result.result}\`, 'success');
      } catch (error) {
        output.textContent = \`Error: \${error.message}\`;
      }
    }`;

const newFunc = `    async function runAutomationScript() {
      const script = document.getElementById('auto-script').value.trim();
      const language = document.getElementById('auto-language-select').value;
      const output = document.getElementById('script-output');

      if (!S.selectedAutomationModule || !S.selectedAutomationTc) {
        toast('Please select module and test case first', 'error');
        return;
      }

      if (!script) {
        toast('Please enter a script', 'error');
        return;
      }

      output.innerHTML = \`
        <div style="display:flex; align-items:center; gap:8px; margin-bottom: 15px;">
          <svg class="spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg> 
          Running automation script...
        </div>
        <div style="padding: 20px; text-align: center; border: 1px dashed var(--border); border-radius: 8px; background: var(--bg2); color: var(--text3); font-size: 13px;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" style="margin-bottom: 8px; opacity: 0.5;"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg><br>
          Video will be visible here if your Playwright code has <code>record_video_dir: "./"</code> configured.
        </div>
      \`;

      try {
        const response = await fetch('/api/run-automation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ testCaseId: S.selectedAutomationTc, module: S.selectedAutomationModule, script, language })
        });
        const result = await response.json();
        
        let videoHtml = '';
        if (result.videoUrl) {
           videoHtml = \\\`
             <div style="margin-top: 20px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
               <div style="background: var(--bg2); padding: 8px 12px; font-size: 12px; font-weight: 600; border-bottom: 1px solid var(--border); display:flex; align-items:center; gap:6px;">
                 <svg viewBox="0 0 24 24" width="14" height="14" stroke="var(--accent)" stroke-width="2" fill="none"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg> Execution Recording
               </div>
               <video src="\${result.videoUrl}" controls autoplay muted style="width: 100%; display: block; max-height: 500px; background: #000;"></video>
             </div>
           \\\`;
        } else {
           videoHtml = \\\`
             <div style="margin-top: 20px; padding: 20px; text-align: center; border: 1px dashed var(--border); border-radius: 8px; background: var(--bg2); color: var(--text3); font-size: 13px;">
               No video harvested. Video will be visible here if your Playwright code has <code>record_video_dir: "./"</code> configured.
             </div>
           \\\`;
        }

        if (!response.ok) {
          output.innerHTML = \\\`<div style="color:var(--red); font-weight:600;">Error: \${result.error || 'Execution failed'}</div><pre style="margin-top:10px; white-space:pre-wrap; font-size:12px; color:var(--text2);">\${result.details || result.output || ''}</pre>\${videoHtml}\\\`;
          return;
        }
        
        output.innerHTML = \\\`<div style="color:\${result.result === 'Pass' ? 'var(--green)' : 'var(--red)'}; font-weight:600; font-size:16px;">Result: \${result.result}</div><pre style="margin-top:10px; white-space:pre-wrap; font-size:12px; color:var(--text2);">\${result.output || ''}</pre>\${videoHtml}\\\`;
        toast(\\\`Test case updated to \${result.result}\\\`, 'success');
      } catch (error) {
        output.innerHTML = \\\`<div style="color:var(--red); font-weight:600;">Error: \${error.message}</div>\\\`;
      }
    }`;

content = content.replace(/\r\n/g, '\n');
if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  fs.writeFileSync('index.html', content);
  console.log("Patched UI!");
} else {
  console.error("Failed to find runAutomationScript!");
}
