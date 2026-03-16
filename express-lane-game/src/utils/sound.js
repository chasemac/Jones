// Chiptune-style Web Audio synth for Life in the Express Lane

let audioCtx = null;
let masterGain = null;
export let isMuted = false;

const init = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

export const toggleMute = () => {
  isMuted = !isMuted;
  if (masterGain) masterGain.gain.value = isMuted ? 0 : 0.3;
  return isMuted;
};

// Helper: play a single square/pulse note
const note = (ctx, freq, start, duration, type = 'square', vol = 0.15) => {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.01);
  g.gain.setValueAtTime(vol, start + duration * 0.7);
  g.gain.linearRampToValueAtTime(0, start + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.01);
};

export const playSound = (type) => {
  if (isMuted) return;
  try {
    const ctx = init();
    const t = ctx.currentTime;

    switch (type) {

      // 💰 Coin — quick ascending two-tone blip
      case 'coin':
        note(ctx, 523, t,       0.07, 'square', 0.12); // C5
        note(ctx, 1047, t + 0.07, 0.1, 'square', 0.10); // C6
        break;

      // 🚶 Move — soft descending step sound
      case 'move':
        note(ctx, 330, t,        0.05, 'triangle', 0.10); // E4
        note(ctx, 262, t + 0.06, 0.08, 'triangle', 0.08); // C4
        break;

      // 🎉 Success — hired / enrolled / win fanfare (arpeggio)
      case 'success':
        note(ctx, 523,  t,        0.10, 'square', 0.13); // C5
        note(ctx, 659,  t + 0.10, 0.10, 'square', 0.13); // E5
        note(ctx, 784,  t + 0.20, 0.10, 'square', 0.13); // G5
        note(ctx, 1047, t + 0.30, 0.20, 'square', 0.15); // C6
        break;

      // ❌ Error — rejected / can't afford
      case 'error':
        note(ctx, 200, t,        0.12, 'sawtooth', 0.12);
        note(ctx, 150, t + 0.13, 0.15, 'sawtooth', 0.10);
        break;

      // 🖱️ Click — tiny UI tap
      case 'click':
        note(ctx, 880, t, 0.04, 'sine', 0.06);
        break;

      // 📅 End Week — ascending sweep + resolution chord
      case 'turn': {
        note(ctx, 262, t,        0.08, 'square', 0.10); // C4
        note(ctx, 330, t + 0.09, 0.08, 'square', 0.10); // E4
        note(ctx, 392, t + 0.18, 0.08, 'square', 0.10); // G4
        note(ctx, 523, t + 0.27, 0.20, 'square', 0.13); // C5
        // Harmony
        note(ctx, 659, t + 0.27, 0.20, 'triangle', 0.06); // E5
        break;
      }

      // 🏠 Week start — gentle home-arrival chime
      case 'home':
        note(ctx, 784, t,        0.08, 'sine', 0.08); // G5
        note(ctx, 1047, t + 0.10, 0.12, 'sine', 0.07); // C6
        break;

      // 📈 Stock gain
      case 'stock_up':
        note(ctx, 440, t,        0.06, 'triangle', 0.08);
        note(ctx, 554, t + 0.07, 0.06, 'triangle', 0.08);
        note(ctx, 659, t + 0.14, 0.10, 'triangle', 0.09);
        break;

      // 📉 Stock loss
      case 'stock_down':
        note(ctx, 440, t,        0.06, 'sawtooth', 0.07);
        note(ctx, 370, t + 0.07, 0.06, 'sawtooth', 0.07);
        note(ctx, 294, t + 0.14, 0.12, 'sawtooth', 0.08);
        break;

      // 🎊 Victory — full 8-bit fanfare
      case 'victory': {
        const melody = [523, 523, 784, 784, 880, 880, 784];
        const dur =    [0.12,0.12,0.12,0.12,0.12,0.12,0.25];
        let offset = 0;
        melody.forEach((f, i) => {
          note(ctx, f, t + offset, dur[i], 'square', 0.14);
          offset += dur[i] + 0.02;
        });
        break;
      }

      default:
        break;
    }
  } catch (e) {
    // Silently ignore audio errors (e.g. in test env)
  }
};
