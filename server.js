const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mongodbConnected = false;

const app = express();
app.use(express.static('public')); // Serve harvested videos

app.get('/health', (req, res) => {
  res.send('OK');
});
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugos';
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set");
  process.exit(1);
}
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  autoIndex: true
})
  .then(async () => {
    console.log("✅ MongoDB connected");
    mongodbConnected = true;     // ✅ ADD THIS

    try {
      const userCount = await mongoose.model('User').countDocuments();
      if (userCount === 0) {
        await mongoose.model('User').create({
          username: 'ADMIN',
          password: 'ADMIN@nyneos',
          initialPassword: 'ADMIN@nyneos',
          role: 'admin',
          createdAt: new Date().toISOString()
        });
        console.log("👤 Default ADMIN user created");
      }
    } catch (e) {
      console.error("Error creating default admin user:", e);
    }
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    mongodbConnected = false;    // ✅ ADD THIS
  });

// Define MongoDB Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  initialPassword: { type: String },
  role: { type: String, required: true, enum: ['qa', 'dev', 'admin'] },
  createdAt: { type: String, required: true }
});

const testCaseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  testCase: { type: String, required: true },
  scenario: String,
  module: { type: String, required: true },
  screen: String,
  steps: String,
  testData: String,
  expected: String,
  actual: String,
  status: { type: String, required: true, enum: ['Pass', 'Fail', 'Hold'] },
  severity: { type: String, required: true, enum: ['High', 'Medium', 'Low'] },
  evidence: String,
  evidence2: String,
  notes: String,
  createdAt: { type: String, required: true },
  createdBy: { type: String, required: true },
  updatedAt: { type: String, required: true },
  history: [{ date: String, event: String }]
}, { strict: false });

testCaseSchema.index({ id: 1, module: 1 }, { unique: true });
const bugSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tcId: { type: String, required: true },
  testCase: { type: String, required: true },
  module: { type: String, required: true },
  screen: String,
  severity: { type: String, required: true, enum: ['High', 'Medium', 'Low'] },
  status: { type: String, required: true, enum: ['Open', 'Escalated', 'Fixed', 'Verified', 'Retest Failed'] },
  failedAt: String,
  fixedAt: String,
  retestAt: String,
  devNotes: String,
  retestResult: String,
  retestCount: { type: Number, default: 0 },
  escalatedAt: String,
  escalationReason: String,
  history: [{ date: String, event: String, actor: String }]
});

const auditLogSchema = new mongoose.Schema({
  time: { type: String, required: true },
  event: { type: String, required: true },
  actor: { type: String, required: true },
  screen: { type: String }
});

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  pendingDelete: { type: Boolean, default: false },
  deleteRequestedBy: { type: String }
});

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  value: { type: Number, required: true, default: 1 }
});

const automationScriptSchema = new mongoose.Schema({
  testCaseId: { type: String, required: true },
  module: { type: String, required: true },
  script: { type: String, required: true },
  language: { type: String, default: 'java' },
  updatedAt: { type: String, required: true },
  updatedBy: { type: String, required: true }
}, { strict: false });

automationScriptSchema.index({ testCaseId: 1, module: 1 }, { unique: true });

// Models
const TestCase = mongoose.model('TestCase', testCaseSchema);
const Bug = mongoose.model('Bug', bugSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Module = mongoose.model('Module', moduleSchema);
const Counter = mongoose.model('Counter', counterSchema);
const AutomationScript = mongoose.model('AutomationScript', automationScriptSchema);
const User = mongoose.model('User', userSchema);

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '50mb' }));

function normalizeTcId(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeModuleField(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

async function getNextBugId() {
  const counter = await Counter.findOneAndUpdate(
    { name: 'bugCounter' },
    { $inc: { value: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return `BUG-${String(counter.value).padStart(3, '0')}`;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current data to new client
  sendInitialData(socket);

  // Handle data updates
  socket.on('updateData', async (update) => {
    try {
      let shouldBroadcast = true;
      if (update.type === 'testCase') {
        const result = await handleTestCaseUpdate(update.data);
        if (result === false) return;
        if (result !== true) update.data = result;
      } else if (update.type === 'bug') {
        const result = await handleBugUpdate(update.data);
        if (result === false) return;
        update.data = result;
      } else if (update.type === 'audit') {
        await handleAuditUpdate(update.data);
      } else if (update.type === 'counters') {
        await handleCounterUpdate(update.data);
      } else if (update.type === 'module') {
        await handleModuleUpdate(update.data);
      } else if (update.type === 'automationScript') {
        await handleAutomationScriptUpdate(update.data);
      } else if (update.type === 'user') {
        await handleUserUpdate(update.data);
      } else {
        console.warn('Ignored unsupported update type:', update.type);
        return;
      }

      // Do not notify clients until DB accepted the testcase write (avoid ghost rows / wiping state)
      if (!shouldBroadcast) return;

      // Broadcast the update to ALL clients (including sender)
      io.emit('dataUpdate', update);
    } catch (error) {
      console.error('Error handling update:', error);
      socket.emit('persistError', { message: error.message || 'Save failed' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const axios = require('axios');
const FormData = require('form-data');

// API endpoints
app.post('/api/upload-evidence', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    // Extract the base64 data
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload anonymously to Catbox to ensure the URL doesn't expose the domain
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: 'evidence.png', contentType: 'image/png' });

    const response = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const imageUrl = response.data.trim();
    res.json({ imageUrl });

  } catch (error) {
    console.error('Error uploading evidence to anonymous host:', error.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

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
    const tempDir = path.join(baseTempDir, `exec_${execId}`);
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
            const newFilename = `video_${execId}_${file}`;
            fs.renameSync(path.join(tempDir, file), path.join(publicVideosDir, newFilename));
            videoUrl = `/videos/${newFilename}`;
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
      const result = /\bFAIL\b/.test(output) ? 'Fail' : /\bPASS\b/.test(output) ? 'Pass' : null;
      if (!result) {
        return res.status(400).json({ error: 'Script must output PASS or FAIL', output: runStdout, videoUrl });
      }
      const updatedTc = { ...testCase.toObject(), status: result, updatedAt: new Date().toISOString().slice(0, 10), history: [...(testCase.history || []), { date: new Date().toISOString().slice(0, 16).replace('T', ' '), event: `Automated: ${result}` }] };
      TestCase.findOneAndUpdate({ id: testCaseId, module }, { $set: updatedTc }, { new: true }).then(() => {
        io.emit('dataUpdate', { type: 'testCase', data: updatedTc });
        res.json({ result, output: runStdout, videoUrl });
      }).catch(err => res.status(500).json({ error: 'Failed to update test case' }));
    };

    const safeStr = (val) => JSON.stringify(val || '');

    if (language === 'python') {
      const pyScript = `
id = ${safeStr(testCase.id)}
testCaseName = ${safeStr(testCase.testCase)}
scenario = ${safeStr(testCase.scenario)}
moduleName = ${safeStr(testCase.module)}
screen = ${safeStr(testCase.screen)}
steps = ${safeStr(testCase.steps)}
testData = ${safeStr(testCase.testData)}
expected = ${safeStr(testCase.expected)}
actual = ${safeStr(testCase.actual)}
status = ${safeStr(testCase.status)}
severity = ${safeStr(testCase.severity)}
evidence = ${safeStr(testCase.evidence)}
evidence2 = ${safeStr(testCase.evidence2)}
notes = ${safeStr(testCase.notes)}

${script}
`;
      const pyFile = path.join(tempDir, `script.py`);
      fs.writeFileSync(pyFile, pyScript);
      exec(`python3 "${pyFile}"`, { cwd: tempDir, timeout: 300000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));

    } else if (language === 'javascript') {
      const jsScript = `
const id = ${safeStr(testCase.id)};
const testCaseName = ${safeStr(testCase.testCase)};
const scenario = ${safeStr(testCase.scenario)};
const moduleName = ${safeStr(testCase.module)};
const screen = ${safeStr(testCase.screen)};
const steps = ${safeStr(testCase.steps)};
const testData = ${safeStr(testCase.testData)};
const expected = ${safeStr(testCase.expected)};
const actual = ${safeStr(testCase.actual)};
const status = ${safeStr(testCase.status)};
const severity = ${safeStr(testCase.severity)};
const evidence = ${safeStr(testCase.evidence)};
const evidence2 = ${safeStr(testCase.evidence2)};
const notes = ${safeStr(testCase.notes)};

${script}
`;
      const jsFile = path.join(tempDir, `script.js`);
      fs.writeFileSync(jsFile, jsScript);
      exec(`node "${jsFile}"`, { cwd: tempDir, timeout: 300000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));

    } else { // java
      const javaScript = `
import java.util.*;
public class AutomationScript {
    public static void main(String[] args) {
        String id = ${safeStr(testCase.id)};
        String testCaseName = ${safeStr(testCase.testCase)};
        String scenario = ${safeStr(testCase.scenario)};
        String moduleName = ${safeStr(testCase.module)};
        String screen = ${safeStr(testCase.screen)};
        String steps = ${safeStr(testCase.steps)};
        String testData = ${safeStr(testCase.testData)};
        String expected = ${safeStr(testCase.expected)};
        String actual = ${safeStr(testCase.actual)};
        String status = ${safeStr(testCase.status)};
        String severity = ${safeStr(testCase.severity)};
        String evidence = ${safeStr(testCase.evidence)};
        String evidence2 = ${safeStr(testCase.evidence2)};
        String notes = ${safeStr(testCase.notes)};
        ${script.replace(/\n/g, '\n        ')}
    }
}
`;
      const javaFile = path.join(tempDir, `AutomationScript.java`);
      fs.writeFileSync(javaFile, javaScript);
      exec(`javac "${javaFile}"`, { cwd: tempDir }, (compileErr, compileStdout, compileStderr) => {
        if (compileErr) {
          return res.status(400).json({ error: 'Compilation failed', details: compileStderr });
        }
        const libPath = path.join(__dirname, 'lib', '*');
        const cp = fs.existsSync(path.join(__dirname, 'lib')) ? `"${libPath}:${tempDir}"` : `"${tempDir}"`;
        exec(`java -cp ${cp} AutomationScript`, { cwd: tempDir, timeout: 300000 }, (err, stdout, stderr) => handleResult(err, stdout, stderr));
      });
    }

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Data handling functions
async function sendInitialData(socket) {
  try {
    if (!mongodbConnected) {
      // Fail fast: don't allow connections without database
      console.error('❌ Cannot send initial data: MongoDB not connected');
      socket.emit('error', { message: 'Database not connected. Please try again later.' });
      socket.disconnect(true);
      return;
    }

    const [testCases, bugs, auditLogs, tcCounter, bugCounter, modules, automationScripts, users] = await Promise.all([
      TestCase.find({}),
      Bug.find({}),
      AuditLog.find({}).sort({ time: -1 }).limit(200),
      Counter.findOne({ name: 'tcCounter' }),
      Counter.findOne({ name: 'bugCounter' }),
      Module.find({}).sort({ name: 1 }),
      AutomationScript.find({}),
      User.find({})
    ]);

    const modulesObj = modules.map(m => m.toObject());
    const moduleNames = modulesObj.map(m => m.name);
    const modulesPendingDelete = modulesObj.filter(m => m.pendingDelete);

    const dataStore = {
      modules: moduleNames,
      modulesPendingDelete: modulesPendingDelete,
      testCases: testCases.map((tc) => {
        const o = tc.toObject();
        return {
          ...o,
          id: normalizeTcId(o.id),
          module: normalizeModuleField(o.module)
        };
      }),
      bugs: bugs.map(bug => bug.toObject()),
      auditLog: auditLogs.map(log => log.toObject()).reverse(),
      tcCounter: tcCounter ? tcCounter.value : 1,
      bugCounter: bugCounter ? bugCounter.value : 1,
      automationScripts: automationScripts.map(script => script.toObject()),
      users: users.map(u => u.toObject()),
      connectedUsers: 0
    };

    socket.emit('initialData', dataStore);
  } catch (error) {
    console.error('Error sending initial data:', error);
    socket.emit('error', { message: 'Failed to load data. Please try again.' });
    socket.disconnect(true);
  }
}

async function handleTestCaseUpdate(data) {
  if (data.deleted) {
    const id = normalizeTcId(data.id);
    const module = normalizeModuleField(data.module);
    if (!id || !module) {
      console.warn('[testcases] Refusing delete — id and module are required as a pair (same TC numbering is allowed across different modules)');
      return false;
    }
    await TestCase.deleteOne({ id, module });
    return true;
  }

  const { _id, __v, ...rest } = data;
  const id = normalizeTcId(rest.id);
  const module = normalizeModuleField(rest.module);
  if (!id || !module) {
    console.warn('[testcases] Skipping upsert — missing id or module:', JSON.stringify(data).slice(0, 120));
    return false;
  }

  const cleanPayload = { ...rest, id, module };
  delete cleanPayload.deleted;

  const updated = await TestCase.findOneAndUpdate(
    { id, module },
    { $set: cleanPayload },
    { upsert: true, new: true }
  );

  // Ensure the module is persisted so imported test cases remain mapped correctly.
  if (module) {
    await Module.findOneAndUpdate(
      { name: module },
      { name: module },
      { upsert: true, new: true }
    );
  }

  return updated ? updated.toObject() : true;
}
async function handleBugUpdate(data) {
  try {
    if (data.deleted) {
      await Bug.deleteOne({ id: data.id });
      return data;
    }

    const { _id, __v, ...cleanBug } = data;
    if (!cleanBug.id || !cleanBug.tcId || !cleanBug.module) {
      console.warn('[bugs] Skipping upsert — missing id, tcId or module:', JSON.stringify(data).slice(0, 120));
      return false;
    }

    const existingById = await Bug.findOne({ id: cleanBug.id });
    const existingByTc = await Bug.findOne({ tcId: cleanBug.tcId, module: cleanBug.module });

    if (existingById) {
      if (existingById.tcId === cleanBug.tcId && existingById.module === cleanBug.module) {
        const updated = await Bug.findOneAndUpdate(
          { id: cleanBug.id },
          { $set: cleanBug },
          { new: true, upsert: false }
        );
        return updated ? updated.toObject() : false;
      }

      if (existingByTc) {
        const updated = await Bug.findOneAndUpdate(
          { id: existingByTc.id },
          { $set: cleanBug },
          { new: true, upsert: false }
        );
        return updated ? updated.toObject() : false;
      }

      cleanBug.id = await getNextBugId();
      const newBug = new Bug(cleanBug);
      const saved = await newBug.save();
      return saved.toObject();
    }

    if (existingByTc) {
      const updated = await Bug.findOneAndUpdate(
        { id: existingByTc.id },
        { $set: cleanBug },
        { new: true, upsert: false }
      );
      return updated ? updated.toObject() : false;
    }

    const newBug = new Bug(cleanBug);
    const saved = await newBug.save();
    return saved.toObject();
  } catch (error) {
    console.error('Error updating bug:', error);
    return false;
  }
}

async function handleAuditUpdate(data) {
  try {
    const auditLog = new AuditLog(data);
    await auditLog.save();

    // Keep only last 200 audit entries
    const count = await AuditLog.countDocuments();
    if (count > 200) {
      const oldestEntries = await AuditLog.find({})
        .sort({ time: 1 })
        .limit(count - 200);
      await AuditLog.deleteMany({ _id: { $in: oldestEntries.map(e => e._id) } });
    }
  } catch (error) {
    console.error('Error saving audit log:', error);
  }
}

async function handleCounterUpdate(data) {
  try {
    if (data.tcCounter !== undefined) {
      await Counter.findOneAndUpdate(
        { name: 'tcCounter' },
        { value: data.tcCounter },
        { upsert: true }
      );
    }
    if (data.bugCounter !== undefined) {
      await Counter.findOneAndUpdate(
        { name: 'bugCounter' },
        { value: data.bugCounter },
        { upsert: true }
      );
    }
  } catch (error) {
    console.error('Error updating counters:', error);
  }
}

async function handleModuleUpdate(data) {
  try {
    if (data.deleted) {
      await Module.deleteOne({ name: data.name });
      return;
    }

    if (data.pendingDelete !== undefined) {
      await Module.findOneAndUpdate(
        { name: data.name },
        { pendingDelete: data.pendingDelete, deleteRequestedBy: data.deleteRequestedBy },
        { upsert: true, new: true }
      );
      return;
    }

    if (data.name) {
      await Module.findOneAndUpdate(
        { name: data.name },
        { name: data.name },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('Error updating module:', error);
  }
}

async function handleAutomationScriptUpdate(data) {
  try {
    if (data.deleted) {
      await AutomationScript.deleteOne({ testCaseId: data.testCaseId, module: data.module });
      return;
    }

    const { _id, __v, ...cleanData } = data;
    await AutomationScript.findOneAndUpdate(
      { testCaseId: cleanData.testCaseId, module: cleanData.module },
      { $set: cleanData },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating automation script:', error);
  }
}

async function handleUserUpdate(data) {
  try {
    if (data.deleted) {
      await User.deleteOne({ username: data.username });
      return;
    }

    const { _id, __v, ...cleanData } = data;
    await User.findOneAndUpdate(
      { username: cleanData.username },
      { $set: cleanData },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating user:', error);
  }
}



const PORT = process.env.PORT || 3000;

function cleanupOldExecutions() {
  try {
    const now = Date.now();
    const expiryMs = 15 * 60 * 1000; // 15 minutes

    const publicVideosDir = path.join(__dirname, 'public', 'videos');
    if (fs.existsSync(publicVideosDir)) {
      const files = fs.readdirSync(publicVideosDir);
      files.forEach(file => {
        if (file.endsWith('.webm') || file.endsWith('.mp4')) {
          const filePath = path.join(publicVideosDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > expiryMs) {
            fs.unlinkSync(filePath);
          }
        }
      });
    }

    const baseTempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(baseTempDir)) {
      const dirs = fs.readdirSync(baseTempDir);
      dirs.forEach(dir => {
        const dirPath = path.join(baseTempDir, dir);
        const stats = fs.statSync(dirPath);
        if (now - stats.mtimeMs > expiryMs) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
      });
    }
  } catch (error) {
    console.error('Error during automatic cleanup:', error);
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldExecutions, 10 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🚀 QA Enterprise Tracker Server running on port ${PORT}`);
  console.log("🌐 Server is live");
  console.log("🗄️ Database: MongoDB connected");
  console.log("☁️ Ready for cloud deployment");
});