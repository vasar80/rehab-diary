/**
 * Capture sound for Neglect-Go: a "puff" — short noise burst with a quick
 * pitched bloop on top, evoking a Pokémon-Go-style poké-ball capture.
 * Synthesised at runtime so we ship no audio assets.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const C =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
    return ctx;
  } catch {
    return null;
  }
}

/** Play one capture sound — ~280 ms total. */
export function playCaptureSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t0 = c.currentTime;

  // 1) Pitched ascending blip — the "got it" cue.
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(420, t0);
  osc.frequency.exponentialRampToValueAtTime(880, t0 + 0.12);
  osc.frequency.exponentialRampToValueAtTime(620, t0 + 0.22);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.3);

  // 2) Soft noise burst — the "puff" textural layer.
  const dur = 0.18;
  const samples = Math.floor(c.sampleRate * dur);
  const buffer = c.createBuffer(1, samples, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 2;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.08, t0 + 0.01);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);

  source.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(c.destination);
  source.start(t0);
  source.stop(t0 + dur);
}

/** Played when the locking timer ticks — quick metronome click. */
export function playLockTick(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1100;

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.05, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.08);
}
