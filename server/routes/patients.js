const express = require('express');
const router = express.Router();
const Patient = require('../models/Patient');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Generate unique 6-digit care code
const generateUniqueCareCode = async () => {
  let isUnique = false;
  let code = '';
  while (!isUnique) {
    code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await Patient.findOne({ careCode: code });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
};

// GET /api/patients - Get all patients accessible by current user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('patients');
    res.json({ patients: user.patients || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patients', error: err.message });
  }
});

// GET /api/patients/:id - Get single patient details
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    res.json({ patient });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patient details', error: err.message });
  }
});

// POST /api/patients - Create a new patient (Family or Caretaker)
router.post('/', auth, async (req, res) => {
  try {
    const { name, age, condition } = req.body;
    if (!name || !age) {
      return res.status(400).json({ message: 'Patient name and age are required' });
    }

    const careCode = await generateUniqueCareCode();
    const patient = await Patient.create({
      name,
      age: Number(age),
      condition: condition || 'Home Care',
      careCode,
      createdBy: req.user._id
    });

    // Link to current user
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { patients: patient._id }
    });

    res.status(201).json({
      message: 'Patient profile created successfully',
      patient
    });
  } catch (err) {
    console.error('Create patient error:', err);
    res.status(500).json({ message: 'Failed to create patient', error: err.message });
  }
});

// POST /api/patients/join - Join a patient via 6-digit Care Code (Caretaker pairing)
router.post('/join', auth, async (req, res) => {
  try {
    const { careCode } = req.body;
    if (!careCode || careCode.trim().length !== 6) {
      return res.status(400).json({ message: 'A valid 6-digit Care Code is required' });
    }

    const patient = await Patient.findOne({ careCode: careCode.trim() });
    if (!patient) {
      return res.status(404).json({ message: 'No patient found matching Care Code: ' + careCode });
    }

    // Add to user's patients list if not already there
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { patients: patient._id }
    });

    res.json({
      message: `Successfully linked with patient ${patient.name}`,
      patient
    });
  } catch (err) {
    console.error('Join patient error:', err);
    res.status(500).json({ message: 'Failed to join patient', error: err.message });
  }
});

module.exports = router;
