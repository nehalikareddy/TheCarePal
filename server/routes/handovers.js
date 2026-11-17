const express = require('express');
const router = express.Router();
const HandoverNote = require('../models/HandoverNote');
const auth = require('../middleware/auth');

// GET /api/handovers/:patientId
router.get('/:patientId', auth, async (req, res) => {
  try {
    const notes = await HandoverNote.find({ patientId: req.params.patientId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving handover notes', error: err.message });
  }
});

// POST /api/handovers/:patientId
router.post('/:patientId', auth, async (req, res) => {
  try {
    const { shift, noteText } = req.body;
    const { patientId } = req.params;

    if (!shift || !noteText) {
      return res.status(400).json({ message: 'Shift type and note content are required' });
    }

    if (!['Day to Night', 'Night to Day'].includes(shift)) {
      return res.status(400).json({ message: "Shift must be 'Day to Night' or 'Night to Day'" });
    }

    const note = await HandoverNote.create({
      patientId,
      shift,
      noteText: noteText.trim(),
      authorName: req.user.name || 'Caregiver',
      createdAt: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('handoverAdded', note);
    }

    res.status(201).json({ message: 'Handover note added successfully', note });
  } catch (err) {
    res.status(500).json({ message: 'Error creating handover note', error: err.message });
  }
});

module.exports = router;
