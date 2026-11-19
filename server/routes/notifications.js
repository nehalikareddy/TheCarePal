const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// POST /api/notifications/subscribe (protected by auth)
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: 'Valid subscription object is required' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentSubs = Array.isArray(user.pushSubscriptions) ? user.pushSubscriptions : [];
    // Avoid duplicate subscriptions by endpoint
    const exists = currentSubs.some((sub) => sub && sub.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions = [...currentSubs, subscription];
      await user.save();
    }

    res.status(200).json({ message: 'Push subscription stored successfully' });
  } catch (err) {
    console.error('Error saving push subscription:', err);
    res.status(500).json({ message: 'Failed to save push subscription' });
  }
});

// POST /api/notifications/unsubscribe (protected by auth)
router.post('/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Subscription endpoint is required' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (Array.isArray(user.pushSubscriptions)) {
      user.pushSubscriptions = user.pushSubscriptions.filter(
        (sub) => sub && sub.endpoint !== endpoint
      );
      await user.save();
    }

    res.status(200).json({ message: 'Push subscription removed successfully' });
  } catch (err) {
    console.error('Error removing push subscription:', err);
    res.status(500).json({ message: 'Failed to remove push subscription' });
  }
});

module.exports = router;
