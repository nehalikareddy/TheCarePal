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

    const dailyStats = [];
    let totalScheduled = 0;
    let totalGiven = 0;
    let totalSkipped = 0;

    for (let offset = -6; offset <= 0; offset += 1) {
      const dateStr = shiftDaysIST(offset);
      const dayLogs = logs.filter((l) => l.scheduledDate === dateStr);
      const givenCount = dayLogs.filter((l) => l.status === 'given').length;
      const skippedCount = dayLogs.filter((l) => l.status === 'skipped').length;

      let scheduledForDay = 0;
      for (const med of medicines) {
        if (med.startDate <= dateStr && med.endDate >= dateStr) {
          scheduledForDay += med.times.length;
        }
      }

      const denominator = Math.max(scheduledForDay, givenCount + skippedCount);
      totalScheduled += denominator;
      totalGiven += givenCount;
      totalSkipped += skippedCount;

      const dateObj = new Date(`${dateStr}T12:00:00+05:30`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayTotal = denominator;
      const rate = dayTotal > 0 ? Math.round((givenCount / dayTotal) * 100) : null;

      dailyStats.push({
        date: dateStr,
        dayName,
        displayDate,
        label: `${dayName}, ${displayDate}`,
        given: givenCount,
        skipped: skippedCount,
        scheduled: dayTotal,
        total: dayTotal,
        rate,
        adherenceRate: rate,
        percentage: rate,
      });
    }

    const totalSlots = totalScheduled;
    const hasScheduledDoses = totalSlots > 0;
    const adherenceRate = hasScheduledDoses
      ? Math.round((totalGiven / totalSlots) * 1000) / 10
      : null;
    const adherencePercentage = adherenceRate;
    const weeklyAdherence = adherenceRate !== null ? Math.round(adherenceRate) : null;

    const skippedFeed = logs
      .filter((l) => l.status === 'skipped')
      .map((l) => {
        const med = medMap.get(l.medicineId.toString());
        return {
          id: l._id,
          medicineName: med ? med.name : 'Medication',
          strength: med ? med.strength : '',
          dose: med ? med.dose : '',
          scheduledDate: l.scheduledDate,
          scheduledTime: l.scheduledTime,
          reasonText: l.reasonText || 'No reason provided',
          caregiver: l.loggedBy || 'Caregiver',
          loggedBy: l.loggedBy,
          loggedAt: l.loggedAt,
        };
      });

    const lowStockAlerts = medicines
      .map((med) => {
        const dailyCount = med.times.length || 1;
        const daysRemaining = Math.floor(med.currentStock / dailyCount);
        return {
          id: med._id,
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
      hasScheduledDoses,
      adherenceRate,
      adherencePercentage,
      weeklyAdherence,
      totalSlots,
      totalScheduled: totalSlots,
      totalGiven,
      totalSkipped,
      summary: {
        totalSlots,
        totalScheduled: totalSlots,
        totalGiven,
        totalSkipped,
        totalPending: Math.max(0, totalSlots - (totalGiven + totalSkipped)),
      },
      dailyStats,
      dailyTrends: dailyStats,
      skippedFeed,
      skippedDosesFeed: skippedFeed,
      lowStockAlerts,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute weekly adherence.', error: err.message });
  }
});

module.exports = router;
