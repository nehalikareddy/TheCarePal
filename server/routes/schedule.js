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
          doseId: `${med._id}_${time}`,
          medicineId: med._id,
          name: med.name,
          strength: med.strength,
          dose: med.dose,
          food: med.food,
          scheduledDate: today,
          scheduledTime: time,
          slot: getTimeBucket(time),
          bucket: getTimeBucket(time),
          currentStock: med.currentStock,
          daysRemaining,
          isLowStock,
          status: log ? log.status : 'pending',
          reasonText: log ? log.reasonText : '',
          loggedBy: log ? log.loggedBy : '',
          loggedAt: log ? log.loggedAt : null,
          log: log
            ? {
                _id: log._id,
                status: log.status,
                reasonText: log.reasonText,
                loggedBy: log.loggedBy,
                loggedAt: log.loggedAt,
              }
            : null,
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
      doses: slots,
      summary: {
        total: slots.length,
        given: slots.filter((s) => s.status === 'given').length,
        skipped: slots.filter((s) => s.status === 'skipped').length,
        pending: slots.filter((s) => s.status === 'pending').length,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load daily schedule.', error: err.message });
  }
});

module.exports = router;
