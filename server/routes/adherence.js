const express = require('express');
const router = express.Router();
const DoseLog = require('../models/DoseLog');
const Medicine = require('../models/Medicine');
const Patient = require('../models/Patient');
const auth = require('../middleware/auth');

// Format date helper: YYYY-MM-DD
const formatDateStr = (d) => {
  return d.toISOString().split('T')[0];
};

// GET /api/adherence/weekly/:patientId
router.get('/weekly/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Build the list of past 7 days [Day -6, ..., Today]
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(formatDateStr(d));
    }

    const startDate = days[0];
    const endDate = days[days.length - 1];

    // Fetch all medicines that overlapped this 7-day window
    const medicines = await Medicine.find({
      patientId,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    });

    // Fetch all dose logs in this 7-day window
    const doseLogs = await DoseLog.find({
      patientId,
      scheduledDate: { $gte: startDate, $lte: endDate }
    }).populate('medicineId', 'name strength dose');

    // Aggregate logs by date
    const logsByDate = new Map();
    days.forEach(d => logsByDate.set(d, []));
    doseLogs.forEach(log => {
      if (logsByDate.has(log.scheduledDate)) {
        logsByDate.get(log.scheduledDate).push(log);
      }
    });

    let totalWeeklyScheduled = 0;
    let totalWeeklyGiven = 0;
    let totalWeeklySkipped = 0;

    const dailyTrends = days.map((dateStr) => {
      // Find medicines active on this specific date
      const activeOnDate = medicines.filter(m => m.startDate <= dateStr && m.endDate >= dateStr);
      let scheduledForDay = 0;
      activeOnDate.forEach(m => {
        scheduledForDay += (m.times ? m.times.length : 1);
      });

      const dayLogs = logsByDate.get(dateStr) || [];
      const givenCount = dayLogs.filter(l => l.status === 'given').length;
      const skippedCount = dayLogs.filter(l => l.status === 'skipped').length;

      totalWeeklyScheduled += scheduledForDay;
      totalWeeklyGiven += givenCount;
      totalWeeklySkipped += skippedCount;

      const dateObj = new Date(dateStr + 'T00:00:00Z');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const displayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

      const adherenceRate = scheduledForDay > 0
        ? Math.round((givenCount / scheduledForDay) * 100)
        : 100;

      return {
        date: dateStr,
        dayName,
        displayDate,
        scheduled: scheduledForDay,
        given: givenCount,
        skipped: skippedCount,
        adherenceRate
      };
    });

    // Overall weekly adherence %
    const weeklyAdherence = totalWeeklyScheduled > 0
      ? Math.round((totalWeeklyGiven / totalWeeklyScheduled) * 100)
      : 100;

    // Skipped doses feed (sorted most recent first)
    const skippedLogs = doseLogs
      .filter(l => l.status === 'skipped')
      .sort((a, b) => {
        const timeA = `${a.scheduledDate} ${a.scheduledTime}`;
        const timeB = `${b.scheduledDate} ${b.scheduledTime}`;
        return timeB.localeCompare(timeA);
      })
      .map(log => ({
        id: log._id,
        medicineName: log.medicineId ? log.medicineId.name : 'Prescribed Medicine',
        strength: log.medicineId ? log.medicineId.strength : '',
        dose: log.medicineId ? log.medicineId.dose : '',
        scheduledDate: log.scheduledDate,
        scheduledTime: log.scheduledTime,
        reasonText: log.reasonText || 'No reason provided',
        caregiver: log.loggedBy || 'Caregiver',
        loggedAt: log.loggedAt
      }));

    // Calculate low stock warnings for all active medicines
    const allPatientMedicines = await Medicine.find({ patientId });
    const lowStockAlerts = [];
    allPatientMedicines.forEach(m => {
      const timesPerDay = m.times.length || 1;
      const daysRemaining = Math.floor(m.currentStock / timesPerDay);
      if (daysRemaining <= (m.lowStockThresholdDays || 3)) {
        lowStockAlerts.push({
          id: m._id,
          name: m.name,
          strength: m.strength,
          currentStock: m.currentStock,
          dailyRequirement: timesPerDay,
          daysRemaining,
          thresholdDays: m.lowStockThresholdDays || 3
        });
      }
    });

    res.json({
      patientId,
      patientName: patient.name,
      weeklyAdherence,
      summary: {
        totalScheduled: totalWeeklyScheduled,
        totalGiven: totalWeeklyGiven,
        totalSkipped: totalWeeklySkipped,
        totalPending: Math.max(0, totalWeeklyScheduled - (totalWeeklyGiven + totalWeeklySkipped))
      },
      dailyTrends,
      skippedDosesFeed: skippedLogs,
      lowStockAlerts
    });
  } catch (err) {
    console.error('Adherence calculation error:', err);
    res.status(500).json({ message: 'Error calculating weekly adherence', error: err.message });
  }
});

module.exports = router;
