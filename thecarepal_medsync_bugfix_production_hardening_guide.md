# TheCarePal MedSync — Production Bug Audit & Full Fix Guide

> **How to use this file with Antigravity:** Save this file in your project root as `BUGFIX_AND_HARDENING.md` and tell Antigravity:
> *"Read `BUGFIX_AND_HARDENING.md` and apply every code update and file cleanup listed in it, then verify both `server` and `client` build cleanly."*

---

## 1. Summary of Bugs Identified (From Live Deployment & Repo Structure)

1. **Critical — Demo Login Failing on Live Deployment (`Demo login failed. Make sure database seed script has run.`):**
   * **Root Cause:** When Render connects to MongoDB Atlas (especially if the database name `/thecarepal_meds` is missing from `MONGODB_URI` or on a fresh cluster), the demo accounts (`rohan.family@demo.com` and `kavita.nurse@demo.com`) do not exist yet, causing `/api/auth/login` to return `400/401`.
   * **Fix:** Add an idempotent `ensureDemoSeed()` helper that automatically seeds the 1-week synthetic dataset (Ramesh Verma `482910`, Rohan Verma, Nurse Kavita, 5 medicines, and 42 past dose logs) on server startup—and as a fallback whenever a `@demo.com` login is attempted—if the demo accounts are missing.

2. **Critical — Strict CORS Blocking Vercel Production & Preview URLs:**
   * **Root Cause:** Exact string matching (`origin: process.env.CLIENT_URL`) breaks if `CLIENT_URL` on Render has a trailing `/` or when Vercel serves a preview deployment URL (`*.vercel.app`).
   * **Fix:** Use a dynamic CORS origin validator in `server/server.js` (for both Express and Socket.IO) that strips trailing slashes and allows `CLIENT_URL`, `http://localhost:5173`, and `*.vercel.app` domains.

3. **High — Double-Slash API URLs (`//api/...`) When `VITE_API_URL` Has a Trailing Slash:**
   * **Root Cause:** Concatenating `${import.meta.env.VITE_API_URL}/api/...` produces `https://thecarepal.onrender.com//api/...` if a trailing slash is entered in Vercel's environment variables.
   * **Fix:** Normalize `API_BASE` with `.replace(/\/+$/, '')` in `client/src/services/api.js` and `client/src/services/socket.js`, and increase the Axios timeout to `60000ms` so Render free-tier cold starts do not prematurely abort the first login request.

4. **High — UTC vs. IST (`UTC+05:30`) Date Drift on Render:**
   * **Root Cause:** Render servers run in UTC (`2026-11-18T03:33:28.743Z`), whereas users in India are on IST (`UTC+05:30`). Between `12:00 AM` and `5:29 AM IST`, `new Date().toISOString().split('T')[0]` on Render returns **yesterday's date**, breaking today's schedule, double-dose lock keys (`scheduledDate`), and the 7-day adherence chart.
   * **Fix:** Use an explicit IST date/time utility (`server/utils/dateIST.js`) across `schedule.js`, `doses.js`, `adherence.js`, and `ensureDemoSeed.js`, while honoring the client's `YYYY-MM-DD` date parameter when provided.

5. **Medium — `Notification` API Crash on Unsupported Browsers & Duplicate Alerts:**
   * **Root Cause:** Calling `Notification.requestPermission()` without checking `'Notification' in window` throws a `ReferenceError` on iOS Safari or restricted WebViews, and 30-second polling can trigger twice within the same minute without deduplication.
   * **Fix:** Guard all `Notification` calls behind `'Notification' in window` and deduplicate alerts per `medicineId_date_time` in `client/src/utils/notifications.js`.

6. **Low — Leftover Vite Starter Boilerplate in `client/`:**
   * **Root Cause:** Unused template files (`client/src/assets/hero.png`, `react.svg`, `vite.svg`, `client/public/icons.svg`, `client/README.md`) clutter the public repository.
   * **Fix:** Delete unused starter assets and set a branded title and SVG favicon in `client/index.html`.

---

## 2. Backend Code Updates (`server/`)

### File 1: Create `server/utils/dateIST.js`
Provides consistent `YYYY-MM-DD` and `HH:mm` values in Indian Standard Time (`Asia/Kolkata`, `UTC+05:30`) regardless of server timezone.

```javascript
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function getISTDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + IST_OFFSET_MS);
}

function formatDateIST(baseDate = new Date()) {
  return getISTDate(baseDate).toISOString().split('T')[0];
}

function formatTimeIST(baseDate = new Date()) {
  return getISTDate(baseDate).toISOString().slice(11, 16);
}

function shiftDaysIST(daysOffset, baseDate = new Date()) {
  const shifted = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return formatDateIST(shifted);
}

module.exports = {
  getISTDate,
  formatDateIST,
  formatTimeIST,
  shiftDaysIST,
};
```

---

### File 2: Create `server/utils/ensureDemoSeed.js`
Automatically and idempotently seeds the 1-week synthetic demo dataset whenever the demo accounts are not yet present in the connected database.

```javascript
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const HandoverNote = require('../models/HandoverNote');
const { formatDateIST, shiftDaysIST } = require('./dateIST');

async function ensureDemoSeed({ forceReset = false } = {}) {
  const existingFamily = await User.findOne({ email: 'rohan.family@demo.com' });
  if (existingFamily && !forceReset) {
    return { seeded: false, message: 'Demo dataset already present.' };
  }

  if (forceReset) {
    await Promise.all([
      User.deleteMany({ email: { $in: ['rohan.family@demo.com', 'kavita.nurse@demo.com'] } }),
      Patient.deleteMany({ careCode: '482910' }),
    ]);
  }

  const hashedPassword = await bcrypt.hash('Demo@123', 10);

  const familyUser = await User.findOneAndUpdate(
    { email: 'rohan.family@demo.com' },
    {
      name: 'Rohan Verma',
      email: 'rohan.family@demo.com',
      password: hashedPassword,
      role: 'family',
    },
    { upsert: true, new: true }
  );

  const caretakerUser = await User.findOneAndUpdate(
    { email: 'kavita.nurse@demo.com' },
    {
      name: 'Nurse Kavita R.',
      email: 'kavita.nurse@demo.com',
      password: hashedPassword,
      role: 'caretaker',
    },
    { upsert: true, new: true }
  );

  let patient = await Patient.findOne({ careCode: '482910' });
  if (!patient) {
    patient = await Patient.create({
      name: 'Ramesh Verma',
      age: 74,
      condition: 'Post-Stroke & Hypertension Care',
      careCode: '482910',
      createdBy: familyUser._id,
    });
  }

  await User.updateMany(
    { _id: { $in: [familyUser._id, caretakerUser._id] } },
    { $addToSet: { patients: patient._id } }
  );

  await Medicine.deleteMany({ patientId: patient._id });
  await DoseLog.deleteMany({ patientId: patient._id });
  await HandoverNote.deleteMany({ patientId: patient._id });

  const startDate = shiftDaysIST(-15);
  const endDate = shiftDaysIST(30);

  const medicines = await Medicine.insertMany([
    {
      patientId: patient._id,
      name: 'Pantoprazole',
      strength: '40mg',
      dose: '1 tablet',
      times: ['07:30'],
      food: 'before',
      startDate,
      endDate,
      currentStock: 14,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Telmisartan',
      strength: '40mg',
      dose: '1 tablet',
      times: ['08:30'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 2, // Triggers immediate "Runs out in 2 days" alert
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Metformin',
      strength: '500mg',
      dose: '1 tablet',
      times: ['09:00', '21:00'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 24,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Donepezil',
      strength: '5mg',
      dose: '1 tablet',
      times: ['14:00'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 10,
      lowStockThresholdDays: 3,
    },
    {
      patientId: patient._id,
      name: 'Atorvastatin',
      strength: '10mg',
      dose: '1 tablet',
      times: ['21:30'],
      food: 'after',
      startDate,
      endDate,
      currentStock: 18,
      lowStockThresholdDays: 3,
    },
  ]);

  const skippedExceptions = {
    [`${shiftDaysIST(-5)}_Donepezil_14:00`]: 'Patient fell asleep right after lunch',
    [`${shiftDaysIST(-3)}_Metformin_21:00`]: 'Mild acidity after dinner; held evening dose',
    [`${shiftDaysIST(-2)}_Telmisartan_08:30`]: 'Fasting for morning blood test',
    [`${shiftDaysIST(-1)}_Donepezil_14:00`]: 'Refused afternoon tablet; took evening medicines normally',
  };

  const logsToInsert = [];

  for (let dayOffset = -7; dayOffset <= -1; dayOffset += 1) {
    const dateStr = shiftDaysIST(dayOffset);
    for (const med of medicines) {
      for (const time of med.times) {
        const key = `${dateStr}_${med.name}_${time}`;
        const skipReason = skippedExceptions[key];
        logsToInsert.push({
          patientId: patient._id,
          medicineId: med._id,
          scheduledDate: dateStr,
          scheduledTime: time,
          status: skipReason ? 'skipped' : 'given',
          reasonText: skipReason || '',
          loggedBy: 'Nurse Kavita R.',
          loggedAt: new Date(`${dateStr}T${time}:00+05:30`),
        });
      }
    }
  }

  // Today (Day 0): Mark only 07:30 Pantoprazole as given; leave remaining 5 doses Pending
  const todayStr = formatDateIST();
  const pantoprazole = medicines.find((m) => m.name === 'Pantoprazole');
  if (pantoprazole) {
    logsToInsert.push({
      patientId: patient._id,
      medicineId: pantoprazole._id,
      scheduledDate: todayStr,
      scheduledTime: '07:30',
      status: 'given',
      reasonText: '',
      loggedBy: 'Nurse Kavita R.',
      loggedAt: new Date(`${todayStr}T07:32:00+05:30`),
    });
  }

  await DoseLog.insertMany(logsToInsert);

  await HandoverNote.insertMany([
    {
      patientId: patient._id,
      shift: 'Night to Day',
      noteText: 'Slept well through the night. Morning BP 128/82 mmHg. Gave Pantoprazole before breakfast.',
      authorName: 'Nurse Kavita R.',
    },
  ]);

  return { seeded: true, message: 'Demo dataset seeded successfully.' };
}

module.exports = { ensureDemoSeed };
```

---

### File 3: Replace `server/seed.js`
Uses `ensureDemoSeed({ forceReset: true })` so `npm run seed` stays 100% consistent with auto-seeding.

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const { ensureDemoSeed } = require('./utils/ensureDemoSeed');

async function runSeed() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not set in environment variables.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas for seeding...');
    const result = await ensureDemoSeed({ forceReset: true });
    console.log(result.message);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

runSeed();
```

---

### File 4: Replace `server/server.js`
Fixes CORS for Vercel production + preview domains, trims trailing slashes, attaches `io` to `app`, and runs `ensureDemoSeed()` on startup.

```javascript
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const medicineRoutes = require('./routes/medicines');
const scheduleRoutes = require('./routes/schedule');
const doseRoutes = require('./routes/doses');
const adherenceRoutes = require('./routes/adherence');
const handoverRoutes = require('./routes/handovers');
const { ensureDemoSeed } = require('./utils/ensureDemoSeed');

const app = express();
const server = http.createServer(app);

const configuredClientUrl = (process.env.CLIENT_URL || '').replace(/\/+$/, '');

function isAllowedOrigin(origin) {
  if (!origin) return true; // Allow curl, Postman, mobile apps, health checks
  const cleanOrigin = origin.replace(/\/+$/, '');
  if (configuredClientUrl === '*' || cleanOrigin === configuredClientUrl) return true;
  if (/^http:\/\/localhost:\d+$/.test(cleanOrigin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(cleanOrigin)) return true;
  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`Socket CORS blocked origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('joinPatientRoom', (patientId) => {
    if (patientId) {
      socket.join(`patient_${patientId}`);
    }
  });

  socket.on('leavePatientRoom', (patientId) => {
    if (patientId) {
      socket.leave(`patient_${patientId}`);
    }
  });
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TheCarePal MedSync API',
    mongoConnection: states[mongoose.connection.readyState] || 'unknown',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/doses', doseRoutes);
app.use('/api/adherence', adherenceRoutes);
app.use('/api/handovers', handoverRoutes);

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Atlas connected');
    await ensureDemoSeed();
    server.listen(PORT, () => {
      console.log(`TheCarePal MedSync API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
```

---

### File 5: Replace `server/routes/auth.js`
Ensures `@demo.com` accounts are guaranteed to exist before credential verification.

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { ensureDemoSeed } = require('../utils/ensureDemoSeed');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'carepal_fallback_secret_2026',
    { expiresIn: '7d' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !['family', 'caretaker'].includes(role)) {
      return res.status(400).json({ message: 'Name, email, password, and valid role are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      patients: [],
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patients: [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.endsWith('@demo.com')) {
      await ensureDemoSeed();
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('patients');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patients: user.patients || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('patients');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        patients: user.patients || [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile.', error: err.message });
  }
});

module.exports = router;
```

---

### File 6: Replace `server/routes/schedule.js`
Uses IST-safe `formatDateIST()` fallback so late-night/early-morning IST schedules never shift to UTC yesterday.

```javascript
const express = require('express');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const authMiddleware = require('../middleware/auth');
const { formatDateIST } = require('../utils/dateIST');

const router = express.Router();

function getTimeBucket(timeStr) {
  const hour = parseInt(timeStr.split(':')[0], 10);
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 17) return 'Afternoon';
  return 'Night';
}

router.get('/today/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const today = req.query.date || formatDateIST();

    const medicines = await Medicine.find({
      patientId,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    const logs = await DoseLog.find({
      patientId,
      scheduledDate: today,
    });

    const logMap = new Map();
    logs.forEach((log) => {
      logMap.set(`${log.medicineId.toString()}_${log.scheduledTime}`, log);
    });

    const slots = [];
    for (const med of medicines) {
      const dailyCount = med.times.length || 1;
      const daysRemaining = Math.floor(med.currentStock / dailyCount);
      const isLowStock = daysRemaining <= (med.lowStockThresholdDays ?? 3);

      for (const time of med.times) {
        const log = logMap.get(`${med._id.toString()}_${time}`);
        slots.push({
          medicineId: med._id,
          name: med.name,
          strength: med.strength,
          dose: med.dose,
          food: med.food,
          scheduledDate: today,
          scheduledTime: time,
          bucket: getTimeBucket(time),
          currentStock: med.currentStock,
          daysRemaining,
          isLowStock,
          status: log ? log.status : 'pending',
          reasonText: log ? log.reasonText : '',
          loggedBy: log ? log.loggedBy : '',
          loggedAt: log ? log.loggedAt : null,
        });
      }
    }

    slots.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    res.json({
      date: today,
      grouped: {
        Morning: slots.filter((s) => s.bucket === 'Morning'),
        Afternoon: slots.filter((s) => s.bucket === 'Afternoon'),
        Night: slots.filter((s) => s.bucket === 'Night'),
      },
      slots,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load daily schedule.', error: err.message });
  }
});

module.exports = router;
```

---

### File 7: Replace `server/routes/doses.js`
Enforces mandatory skip reasons, prevents double-dosing (`HTTP 409`), decrements stock safely, and emits Socket.IO updates.

```javascript
const express = require('express');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const authMiddleware = require('../middleware/auth');
const { formatDateIST } = require('../utils/dateIST');

const router = express.Router();

router.post('/log', authMiddleware, async (req, res) => {
  try {
    const {
      patientId,
      medicineId,
      scheduledDate,
      scheduledTime,
      status,
      reasonText = '',
    } = req.body;

    if (!patientId || !medicineId || !scheduledTime || !['given', 'skipped'].includes(status)) {
      return res.status(400).json({ message: 'Missing required dose log fields.' });
    }

    if (status === 'skipped' && !reasonText.trim()) {
      return res.status(400).json({ message: 'A reason is required when marking a dose as Skipped.' });
    }

    const effectiveDate = scheduledDate || formatDateIST();

    const existingLog = await DoseLog.findOne({
      patientId,
      medicineId,
      scheduledDate: effectiveDate,
      scheduledTime,
    });

    if (existingLog) {
      return res.status(409).json({
        message: `Dose already marked as ${existingLog.status} by ${existingLog.loggedBy}.`,
        log: existingLog,
      });
    }

    const log = await DoseLog.create({
      patientId,
      medicineId,
      scheduledDate: effectiveDate,
      scheduledTime,
      status,
      reasonText: status === 'skipped' ? reasonText.trim() : '',
      loggedBy: req.user.name || 'Caregiver',
      loggedAt: new Date(),
    });

    if (status === 'given') {
      await Medicine.findOneAndUpdate(
        { _id: medicineId, currentStock: { $gt: 0 } },
        { $inc: { currentStock: -1 } }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('scheduleUpdated', {
        patientId,
        medicineId,
        scheduledDate: effectiveDate,
        scheduledTime,
        status,
      });
    }

    res.status(201).json({ message: `Dose marked as ${status}.`, log });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate dose log prevented (double-dose lock).' });
    }
    res.status(500).json({ message: 'Failed to log dose.', error: err.message });
  }
});

module.exports = router;
```

---

### File 8: Replace `server/routes/adherence.js`
Computes the 7-day adherence percentage, daily bar chart data, skipped doses feed, and low-stock refill warnings using IST dates.

```javascript
const express = require('express');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const authMiddleware = require('../middleware/auth');
const { formatDateIST, shiftDaysIST } = require('../utils/dateIST');

const router = express.Router();

router.get('/weekly/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const today = req.query.date || formatDateIST();
    const startWindow = shiftDaysIST(-7);

    const medicines = await Medicine.find({ patientId });
    const medMap = new Map(medicines.map((m) => [m._id.toString(), m]));

    const logs = await DoseLog.find({
      patientId,
      scheduledDate: { $gte: startWindow, $lte: today },
    }).sort({ scheduledDate: -1, scheduledTime: -1 });

    // Build 7-day breakdown (Day -6 through Today)
    const dailyStats = [];
    let totalScheduled = 0;
    let totalGiven = 0;

    for (let offset = -6; offset <= 0; offset += 1) {
      const dateStr = shiftDaysIST(offset);
      const dayLogs = logs.filter((l) => l.scheduledDate === dateStr);
      const givenCount = dayLogs.filter((l) => l.status === 'given').length;
      const skippedCount = dayLogs.filter((l) => l.status === 'skipped').length;

      // Active scheduled slots for that date
      let scheduledForDay = 0;
      for (const med of medicines) {
        if (med.startDate <= dateStr && med.endDate >= dateStr) {
          scheduledForDay += med.times.length;
        }
      }

      const denominator = Math.max(scheduledForDay, givenCount + skippedCount);
      totalScheduled += denominator;
      totalGiven += givenCount;

      dailyStats.push({
        date: dateStr,
        label: new Date(`${dateStr}T12:00:00+05:30`).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
        }),
        given: givenCount,
        skipped: skippedCount,
        scheduled: denominator,
        percentage: denominator > 0 ? Math.round((givenCount / denominator) * 100) : 100,
      });
    }

    const adherencePercentage =
      totalScheduled > 0 ? Math.round((totalGiven / totalScheduled) * 1000) / 10 : 100;

    const skippedFeed = logs
      .filter((l) => l.status === 'skipped')
      .map((l) => {
        const med = medMap.get(l.medicineId.toString());
        return {
          id: l._id,
          medicineName: med ? `${med.name} ${med.strength}` : 'Medication',
          scheduledDate: l.scheduledDate,
          scheduledTime: l.scheduledTime,
          reasonText: l.reasonText || 'No reason provided',
          loggedBy: l.loggedBy,
        };
      });

    const lowStockAlerts = medicines
      .map((med) => {
        const dailyCount = med.times.length || 1;
        const daysRemaining = Math.floor(med.currentStock / dailyCount);
        return {
          medicineId: med._id,
          name: med.name,
          strength: med.strength,
          currentStock: med.currentStock,
          daysRemaining,
          thresholdDays: med.lowStockThresholdDays ?? 3,
        };
      })
      .filter((item) => item.daysRemaining <= item.thresholdDays);

    res.json({
      adherencePercentage,
      totalGiven,
      totalScheduled,
      dailyStats,
      skippedFeed,
      lowStockAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute weekly adherence.', error: err.message });
  }
});

module.exports = router;
```

---

## 3. Frontend Code Updates (`client/`)

### File 9: Replace `client/src/services/api.js`
Strips trailing slashes from `VITE_API_URL` and sets a `60000ms` timeout so Render free-tier cold starts succeed cleanly.

```javascript
import axios from 'axios';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carepal_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

### File 10: Replace `client/src/services/socket.js`
Shares the exact normalized `API_BASE_URL` for Socket.IO connections.

```javascript
import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
```

---

### File 11: Replace `client/src/utils/notifications.js`
Safely checks browser `Notification` support and deduplicates scheduled alerts per minute.

```javascript
const triggeredKeys = new Set();

export async function requestReminderPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export function playReminderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore autoplay restriction errors before user gesture
  }
}

export function fireDoseNotification({ title, body, dedupeKey }) {
  if (dedupeKey) {
    if (triggeredKeys.has(dedupeKey)) return false;
    triggeredKeys.add(dedupeKey);
  }

  playReminderChime();

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
    });
  }
  return true;
}
```

---

### File 12: Replace `client/index.html` & Clean Unused Vite Assets
1. Delete these unused Vite starter files if they still exist:
   * `client/src/assets/hero.png`
   * `client/src/assets/react.svg`
   * `client/src/assets/vite.svg`
   * `client/public/icons.svg`
   * `client/README.md`
2. Update `client/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TheCarePal MedSync — Shared Medication & Adherence Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-slate-50 text-slate-900 antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## 4. Post-Fix Verification Checklist
1. Push updated code to GitHub → Render and Vercel will auto-redeploy.
2. Open `https://thecarepal.onrender.com/api/health` and verify `"mongoConnection": "connected"`.
3. Open your Vercel app URL → click **Demo: Family** and **Demo: Caretaker** (auto-seeding guarantees immediate login even on a fresh database).
4. Mark a dose **Given** in Caretaker View and confirm double-dose lock + live Family View update.