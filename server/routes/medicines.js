const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');

// GET /api/medicines/patient/:patientId
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const medicines = await Medicine.find({ patientId: req.params.patientId }).sort({ createdAt: -1 });
    res.json({ medicines });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching medicines', error: err.message });
  }
});

// POST /api/medicines - Create medicine
router.post('/', auth, async (req, res) => {
  try {
    const {
      patientId,
      name,
      strength,
      dose,
      times,
      food,
      startDate,
      endDate,
      currentStock,
      lowStockThresholdDays,
      prescriptionImageUrl
    } = req.body;

    const effectiveEndDate = endDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    if (!patientId || !name || !strength || !dose || !times || !startDate) {
      return res.status(400).json({
        message: 'Missing required medicine fields (patientId, name, strength, dose, times, startDate)'
      });
    }

    if (!Array.isArray(times) || times.length === 0) {
      return res.status(400).json({ message: 'At least one scheduled time (HH:mm) is required' });
    }

    const medicine = await Medicine.create({
      patientId,
      name,
      strength,
      dose,
      times,
      food: food || 'after',
      startDate,
      endDate: effectiveEndDate,
      currentStock: currentStock !== undefined ? Number(currentStock) : 10,
      lowStockThresholdDays: lowStockThresholdDays !== undefined ? Number(lowStockThresholdDays) : 3,
      prescriptionImageUrl: prescriptionImageUrl || ''
    });

    // Notify connected sockets of medicine list update
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('scheduleUpdated', {
        type: 'MEDICINE_ADDED',
        patientId
      });
    }

    res.status(201).json({
      message: 'Medicine added successfully',
      medicine
    });
  } catch (err) {
    console.error('Create medicine error:', err);
    res.status(500).json({ message: 'Failed to add medicine', error: err.message });
  }
});

// PUT /api/medicines/:id - Update medicine details (e.g. stock refill)
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${updated.patientId}`).emit('scheduleUpdated', {
        type: 'MEDICINE_UPDATED',
        patientId: updated.patientId
      });
    }

    res.json({ message: 'Medicine updated successfully', medicine: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update medicine', error: err.message });
  }
});

// DELETE /api/medicines/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const med = await Medicine.findById(req.params.id);
    if (!med) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    await Medicine.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${med.patientId}`).emit('scheduleUpdated', {
        type: 'MEDICINE_DELETED',
        patientId: med.patientId
      });
    }

    res.json({ message: 'Medicine removed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete medicine', error: err.message });
  }
});

module.exports = router;
