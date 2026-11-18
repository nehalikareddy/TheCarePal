const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
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

  socket.on('joinPatient', (patientId) => {
    if (patientId) {
      socket.join(`patient_${patientId}`);
    }
  });

  socket.on('leavePatientRoom', (patientId) => {
    if (patientId) {
      socket.leave(`patient_${patientId}`);
    }
  });

  socket.on('leavePatient', (patientId) => {
    if (patientId) {
      socket.leave(`patient_${patientId}`);
    }
  });

  socket.on('joinUserRoom', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('leaveUserRoom', (userId) => {
    if (userId) {
      socket.leave(`user_${userId}`);
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

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

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
