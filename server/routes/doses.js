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
        message: `Dose already marked as ${existingLog.status.toUpperCase()} by ${existingLog.loggedBy}.`,
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

    let updatedStock = undefined;
    if (status === 'given') {
      const updatedMed = await Medicine.findOneAndUpdate(
        { _id: medicineId, currentStock: { $gt: 0 } },
        { $inc: { currentStock: -1 } },
        { new: true }
      );
      if (updatedMed) {
        updatedStock = updatedMed.currentStock;
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('scheduleUpdated', {
        type: 'DOSE_LOGGED',
        patientId,
        medicineId,
        scheduledDate: effectiveDate,
        scheduledTime,
        status,
        doseLog: log,
      });
    }

    res.status(201).json({
      message: `Dose marked as ${status}.`,
      log,
      doseLog: log,
      updatedStock,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate dose log prevented (double-dose lock).' });
    }
    res.status(500).json({ message: 'Failed to log dose.', error: err.message });
  }
});

module.exports = router;
