require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

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

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass io to express app so routes can emit events
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/doses', doseRoutes);
app.use('/api/adherence', adherenceRoutes);
app.use('/api/handovers', handoverRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'TheCarePal MedSync API',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Socket.IO Room handling
io.on('connection', (socket) => {
  // Join patient room for live updates
  socket.on('joinPatient', (patientId) => {
    if (patientId) {
      socket.join(`patient_${patientId}`);
      console.log(`Socket ${socket.id} joined room: patient_${patientId}`);
    }
  });

  socket.on('leavePatient', (patientId) => {
    if (patientId) {
      socket.leave(`patient_${patientId}`);
      console.log(`Socket ${socket.id} left room: patient_${patientId}`);
    }
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Database connection & server start
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in environment variables. Please check your .env file.');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB database (TheCarePal MedSync)');
    server.listen(PORT, () => {
      console.log(`TheCarePal MedSync backend server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
