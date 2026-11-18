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

// Helper: Verify if current caller is an authorized family member for this patient
const verifyFamilyMemberForPatient = async (req, patientId) => {
  const callerId = String(
    req.user?.id ||
    req.user?._id ||
    req.user?.userId ||
    req.user?.user?.id ||
    req.user?.user?._id ||
    ''
  );
  if (!callerId) return null;

  const caller = await User.findById(callerId);
  const patient = await Patient.findById(patientId);

  if (!caller || !patient) return null;
  if (caller.role !== 'family') return null;

  // Verify caller is linked to patient (check caller.patients or patient's family/member references)
  const isLinkedToUser = (caller.patients || []).some(
    (p) => String(p._id || p) === String(patient._id)
  );

  const isLinkedOnPatient =
    String(patient.createdBy) === callerId ||
    (patient.family || []).some((f) => String(f._id || f) === callerId) ||
    (patient.members || []).some((m) => String(m._id || m) === callerId) ||
    (patient.caretakers || []).some((c) => String(c._id || c) === callerId);

  if (isLinkedToUser || isLinkedOnPatient) {
    if (!isLinkedToUser) {
      await User.findByIdAndUpdate(callerId, { $addToSet: { patients: patient._id } });
    }
    return { caller, patient };
  }

  return null;
};

// GET /api/patients - Get all patients accessible by current user
router.get('/', auth, async (req, res) => {
  try {
    const callerId = String(req.user?.id || req.user?._id || req.user?.userId || req.user?.user?.id || '');
    const user = await User.findById(callerId).populate('patients');
    res.json({ patients: user?.patients || [] });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching patients', error: err.message });
  }
});

// GET /api/patients/my-pending - Get all pending requests for current user (caretaker view across page refreshes)
router.get('/my-pending', auth, async (req, res) => {
  try {
    const callerId = String(req.user?.id || req.user?._id || req.user?.userId || req.user?.user?.id || '');
    const pendingPatients = await Patient.find(
      { 'pendingMembers.userId': callerId },
      '_id name age condition careCode pendingMembers'
    );
    const formatted = pendingPatients.map((p) => {
      const myRequest = (p.pendingMembers || []).find(
        (pm) => String(pm.userId) === callerId
      );
      return {
        _id: p._id,
        name: p.name,
        age: p.age,
        condition: p.condition,
        careCode: p.careCode,
        requestedAt: myRequest?.requestedAt || p.updatedAt
      };
    });
    res.json({ pending: formatted });
  } catch (err) {
    console.error('Fetch my pending error:', err);
    res.status(500).json({ message: 'Failed to fetch pending requests', error: err.message });
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
    const callerId = String(req.user?.id || req.user?._id || req.user?.userId || req.user?.user?.id || '');
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
      createdBy: callerId,
      family: [callerId],
      pendingMembers: []
    });

    // Link to current user
    await User.findByIdAndUpdate(callerId, {
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

// POST /api/patients/join - Pair via 6-digit Care Code with Family Approval Workflow
router.post('/join', auth, async (req, res) => {
  try {
    const { careCode } = req.body;
    if (!careCode || careCode.trim().length !== 6) {
      return res.status(400).json({ message: 'A valid 6-digit Care Code is required' });
    }

    const patient = await Patient.findOne({ careCode: careCode.trim().toUpperCase() });
    if (!patient) {
      return res.status(404).json({ message: 'No patient found matching Care Code: ' + careCode });
    }

    const callerId = String(req.user?.id || req.user?._id || req.user?.userId || req.user?.user?.id || '');
    const currentUser = await User.findById(callerId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 1. If already linked, return success with alreadyLinked
    const isAlreadyLinked = (currentUser.patients || []).some(
      (p) => String(p._id || p) === String(patient._id)
    );
    if (isAlreadyLinked) {
      return res.json({
        message: `You already have access to ${patient.name}`,
        patient,
        alreadyLinked: true
      });
    }

    // 2. If already in pendingMembers, notify waiting
    const isAlreadyPending = (patient.pendingMembers || []).some(
      (pm) => String(pm.userId) === String(currentUser._id)
    );
    if (isAlreadyPending) {
      return res.status(200).json({
        pending: true,
        patientName: patient.name,
        patient: { _id: patient._id, name: patient.name },
        message: 'Approval request already pending.'
      });
    }

    // 3. Otherwise push request into patient.pendingMembers
    const newRequest = {
      userId: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      requestedAt: new Date()
    };
    patient.pendingMembers = patient.pendingMembers || [];
    patient.pendingMembers.push(newRequest);
    await patient.save();

    // Find linked family members to notify their user rooms
    const familyMembers = await User.find(
      { patients: patient._id, role: 'family' },
      '_id'
    );

    const io = req.app.get('io');
    if (io) {
      const payload = {
        patientId: patient._id,
        patientName: patient.name,
        request: newRequest
      };
      io.to(`patient_${patient._id}`).emit('accessRequested', payload);
      familyMembers.forEach((fm) => {
        io.to(`user_${fm._id}`).emit('accessRequested', payload);
      });
    }

    return res.status(202).json({
      pending: true,
      patient: { _id: patient._id, name: patient.name },
      message: 'Request sent! Waiting for family approval.'
    });
  } catch (err) {
    console.error('Join patient error:', err);
    res.status(500).json({ message: 'Failed to join patient', error: err.message });
  }
});

// GET /api/patients/:id/members - Get all linked care team members & pending approval requests
router.get('/:id/members', auth, async (req, res) => {
  try {
    const patientId = req.params.id;
    const callerId = String(req.user?.id || req.user?._id || req.user?.userId || req.user?.user?.id || '');

    const caller = await User.findById(callerId);
    const patient = await Patient.findById(patientId);

    if (!caller || !patient) {
      return res.status(404).json({ message: 'Patient or user not found' });
    }

    const isLinked =
      (caller.patients || []).some((p) => String(p._id || p) === String(patient._id)) ||
      String(patient.createdBy) === callerId ||
      (patient.family || []).some((f) => String(f._id || f) === callerId) ||
      (patient.members || []).some((m) => String(m._id || m) === callerId) ||
      (patient.caretakers || []).some((c) => String(c._id || c) === callerId);

    if (!isLinked) {
      return res.status(403).json({ message: 'Access denied: You are not a member of this patient care team' });
    }

    const members = await User.find(
      { patients: patientId },
      '_id name email role createdAt'
    ).sort({ role: 1, name: 1 });

    res.json({
      members,
      pendingMembers: patient.pendingMembers || []
    });
  } catch (err) {
    console.error('Fetch members error:', err);
    res.status(500).json({ message: 'Failed to fetch care team members', error: err.message });
  }
});

// POST /api/patients/:id/requests/:userId/approve - Approve pending caregiver request (family only)
router.post('/:id/requests/:userId/approve', auth, async (req, res) => {
  try {
    const { id: patientId, userId } = req.params;
    const authResult = await verifyFamilyMemberForPatient(req, patientId);
    if (!authResult) {
      return res.status(403).json({ message: 'Only family administrators can approve care team requests' });
    }
    const { caller, patient } = authResult;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Remove from pendingMembers, add to caretakers if array exists
    patient.pendingMembers = (patient.pendingMembers || []).filter(
      (pm) => String(pm.userId) !== String(userId)
    );
    if (patient.caretakers && !patient.caretakers.includes(userId)) {
      patient.caretakers.push(userId);
    }
    await patient.save();

    // Add patient to target user's patients list
    await User.findByIdAndUpdate(userId, {
      $addToSet: { patients: patient._id }
    });

    const io = req.app.get('io');
    if (io) {
      // Emit accessApproved to target caregiver's private room with full patient object
      io.to(`user_${String(req.params.userId)}`).emit('accessApproved', {
        patient,
        patientId: patient._id,
        patientName: patient.name,
        approvedBy: { _id: caller._id, name: caller.name }
      });

      // Emit careTeamUpdated to patient room
      io.to(`patient_${patient._id}`).emit('careTeamUpdated', {
        patientId: patient._id,
        approvedUserId: String(req.params.userId),
        approvedUser: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        }
      });
    }

    const members = await User.find(
      { patients: patientId },
      '_id name email role createdAt'
    ).sort({ role: 1, name: 1 });

    res.json({
      success: true,
      message: `Approved ${targetUser.name} for ${patient.name}'s care team`,
      members,
      pendingMembers: patient.pendingMembers || []
    });
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(500).json({ message: 'Failed to approve request', error: err.message });
  }
});

// POST /api/patients/:id/requests/:userId/reject - Reject pending caregiver request (family only)
router.post('/:id/requests/:userId/reject', auth, async (req, res) => {
  try {
    const { id: patientId, userId } = req.params;
    const authResult = await verifyFamilyMemberForPatient(req, patientId);
    if (!authResult) {
      return res.status(403).json({ message: 'Only family administrators can reject care team requests' });
    }
    const { patient } = authResult;

    patient.pendingMembers = (patient.pendingMembers || []).filter(
      (pm) => String(pm.userId) !== String(userId)
    );
    await patient.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${String(req.params.userId)}`).emit('accessRejected', {
        patientId: patient._id,
        patientName: patient.name
      });
    }

    const members = await User.find(
      { patients: patientId },
      '_id name email role createdAt'
    ).sort({ role: 1, name: 1 });

    res.json({
      success: true,
      message: 'Request rejected',
      members,
      pendingMembers: patient.pendingMembers || []
    });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ message: 'Failed to reject request', error: err.message });
  }
});

// DELETE /api/patients/:id/members/:userId - Revoke caretaker access (family only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const { id: patientId, userId } = req.params;

    const authResult = await verifyFamilyMemberForPatient(req, patientId);
    if (!authResult) {
      return res.status(403).json({ message: 'Only family administrators can manage and revoke care team access' });
    }
    const { caller, patient } = authResult;

    if (String(caller._id) === String(userId)) {
      return res.status(400).json({ message: 'Cannot revoke your own access as family administrator' });
    }

    // Remove patient from target user's patients list
    await User.findByIdAndUpdate(
      userId,
      { $pull: { patients: patient._id } }
    );

    // Remove userId from all arrays on Patient (caretakers, members, family, pendingMembers)
    await Patient.findByIdAndUpdate(patient._id, {
      $pull: {
        caretakers: userId,
        members: userId,
        family: userId,
        pendingMembers: { userId: userId }
      }
    });

    // Real-time socket notification for immediate revocation in UI
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patient._id}`).emit('accessRevoked', {
        patientId: patient._id,
        revokedUserId: String(req.params.userId)
      });
      io.to(`user_${String(req.params.userId)}`).emit('accessRevoked', {
        patientId: patient._id,
        revokedUserId: String(req.params.userId)
      });
    }

    res.json({ success: true, message: 'Caregiver access successfully revoked', userId });
  } catch (err) {
    console.error('Revoke access error:', err);
    res.status(500).json({ message: 'Failed to revoke care team access', error: err.message });
  }
});

// POST /api/patients/:id/rotate-code - Generate and rotate 6-digit Care Code (family only)
router.post('/:id/rotate-code', auth, async (req, res) => {
  try {
    const patientId = req.params.id;

    const authResult = await verifyFamilyMemberForPatient(req, patientId);
    if (!authResult) {
      return res.status(403).json({ message: 'Only family administrators can rotate the patient Care Code' });
    }
    const { patient } = authResult;

    const newCode = await generateUniqueCareCode();
    patient.careCode = newCode;
    await patient.save();

    // Emit live update to patient room so UI updates instantaneously
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patient._id}`).emit('patientUpdated', patient);
    }

    res.json({
      success: true,
      message: 'Care Code rotated successfully',
      patient
    });
  } catch (err) {
    console.error('Rotate care code error:', err);
    res.status(500).json({ message: 'Failed to rotate Care Code', error: err.message });
  }
});

module.exports = router;
