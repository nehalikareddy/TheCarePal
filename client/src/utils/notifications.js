const triggeredKeys = new Set();

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission !== 'denied') {
    return Notification.requestPermission();
  }
  return Notification.permission;
}

export const requestReminderPermission = requestNotificationPermission;

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore autoplay restriction errors before user gesture
  }
}

export const playReminderChime = playNotificationChime;

export async function sendBrowserNotification(title, options = {}) {
  const dedupeKey = options.tag || options.dedupeKey;
  if (dedupeKey) {
    if (triggeredKeys.has(dedupeKey)) return null;
    triggeredKeys.add(dedupeKey);
  }

  playNotificationChime();

  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return null;
  }

  const notificationOptions = {
    body: options.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    ...options,
  };

  // 1. Android Chrome requires ServiceWorkerRegistration.showNotification()
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && typeof registration.showNotification === 'function') {
        return registration.showNotification(title, notificationOptions);
      }
    } catch (swErr) {
      console.warn('ServiceWorker showNotification failed, trying fallback:', swErr);
    }
  }

  // 2. Desktop fallback (standard Notification constructor)
  try {
    return new Notification(title, notificationOptions);
  } catch (err) {
    console.warn('Browser Notification constructor error:', err);
    return null;
  }
}

export const fireDoseNotification = ({ title, body, dedupeKey }) =>
  sendBrowserNotification(title, { body, tag: dedupeKey });
