const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

// POST /api/doses/log - Log a dose (Given or Skipped)
router.post('/log', auth, async (req, res) => {
  try {
    const { patientId, medicineId, scheduledDate, scheduledTime, status, reasonText } = req.body;

    if (!patientId || !medicineId || !scheduledDate || !scheduledTime || !status) {
      return res.status(400).json({ message: 'Missing required dose logging fields' });
    }

    if (!['given', 'skipped'].includes(status)) {
      return res.status(400).json({ message: "Status must be either 'given' or 'skipped'" });
    }

    if (status === 'skipped' && (!reasonText || !reasonText.trim())) {
      return res.status(400).json({ message: 'A reason is required when skipping a dose' });
    }

    // Check for existing log to prevent double-dosing
    const existingLog = await DoseLog.findOne({
      patientId,
      medicineId,
      scheduledDate,
      scheduledTime
    });

    if (existingLog) {
      return res.status(409).json({
        message: `This dose was already marked as ${existingLog.status.toUpperCase()} by ${existingLog.loggedBy} on ${new Date(existingLog.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        existingLog
      });
    }

    // Find medicine to verify and update stock
    const medicine = await Medicine.findById(medicineId);
    if (!medicine) {
      return res.status(404).json({ message: 'Associated medicine not found' });
    }

    // Create DoseLog
    const doseLog = await DoseLog.create({
      patientId,
      medicineId,
      scheduledDate,
      scheduledTime,
      status,
      reasonText: status === 'skipped' ? reasonText.trim() : '',
      loggedBy: req.user.name || 'Caregiver',
      loggedAt: new Date()
    });

    // If marked as given, decrement stock by 1
    if (status === 'given') {
      medicine.currentStock = Math.max(0, medicine.currentStock - 1);
      await medicine.save();
    }

    // Real-time synchronization via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('scheduleUpdated', {
        type: 'DOSE_LOGGED',
        patientId,
        scheduledDate,
        doseLog,
        medicine: {
          _id: medicine._id,
          name: medicine.name,
          currentStock: medicine.currentStock
        }
      });
    }

    res.status(201).json({
      message: `Dose successfully marked as ${status}`,
      doseLog,
      updatedStock: medicine.currentStock
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This dose was already recorded to prevent double dosing.' });
    }
    console.error('Dose log error:', err);
    res.status(500).json({ message: 'Failed to record dose', error: err.message });
  }
});

module.exports = router;
