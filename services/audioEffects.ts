
// Simple synthesizer for UI sound effects using Web Audio API
// No external assets required.

let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const createOscillator = (freq: number, type: OscillatorType, duration: number, startTime: number, vol: number = 0.1) => {
  const ctx = getContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playClickSound = () => {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    // Short high pitched blip
    createOscillator(800, 'sine', 0.1, now, 0.05);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const playSuccessSound = () => {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    // Major chord arpeggio
    createOscillator(523.25, 'sine', 0.1, now, 0.1);       // C5
    createOscillator(659.25, 'sine', 0.1, now + 0.1, 0.1); // E5
    createOscillator(783.99, 'sine', 0.3, now + 0.2, 0.1); // G5
  } catch (e) {}
};

export const playErrorSound = () => {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    // Low dissonant buzz
    createOscillator(150, 'sawtooth', 0.3, now, 0.1);
    createOscillator(140, 'sawtooth', 0.3, now, 0.1);
  } catch (e) {}
};

export const playFanfareSound = () => {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    // Celebration melody
    createOscillator(523.25, 'square', 0.1, now, 0.1); // C
    createOscillator(523.25, 'square', 0.1, now + 0.1, 0.1); // C
    createOscillator(523.25, 'square', 0.1, now + 0.2, 0.1); // C
    createOscillator(783.99, 'square', 0.4, now + 0.3, 0.1); // G
  } catch (e) {}
};

export const playStreakSound = () => {
  try {
    const ctx = getContext();
    const now = ctx.currentTime;
    // Rising pitch slide
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
};
