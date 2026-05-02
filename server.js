const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

let mongodbConnected = false;

const app = express();
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
  serverSelectionTimeoutMS: 5000
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
  id: { type: String, required: true, unique: true },
  testCase: { type: String, required: true },
  scenario: String,
  module: { type: String, required: true },
  screen: String,
  steps: { type: String, required: true },
  expected: { type: String, required: true },
  actual: { type: String, required: true },
  status: { type: String, required: true, enum: ['Pass', 'Fail', 'Hold'] },
  severity: { type: String, required: true, enum: ['High', 'Medium', 'Low'] },
  evidence: String,
  notes: String,
  createdAt: { type: String, required: true },
  createdBy: { type: String, required: true },
  updatedAt: { type: String, required: true },
  history: [{ date: String, event: String }]
});

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

// Models
const TestCase = mongoose.model('TestCase', testCaseSchema);
const Bug = mongoose.model('Bug', bugSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const Module = mongoose.model('Module', moduleSchema);
const Counter = mongoose.model('Counter', counterSchema);

// Serve static files from current directory
app.use(express.static(path.join(__dirname)));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send current data to new client
  sendInitialData(socket);

  // Handle data updates
  socket.on('updateData', async (update) => {
    try {
      if (update.type === 'testCase') {
        await handleTestCaseUpdate(update.data);
      } else if (update.type === 'bug') {
        await handleBugUpdate(update.data);
      } else if (update.type === 'audit') {
        await handleAuditUpdate(update.data);
      } else if (update.type === 'counters') {
        await handleCounterUpdate(update.data);
      } else if (update.type === 'module') {
        await handleModuleUpdate(update.data);
      } else {
        console.warn('Ignored unsupported update type:', update.type);
        return;
      }

      // Broadcast the update to ALL clients (including sender)
      io.emit('dataUpdate', update);
    } catch (error) {
      console.error('Error handling update:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
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

    const [testCases, bugs, auditLogs, tcCounter, bugCounter, modules] = await Promise.all([
      TestCase.find({}),
      Bug.find({}),
      AuditLog.find({}).sort({ time: -1 }).limit(200),
      Counter.findOne({ name: 'tcCounter' }),
      Counter.findOne({ name: 'bugCounter' }),
      Module.find({}).sort({ name: 1 })
    ]);

    const moduleNames = modules.map(m => m.name);
    

    const dataStore = {
      modules: moduleNames,
      testCases: testCases.map(tc => tc.toObject()),
      bugs: bugs.map(bug => bug.toObject()),
      auditLog: auditLogs.map(log => log.toObject()).reverse(),
      tcCounter: tcCounter ? tcCounter.value : 1,
      bugCounter: bugCounter ? bugCounter.value : 1,
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
  try {
    if (data.deleted) {
      await TestCase.deleteOne({ id: data.id });
      return;
    }

    await TestCase.findOneAndUpdate(
      { id: data.id },
      data,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating test case:', error);
  }
}

async function handleBugUpdate(data) {
  try {
    if (data.deleted) {
      await Bug.deleteOne({ id: data.id });
      return;
    }

    await Bug.findOneAndUpdate(
      { id: data.id },
      data,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error updating bug:', error);
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



const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 QA Enterprise Tracker Server running on port ${PORT}`);
  console.log("🌐 Server is live");
  console.log("🗄️ Database: MongoDB connected");
  console.log("☁️ Ready for cloud deployment");
});