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

// One-time listener to unlock audio autoplay on user interaction
export function initAudioOnUserInteraction() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

// Two-note chime (587.33 Hz D5 → 880 Hz A5 with smooth gain fade-out, ~450ms total)
export function playApprovalChime() {
  try {
    const ctx = getAudioContext();
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
    // Quiet fail if browser blocks before gesture
    console.warn('Audio chime playback prevented:', err);
  }
}
