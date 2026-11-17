const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

// Helper to determine time slot
const getTimeSlot = (timeStr) => {
  // timeStr is "HH:mm"
  const [hourStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  if (hour >= 5 && hour < 12) {
    return 'Morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  } else {
    return 'Night';
  }
};

// GET /api/schedule/today/:patientId
router.get('/today/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Allow querying specific date via query param or default to today in YYYY-MM-DD
    const today = req.query.date || new Date().toISOString().split('T')[0];

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Active medicines for today: startDate <= today <= endDate
    const activeMedicines = await Medicine.find({
      patientId,
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    // Existing dose logs for this patient and date
    const doseLogs = await DoseLog.find({
      patientId,
      scheduledDate: today
    });

    // Map logs by key: medicineId_scheduledTime
    const logMap = new Map();
    doseLogs.forEach((log) => {
      const key = `${log.medicineId.toString()}_${log.scheduledTime}`;
      logMap.set(key, log);
    });

    const doses = [];
    let givenCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;

    activeMedicines.forEach((med) => {
      const dailyTimesCount = med.times.length || 1;
      const daysRemaining = Math.floor(med.currentStock / dailyTimesCount);
      const isLowStock = daysRemaining <= (med.lowStockThresholdDays || 3);

      med.times.forEach((time) => {
        const key = `${med._id.toString()}_${time}`;
        const existingLog = logMap.get(key) || null;

        let status = 'pending';
        if (existingLog) {
          status = existingLog.status;
          if (status === 'given') givenCount++;
          if (status === 'skipped') skippedCount++;
        } else {
          pendingCount++;
        }

        doses.push({
          doseId: `${med._id}_${time}`,
          medicineId: med._id,
          name: med.name,
          strength: med.strength,
          dose: med.dose,
          scheduledTime: time,
          food: med.food,
          slot: getTimeSlot(time),
          currentStock: med.currentStock,
          lowStockThresholdDays: med.lowStockThresholdDays,
          daysRemaining,
          isLowStock,
          prescriptionImageUrl: med.prescriptionImageUrl || '',
          status, // 'pending' | 'given' | 'skipped'
          log: existingLog ? {
            _id: existingLog._id,
            status: existingLog.status,
            reasonText: existingLog.reasonText,
            loggedBy: existingLog.loggedBy,
            loggedAt: existingLog.loggedAt
          } : null
        });
      });
    });

    // Sort doses chronologically
    doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    res.json({
      date: today,
      patient: {
        id: patient._id,
        name: patient.name,
        age: patient.age,
        condition: patient.condition,
        careCode: patient.careCode
      },
      summary: {
        total: doses.length,
        given: givenCount,
        skipped: skippedCount,
        pending: pendingCount
      },
      doses
    });
  } catch (err) {
    console.error('Schedule fetch error:', err);
    res.status(500).json({ message: 'Error retrieving today schedule', error: err.message });
  }
});

module.exports = router;
