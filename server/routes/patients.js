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

    // Real-time socket event notifying family that a caregiver has joined
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patient._id}`).emit('caregiverJoined', {
        patientId: patient._id,
        patientName: patient.name,
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        }
      });
    }

    res.json({
      message: `Successfully linked with patient ${patient.name}`,
      patient
    });
  } catch (err) {
    console.error('Join patient error:', err);
    res.status(500).json({ message: 'Failed to join patient', error: err.message });
  }
});

// GET /api/patients/:id/members - Get all linked care team members (family and caretakers)
router.get('/:id/members', auth, async (req, res) => {
  try {
    const patientId = req.params.id;

    // Verify caller has access to this patient
    const caller = await User.findOne({ _id: req.user._id, patients: patientId });
    if (!caller) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this patient care team' });
    }

    const members = await User.find(
      { patients: patientId },
      '_id name email role createdAt'
    ).sort({ role: 1, name: 1 });

    res.json({ members });
  } catch (err) {
    console.error('Fetch members error:', err);
    res.status(500).json({ message: 'Failed to fetch care team members', error: err.message });
  }
});

// DELETE /api/patients/:id/members/:userId - Revoke caretaker access (family only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id: patientId, userId } = req.params;

    if (req.user.role !== 'family') {
      return res.status(403).json({ message: 'Only family administrators can manage and revoke care team access' });
    }

    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ message: 'Cannot revoke your own access as family administrator' });
    }

    // Verify patient belongs to caller
    const caller = await User.findOne({ _id: req.user._id, patients: patientId });
    if (!caller) {
      return res.status(403).json({ message: 'Access denied to this patient profile' });
    }

    // Remove patient from target user's patients list
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { patients: patientId } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Real-time socket notification for immediate revocation in UI
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('accessRevoked', {
        patientId,
        revokedUserId: userId
      });
    }

    res.json({ message: 'Caregiver access successfully revoked', userId });
  } catch (err) {
    console.error('Revoke access error:', err);
    res.status(500).json({ message: 'Failed to revoke care team access', error: err.message });
  }
});

// POST /api/patients/:id/rotate-code - Generate and rotate 6-digit Care Code (family only)
router.post('/:id/rotate-code', auth, async (req, res) => {
  try {
    const patientId = req.params.id;

    if (req.user.role !== 'family') {
      return res.status(403).json({ message: 'Only family administrators can rotate the patient Care Code' });
    }

    // Verify caller is linked to patient
    const caller = await User.findOne({ _id: req.user._id, patients: patientId });
    if (!caller) {
      return res.status(403).json({ message: 'Access denied to this patient profile' });
    }

    const newCode = await generateUniqueCareCode();
    const patient = await Patient.findByIdAndUpdate(
      patientId,
      { careCode: newCode },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    // Emit live update to patient room so UI updates instantaneously
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patient._id}`).emit('patientUpdated', patient);
    }

    res.json({
      message: 'Care Code rotated successfully',
      patient
    });
  } catch (err) {
    console.error('Rotate care code error:', err);
    res.status(500).json({ message: 'Failed to rotate Care Code', error: err.message });
  }
});

module.exports = router;
