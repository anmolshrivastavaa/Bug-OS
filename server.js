const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mongodbConnected = false;

const app = express();
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
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set");
  process.exit(1);
}
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  autoIndex: true
})
.then(() => {
  console.log("✅ MongoDB connected");
  mongodbConnected = true;     // ✅ ADD THIS
})
.catch((err) => {
  console.error("❌ MongoDB connection failed:", err.message);
  mongodbConnected = false;    // ✅ ADD THIS
});

// Define MongoDB Schemas
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
  actor: { type: String, required: true }
});

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
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

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));
app.use(express.json());

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
  return `BUG-${String(counter.value).padStart(3,'0')}`;
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

// API endpoints
app.post('/api/run-automation', express.json(), async (req, res) => {
  const { testCaseId, module, script } = req.body;
  if (!testCaseId || !module || !script) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const testCase = await TestCase.findOne({ id: testCaseId, module });
    if (!testCase) {
      return res.status(404).json({ error: 'Test case not found' });
    }

    // Inject test case data into script
    const injectedScript = `
import java.util.*;

public class AutomationScript {
    public static void main(String[] args) {
        // Test case data
        String id = "${testCase.id}";
        String testCaseName = "${testCase.testCase}";
        String scenario = "${testCase.scenario || ''}";
        String moduleName = "${testCase.module}";
        String screen = "${testCase.screen || ''}";
        String steps = "${testCase.steps || ''}";
        String testData = "${testCase.testData || ''}";
        String expected = "${testCase.expected || ''}";
        String actual = "${testCase.actual || ''}";
        String status = "${testCase.status}";
        String severity = "${testCase.severity}";
        String evidence = "${testCase.evidence || ''}";
        String notes = "${testCase.notes || ''}";

        // User script
        ${script.replace(/"/g, '\\"').replace(/\n/g, '\n        ')}
    }
}
`;

    // Write to temp file
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    const javaFile = path.join(tempDir, `AutomationScript_${Date.now()}.java`);
    fs.writeFileSync(javaFile, injectedScript);

    // Compile
    const classFile = javaFile.replace('.java', '.class');
    exec(`javac "${javaFile}"`, (compileErr, compileStdout, compileStderr) => {
      if (compileErr) {
        fs.unlinkSync(javaFile);
        return res.status(400).json({ error: 'Compilation failed', details: compileStderr });
      }

      // Run
      const libPath = path.join(__dirname, 'lib', '*');
      const cp = fs.existsSync(path.join(__dirname, 'lib')) ? `"${libPath}:${tempDir}"` : `"${tempDir}"`;
      exec(`java -cp ${cp} AutomationScript`, { timeout: 30000 }, (runErr, runStdout, runStderr) => {
        // Clean up
        try { fs.unlinkSync(javaFile); } catch {}
        try { fs.unlinkSync(classFile); } catch {}

        if (runErr && runErr.code !== 0) {
          return res.status(400).json({ error: 'Execution failed', details: runStderr });
        }

        // Check output for PASS/FAIL
        const output = runStdout.trim().toUpperCase();
        const result = output.includes('PASS') ? 'Pass' : output.includes('FAIL') ? 'Fail' : null;
        if (!result) {
          return res.status(400).json({ error: 'Script must output PASS or FAIL' });
        }

        // Update test case
        const updatedTc = { ...testCase.toObject(), status: result, updatedAt: new Date().toISOString().slice(0,10), history: [...(testCase.history || []), { date: new Date().toISOString().slice(0,16).replace('T',' '), event: `Automated: ${result}` }] };
        TestCase.findOneAndUpdate({ id: testCaseId, module }, { $set: updatedTc }, { new: true }).then(() => {
          io.emit('dataUpdate', { type: 'testCase', data: updatedTc });
          res.json({ result, output: runStdout });
        }).catch(err => res.status(500).json({ error: 'Failed to update test case' }));
      });
    });

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

    const [testCases, bugs, auditLogs, tcCounter, bugCounter, modules, automationScripts] = await Promise.all([
      TestCase.find({}),
      Bug.find({}),
      AuditLog.find({}).sort({ time: -1 }).limit(200),
      Counter.findOne({ name: 'tcCounter' }),
      Counter.findOne({ name: 'bugCounter' }),
      Module.find({}).sort({ name: 1 }),
      AutomationScript.find({})
    ]);

    const moduleNames = modules.map(m => m.name);
    

    const dataStore = {
      modules: moduleNames,
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



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 QA Enterprise Tracker Server running on port ${PORT}`);
  console.log("🌐 Server is live");
  console.log("🗄️ Database: MongoDB connected");
  console.log("☁️ Ready for cloud deployment");
});