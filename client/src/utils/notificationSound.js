// Web Audio API notification sound generator
let audioContextInstance = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContextInstance) {
    audioContextInstance = new AudioCtx();
  }
  if (audioContextInstance.state === 'suspended') {
    audioContextInstance.resume().catch(() => {});
  }
  return audioContextInstance;
}

// Silent Audio Unlock: creates/resumes the shared AudioContext on user interaction
export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// One-time listener to unlock audio autoplay on user interaction
export function initAudioOnUserInteraction() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

// Two-note chime (587.33 Hz D5 → 880 Hz A5 with smooth gain fade-out, ~450ms total)
export function playApprovalChime() {
  try {
    const ctx = unlockAudio();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    // D5 (587.33 Hz) -> A5 (880 Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.16);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  } catch (err) {
    console.warn('Audio chime playback prevented:', err);
  }
}

// Urgent 3-tone chime for overdue medication alerts (E5 659.25Hz -> G5 783.99Hz -> C6 1046.50Hz, ~520ms)
export function playOverdueAlertChime() {
  try {
    const ctx = unlockAudio();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';

    // 3 distinct ascending alert tones
    osc.frequency.setValueAtTime(659.25, now);          // E5
    osc.frequency.setValueAtTime(783.99, now + 0.14);   // G5
    osc.frequency.setValueAtTime(1046.50, now + 0.28);  // C6

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.setValueAtTime(0.32, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  } catch (err) {
    console.warn('Overdue chime playback prevented:', err);
  }
}
