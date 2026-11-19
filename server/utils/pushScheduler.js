const webpush = require('web-push');
const Medicine = require('../models/Medicine');
const DoseLog = require('../models/DoseLog');
const User = require('../models/User');
const { formatDateIST, formatTimeIST } = require('./dateIST');

const sentPushKeys = new Set();

function initWebPush() {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@thecarepal.app';
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    console.warn('[PushScheduler] VAPID keys missing. Web Push notifications disabled.');
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    console.log('[PushScheduler] VAPID configured successfully.');
    return true;
  } catch (err) {
    console.error('[PushScheduler] Error configuring VAPID:', err);
    return false;
  }
}

async function checkAndSendDoseReminders() {
  try {
    const today = formatDateIST();
    const currentHHmm = formatTimeIST();

    // Find active medicines where currentHHmm is in scheduled times
    const activeMedicines = await Medicine.find({
      startDate: { $lte: today },
      endDate: { $gte: today },
      times: currentHHmm,
    });

    if (!activeMedicines || activeMedicines.length === 0) return;

    for (const med of activeMedicines) {
      const pushKey = `${med._id}_${today}_${currentHHmm}`;
      if (sentPushKeys.has(pushKey)) continue;

      // Check if a DoseLog already exists for today and this time
      const existingLog = await DoseLog.findOne({
        medicineId: med._id,
        scheduledDate: today,
        scheduledTime: currentHHmm,
      });

      if (existingLog) {
        sentPushKeys.add(pushKey);
        continue;
      }

      // Mark as processed in-memory
      sentPushKeys.add(pushKey);

      // Find all linked users for this patient who have pushSubscriptions
      const linkedUsers = await User.find({
        patients: med.patientId,
        'pushSubscriptions.0': { $exists: true },
      });

      if (!linkedUsers || linkedUsers.length === 0) continue;

      const payload = JSON.stringify({
        title: `Time for ${med.name}`,
        body: `${med.dose} (${med.strength}) scheduled at ${currentHHmm}`,
        tag: pushKey,
        data: {
          patientId: med.patientId,
          medicineId: med._id,
          scheduledTime: currentHHmm,
          scheduledDate: today,
        },
      });

      for (const user of linkedUsers) {
        const validSubs = [];
        let hasChanges = false;

        for (const sub of user.pushSubscriptions) {
          if (!sub || !sub.endpoint) continue;
          try {
            await webpush.sendNotification(sub, payload);
            validSubs.push(sub);
          } catch (pushErr) {
            // Status code 404 or 410 means subscription is expired or unsubscribed
            if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
              console.log(`[PushScheduler] Removing expired subscription for user ${user._id}`);
              hasChanges = true;
            } else {
              console.warn(`[PushScheduler] Push error for user ${user._id}:`, pushErr.message);
              validSubs.push(sub);
            }
          }
        }

        if (hasChanges) {
          user.pushSubscriptions = validSubs;
          await user.save();
        }
      }
    }

    // Keep sentPushKeys bounded (prevent unbounded memory growth over weeks)
    if (sentPushKeys.size > 2000) {
      sentPushKeys.clear();
    }
  } catch (err) {
    console.error('[PushScheduler] Error in dose reminder check:', err);
  }
}

function startPushScheduler() {
  const isConfigured = initWebPush();
  if (!isConfigured) return;

  // Run on startup and then every 60 seconds
  checkAndSendDoseReminders();
  const interval = setInterval(checkAndSendDoseReminders, 60000);
  return interval;
}

module.exports = {
  startPushScheduler,
  checkAndSendDoseReminders,
};
