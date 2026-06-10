const fs = require('fs');
const path = require('path');
let content = fs.readFileSync('server.js', 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. Add static hosting
const staticHostString = `const app = express();
app.use(express.static('public')); // <--- Added for videos`;
content = content.replace('const app = express();', staticHostString);

// 2. Replace the api/run-automation endpoint
const oldEndpointStart = `// API endpoints
app.post('/api/run-automation', express.json(), async (req, res) => {
  const { testCaseId, module, script, language = 'java' } = req.body;
  if (!testCaseId || !module || !script) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const testCase = await TestCase.findOne({ id: testCaseId, module });
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const handleResult = (runErr, runStdout, runStderr, filesToCleanup) => {
      filesToCleanup.forEach(f => { try { fs.unlinkSync(f); } catch { } });
      if (runErr && runErr.code !== 0) {
        return res.status(400).json({ error: 'Execution failed', details: runStderr || runErr.message, output: runStdout });
      }
      const output = runStdout.trim().toUpperCase();
      const result = output.includes('PASS') ? 'Pass' : output.includes('FAIL') ? 'Fail' : null;
      if (!result) {
        return res.status(400).json({ error: 'Script must output PASS or FAIL', output: runStdout });
      }
      const updatedTc = { ...testCase.toObject(), status: result, updatedAt: new Date().toISOString().slice(0, 10), history: [...(testCase.history || []), { date: new Date().toISOString().slice(0, 16).replace('T', ' '), event: \`Automated: \${result}\` }] };
      TestCase.findOneAndUpdate({ id: testCaseId, module }, { $set: updatedTc }, { new: true }).then(() => {
        io.emit('dataUpdate', { type: 'testCase', data: updatedTc });
        res.json({ result, output: runStdout });
      }).catch(err => res.status(500).json({ error: 'Failed to update test case' }));
    };`;

const newEndpointStart = `// API endpoints
app.post('/api/run-automation', express.json(), async (req, res) => {
  const { testCaseId, module, script, language = 'java' } = req.body;
  if (!testCaseId || !module || !script) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const testCase = await TestCase.findOne({ id: testCaseId, module });
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    const baseTempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(baseTempDir)) {
      fs.mkdirSync(baseTempDir);
    }
    const execId = Date.now() + '_' + Math.floor(Math.random() * 1000);
    const tempDir = path.join(baseTempDir, \`exec_\${execId}\`);
    fs.mkdirSync(tempDir);

    const publicVideosDir = path.join(__dirname, 'public', 'videos');
    if (!fs.existsSync(publicVideosDir)) {
      fs.mkdirSync(publicVideosDir, { recursive: true });
    }

    const handleResult = (runErr, runStdout, runStderr) => {
      let videoUrl = null;
      try {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          if (file.endsWith('.webm') || file.endsWith('.mp4')) {
            const newFilename = \`video_\${execId}_\${file}\`;
            fs.renameSync(path.join(tempDir, file), path.join(publicVideosDir, newFilename));
            videoUrl = \`/videos/\${newFilename}\`;
            break;
          }
        }
      } catch (e) {
        console.error("Error harvesting video:", e);
      }

      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Error cleaning up temp dir:", e);
      }
      
      if (runErr && runErr.code !== 0) {
        return res.status(400).json({ error: 'Execution failed', details: runStderr || runErr.message, output: runStdout, videoUrl });
      }
      const output = runStdout.trim().toUpperCase();
      const result = output.includes('PASS') ? 'Pass' : output.includes('FAIL') ? 'Fail' : null;
      if (!result) {
        return res.status(400).json({ error: 'Script must output PASS or FAIL', output: runStdout, videoUrl });
      }
      const updatedTc = { ...testCase.toObject(), status: result, updatedAt: new Date().toISOString().slice(0, 10), history: [...(testCase.history || []), { date: new Date().toISOString().slice(0, 16).replace('T', ' '), event: \`Automated: \${result}\` }] };
      TestCase.findOneAndUpdate({ id: testCaseId, module }, { $set: updatedTc }, { new: true }).then(() => {
        io.emit('dataUpdate', { type: 'testCase', data: updatedTc });
        res.json({ result, output: runStdout, videoUrl });
      }).catch(err => res.status(500).json({ error: 'Failed to update test case' }));
    };`;

// 3. Fix the exec calls
const oldExecPython = `      const pyFile = path.join(tempDir, \`script_\${Date.now()}.py\`);
      fs.writeFileSync(pyFile, pyScript);
      exec(\`python "\${pyFile}"\`, { timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr, [pyFile]));`;

const newExecPython = `      const pyFile = path.join(tempDir, \`script.py\`);
      fs.writeFileSync(pyFile, pyScript);
      exec(\`python "\${pyFile}"\`, { cwd: tempDir, timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));`;

const oldExecJs = `      const jsFile = path.join(tempDir, \`script_\${Date.now()}.js\`);
      fs.writeFileSync(jsFile, jsScript);
      exec(\`node "\${jsFile}"\`, { timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr, [jsFile]));`;

const newExecJs = `      const jsFile = path.join(tempDir, \`script.js\`);
      fs.writeFileSync(jsFile, jsScript);
      exec(\`node "\${jsFile}"\`, { cwd: tempDir, timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));`;

const oldExecJava = `      const javaFile = path.join(tempDir, 'AutomationScript.java');
      fs.writeFileSync(javaFile, javaScript);
      exec(\`javac "\${javaFile}" && java -cp "\${tempDir}" AutomationScript\`, { timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr, [javaFile, javaFile.replace('.java', '.class')]));`;

const newExecJava = `      const javaFile = path.join(tempDir, 'AutomationScript.java');
      fs.writeFileSync(javaFile, javaScript);
      exec(\`javac "\${javaFile}" && java -cp "\${tempDir}" AutomationScript\`, { cwd: tempDir, timeout: 120000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));`;

let success = true;

if (content.includes(oldEndpointStart)) {
  content = content.replace(oldEndpointStart, newEndpointStart);
} else {
  console.error("Failed endpoint block!"); success = false;
}

if (content.includes(oldExecPython)) {
  content = content.replace(oldExecPython, newExecPython);
} else {
  console.error("Failed python block!"); success = false;
}

if (content.includes(oldExecJs)) {
  content = content.replace(oldExecJs, newExecJs);
} else {
  console.error("Failed js block!"); success = false;
}

if (content.includes(oldExecJava)) {
  content = content.replace(oldExecJava, newExecJava);
} else {
  console.error("Failed java block!"); success = false;
}

if (success) {
  fs.writeFileSync('server.js', content);
  console.log("Patched server.js successfully!");
}
