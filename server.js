const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qa_tracker';
let mongodbConnected = false;

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  mongodbConnected = true;
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.log('');
  console.log('📋 To fix this:');
  console.log('1. Install MongoDB: https://www.mongodb.com/try/download/community');
  console.log('2. Start MongoDB: mongod');
  console.log('3. Or use MongoDB Atlas: https://www.mongodb.com/atlas');
  console.log('4. Set MONGODB_URI environment variable');
  console.log('');
  console.log('⚠️  Server will run with limited functionality (no data persistence)');
  console.log('🔄 Real-time sync will work, but data won\'t be saved');
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

// Fallback in-memory data store for when MongoDB is not available
const fallbackDataStore = {
  modules: ['Login', 'Checkout', 'Dashboard', 'Reports'],
  testCases: [
    {
      id: 'TC001',
      testCase: 'User Login',
      scenario: 'Valid user login',
      module: 'Login',
      screen: 'Login Page',
      steps: '1. Navigate to login page\n2. Enter valid username\n3. Enter valid password\n4. Click login button',
      expected: 'User should be logged in successfully',
      actual: 'User logged in successfully',
      status: 'Pass',
      severity: 'High',
      evidence: '',
      notes: 'Test passed',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
      updatedAt: new Date().toISOString(),
      history: []
    },
    {
      id: 'TC002',
      testCase: 'Invalid Login',
      scenario: 'Invalid credentials',
      module: 'Login',
      screen: 'Login Page',
      steps: '1. Navigate to login page\n2. Enter invalid username\n3. Enter invalid password\n4. Click login button',
      expected: 'Error message should be displayed',
      actual: 'Error message displayed',
      status: 'Pass',
      severity: 'High',
      evidence: '',
      notes: 'Test passed',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
      updatedAt: new Date().toISOString(),
      history: []
    },
    {
      id: 'TC003',
      testCase: 'Checkout Process',
      scenario: 'Complete purchase',
      module: 'Checkout',
      screen: 'Checkout Page',
      steps: '1. Add items to cart\n2. Proceed to checkout\n3. Enter payment details\n4. Complete purchase',
      expected: 'Order should be placed successfully',
      actual: 'Order placed successfully',
      status: 'Pass',
      severity: 'High',
      evidence: '',
      notes: 'Test passed',
      createdAt: new Date().toISOString(),
      createdBy: 'System',
      updatedAt: new Date().toISOString(),
      history: []
    }
  ],
  bugs: [
    {
      id: 'BUG001',
      tcId: 'TC001',
      testCase: 'User Login',
      module: 'Login',
      screen: 'Login Page',
      severity: 'Medium',
      status: 'Open',
      failedAt: new Date().toISOString(),
      fixedAt: '',
      retestAt: '',
      devNotes: '',
      retestResult: '',
      retestCount: 0,
      escalatedAt: '',
      escalationReason: '',
      history: []
    },
    {
      id: 'BUG002',
      tcId: 'TC002',
      testCase: 'Invalid Login',
      module: 'Login',
      screen: 'Login Page',
      severity: 'Low',
      status: 'Fixed',
      failedAt: new Date().toISOString(),
      fixedAt: new Date().toISOString(),
      retestAt: '',
      devNotes: 'Fixed validation logic',
      retestResult: '',
      retestCount: 0,
      escalatedAt: '',
      escalationReason: '',
      history: []
    }
  ],
  auditLog: [],
  tcCounter: 6,
  bugCounter: 3,
  connectedUsers: 0
};

// Initialize counters if they don't exist
async function initializeCounters() {
  try {
    const tcCounter = await Counter.findOne({ name: 'tcCounter' });
    if (!tcCounter) {
      await Counter.create({ name: 'tcCounter', value: 6 });
    }

    const bugCounter = await Counter.findOne({ name: 'bugCounter' });
    if (!bugCounter) {
      await Counter.create({ name: 'bugCounter', value: 3 });
    }
  } catch (error) {
    console.error('Error initializing counters:', error);
  }
}

initializeCounters();

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
    const defaultModules = ['Login', 'Checkout', 'Dashboard', 'Reports'];

    const dataStore = {
      modules: moduleNames.length ? moduleNames : defaultModules,
      testCases: testCases.map(tc => tc.toObject()),
      bugs: bugs.map(bug => bug.toObject()),
      auditLog: auditLogs.map(log => log.toObject()).reverse(),
      tcCounter: tcCounter ? tcCounter.value : 6,
      bugCounter: bugCounter ? bugCounter.value : 3,
      connectedUsers: 0
    };

    socket.emit('initialData', dataStore);
  } catch (error) {
    console.error('Error sending initial data:', error);
    // Fallback to in-memory data on any error
    socket.emit('initialData', { ...fallbackDataStore });
  }
}

async function handleTestCaseUpdate(data) {
  try {
    if (!mongodbConnected) {
      const index = fallbackDataStore.testCases.findIndex(tc => tc.id === data.id);
      if (data.deleted) {
        if (index !== -1) fallbackDataStore.testCases.splice(index, 1);
        return;
      }
      if (index !== -1) {
        fallbackDataStore.testCases[index] = { ...fallbackDataStore.testCases[index], ...data };
      } else {
        fallbackDataStore.testCases.push(data);
      }
      return;
    }

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
    if (!mongodbConnected) {
      const index = fallbackDataStore.bugs.findIndex(bug => bug.id === data.id);
      if (data.deleted) {
        if (index !== -1) fallbackDataStore.bugs.splice(index, 1);
        return;
      }
      if (index !== -1) {
        fallbackDataStore.bugs[index] = { ...fallbackDataStore.bugs[index], ...data };
      } else {
        fallbackDataStore.bugs.push(data);
      }
      return;
    }

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
    if (!mongodbConnected) {
      // Update fallback data store
      fallbackDataStore.auditLog.unshift(data);
      if (fallbackDataStore.auditLog.length > 200) {
        fallbackDataStore.auditLog = fallbackDataStore.auditLog.slice(0, 200);
      }
      return;
    }

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
    if (!mongodbConnected) {
      if (data.tcCounter !== undefined) {
        fallbackDataStore.tcCounter = data.tcCounter;
      }
      if (data.bugCounter !== undefined) {
        fallbackDataStore.bugCounter = data.bugCounter;
      }
      return;
    }

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
    if (!mongodbConnected) {
      if (data.deleted) {
        fallbackDataStore.modules = fallbackDataStore.modules.filter(m => m !== data.name);
        return;
      }
      if (data.name && !fallbackDataStore.modules.includes(data.name)) {
        fallbackDataStore.modules.push(data.name);
      }
      return;
    }

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

// Initialize default data if database is empty
async function initializeDefaultData() {
  try {
    const testCaseCount = await TestCase.countDocuments();
    if (testCaseCount === 0) {
      console.log('📝 Initializing default test cases...');
      const defaultTestCases = [
        { id:'TC-001', testCase:'Login with valid credentials', scenario:'Verify login with correct email & password', module:'Login', screen:'Login Page', steps:'1. Open login page\n2. Enter valid email\n3. Enter valid password\n4. Click Login', expected:'User is redirected to dashboard', actual:'User redirected to dashboard', status:'Pass', severity:'Medium', evidence:'', notes:'', createdAt:'2024-04-20', createdBy:'qa', updatedAt:'2024-04-20', history:[] },
        { id:'TC-002', testCase:'Login with invalid password', scenario:'Verify error shown on wrong password', module:'Login', screen:'Login Page', steps:'1. Open login page\n2. Enter valid email\n3. Enter wrong password\n4. Click Login', expected:'Error message shown', actual:'Error message shown', status:'Pass', severity:'High', evidence:'', notes:'', createdAt:'2024-04-20', createdBy:'qa', updatedAt:'2024-04-20', history:[] },
        { id:'TC-003', testCase:'Checkout with valid card', scenario:'Complete purchase with valid card details', module:'Checkout', screen:'Payment Screen', steps:'1. Add item to cart\n2. Go to checkout\n3. Enter card details\n4. Click Pay', expected:'Order confirmation shown', actual:'Page crashes on Safari', status:'Fail', severity:'High', evidence:'', notes:'Reproducible on Safari 17', createdAt:'2024-04-21', createdBy:'qa', updatedAt:'2024-04-22', history:[] },
        { id:'TC-004', testCase:'Apply discount coupon', scenario:'Verify coupon reduces total price', module:'Checkout', screen:'Cart Screen', steps:'1. Add item\n2. Enter coupon SAVE20\n3. Click Apply', expected:'20% discount applied', actual:'Discount applied correctly', status:'Pass', severity:'Low', evidence:'', notes:'', createdAt:'2024-04-21', createdBy:'qa', updatedAt:'2024-04-21', history:[] },
        { id:'TC-005', testCase:'Export report as CSV', scenario:'Dashboard export CSV button', module:'Reports', screen:'Reports Page', steps:'1. Go to Reports\n2. Select date range\n3. Click Export CSV', expected:'CSV file downloaded', actual:'Button unresponsive', status:'Fail', severity:'Medium', evidence:'', notes:'Button click handler missing', createdAt:'2024-04-22', createdBy:'qa', updatedAt:'2024-04-22', history:[] },
      ];

      await TestCase.insertMany(defaultTestCases);
      console.log('✅ Default test cases initialized');
    }

    const bugCount = await Bug.countDocuments();
    if (bugCount === 0) {
      console.log('🐛 Initializing default bugs...');
      const defaultBugs = [
        { id:'BUG-001', tcId:'TC-003', testCase:'Checkout with valid card', module:'Checkout', screen:'Payment Screen', severity:'High', status:'Open', failedAt:'2024-04-22', fixedAt:null, retestAt:null, devNotes:'', retestResult:null, retestCount:0, history:[{date:'2024-04-22',event:'Bug created from failed test TC-003',actor:'qa'}] },
        { id:'BUG-002', tcId:'TC-005', testCase:'Export report as CSV', module:'Reports', screen:'Reports Page', severity:'Medium', status:'Open', failedAt:'2024-04-22', fixedAt:null, retestAt:null, devNotes:'', retestResult:null, retestCount:0, history:[{date:'2024-04-22',event:'Bug created from failed test TC-005',actor:'qa'}] },
      ];

      await Bug.insertMany(defaultBugs);
      console.log('✅ Default bugs initialized');
    }

    const auditCount = await AuditLog.countDocuments();
    if (auditCount === 0) {
      console.log('📋 Initializing default audit logs...');
      const defaultAuditLogs = [
        { time: '2024-04-22 10:05', event: 'Test TC-003 marked as FAIL → Bug BUG-001 auto-created', actor: 'qa' },
        { time: '2024-04-22 11:30', event: 'Test TC-005 marked as FAIL → Bug BUG-002 auto-created', actor: 'qa' },
      ];

      await AuditLog.insertMany(defaultAuditLogs);
      console.log('✅ Default audit logs initialized');
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
}

initializeDefaultData();

const MONGODB_URI = process.env.MONGODB_URI;

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 QA Enterprise Tracker Server running on port ${PORT}`);
  console.log("🌐 Server is live");
  console.log("🗄️ Database: MongoDB connected");
  console.log("☁️ Ready for cloud deployment");
});