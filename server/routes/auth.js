const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { ensureDemoSeed } = require('../utils/ensureDemoSeed');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'carepal_fallback_secret_2026',
    { expiresIn: '7d' }
  );
}

function formatUserResponse(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    patients: user.patients || [],
    profilePicture: user.profilePicture || '',
    age: user.age ?? null,
    sex: user.sex || '',
    qualification: user.qualification || '',
    accountType: user.accountType || 'family',
    relation: user.relation || '',
    address: user.address || '',
    profileCompleted: !!user.profileCompleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !['family', 'caretaker'].includes(role)) {
      return res.status(400).json({ message: 'Name, email, password, and valid role are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
      patients: [],
      profilePicture: '',
      age: null,
      sex: '',
      qualification: '',
      accountType: 'family',
      relation: '',
      address: '',
      profileCompleted: false,
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.endsWith('@demo.com')) {
      await ensureDemoSeed();
    }

    const user = await User.findOne({ email: normalizedEmail }).populate('patients');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const callerId = req.user.id || req.user._id || req.user.userId;
    const user = await User.findById(callerId).select('-password').populate('patients');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({
      user: formatUserResponse(user),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile.', error: err.message });
  }
});

// PUT /api/auth/profile - Update user profile details
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const callerId = req.user.id || req.user._id || req.user.userId;
    const {
      name,
      profilePicture,
      age,
      sex,
      qualification,
      accountType,
      relation,
      address,
    } = req.body;

    const user = await User.findById(callerId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture ? String(profilePicture).trim() : '';
    }
    if (age !== undefined) {
      user.age = age === '' || age === null ? null : Number(age);
    }
    if (sex !== undefined) {
      user.sex = ['Male', 'Female', 'Other'].includes(sex) ? sex : '';
    }
    if (qualification !== undefined) {
      user.qualification = String(qualification || '').trim();
    }
    if (accountType !== undefined) {
      user.accountType = ['self', 'family'].includes(accountType) ? accountType : 'family';
    }
    if (relation !== undefined) {
      user.relation = String(relation || '').trim();
    }
    if (address !== undefined) {
      user.address = String(address || '').trim();
    }
    user.profileCompleted = true;

    await user.save();
    await user.populate('patients');

    res.json({
      message: 'Profile updated successfully.',
      user: formatUserResponse(user),
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile.', error: err.message });
  }
});

module.exports = router;
