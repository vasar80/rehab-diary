/**
 * Card-deal sound for the Walking module.
 *
 * Synthesised on the fly with the Web Audio API — no audio asset to ship,
 * no permissions to request, no licensing concerns. Each "deal" is a brief
 * (~90 ms) high-frequency noise burst with a sharp attack and exponential
 * decay, shaped through a highpass + bandpass filter to feel papery and
 * crisp, like a card snapping onto a table top in a burraco round.
 *
 * The first call lazily creates a single AudioContext and reuses it for
 * subsequent calls. Browsers may keep the context suspended until a user
 * gesture, so we resume() defensively each time.
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

/** Play one card-on-table click. ~90 ms total, low CPU, no allocation cost worth caring about. */
export function playCardDealSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const duration = 0.09;
  const samples = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, samples, c.sampleRate);
  const data = buffer.getChannelData(0);

  // White noise with sharp attack + exponential decay → "tssch" character.
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const env = Math.pow(1 - t, 2.5);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  // Highpass: strip mud, keep the crisp top end.
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 1800;

  // Resonant bandpass: gives a faint "click" overtone around 4.5 kHz.
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 4500;
  bp.Q.value = 1.5;

  const gain = c.createGain();
  gain.gain.value = 0.18;

  source.connect(hp);
  hp.connect(bp);
  bp.connect(gain);
  gain.connect(c.destination);

  source.start();
}

/**
 * Play `count` card-deal sounds in sequence, with `stagger` ms between each.
 * Used when shuffling: simulates the dealer placing N cards on the table
 * one at a time — clack, clack, clack.
 */
export function playShuffleSequence(count: number, stagger = 90): void {
  for (let i = 0; i < count; i++) {
    setTimeout(playCardDealSound, i * stagger);
  }
}

/**
 * Soft "boop": descending sine 220 → 110 Hz with quick fade.
 * Played on a wrong "Verifica" — gentle, not punishing.
 */
export function playErrorSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t0);
  osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.18);

  gain.gain.setValueAtTime(0.22, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.25);
}

/**
 * Layered "you nailed it" sound: a sustained C-major chord underneath,
 * a fast 5-note arpeggio flourish on top, and a high bandpass-filtered
 * noise shimmer to feel like sparkles. ~1.1 s total. Triangle waves keep
 * it warm and triangle-saturated rather than synthy.
 */
export function playSuccessSound(): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});

  const t0 = c.currentTime;

  // 1) Sustained C-major chord — the bed.
  const chord = [261.63, 329.63, 392.0, 523.25]; // C4 · E4 · G4 · C5
  for (const freq of chord) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.085, t0 + 0.04);
    gain.gain.linearRampToValueAtTime(0.055, t0 + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.0);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + 1.05);
  }

  // 2) Ascending C-major arpeggio flourish on top.
  const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 · E5 · G5 · C6 · E6
  const stagger = 0.07;
  arp.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const start = t0 + 0.06 + i * stagger;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.17, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.45);
  });

  // 3) Bandpass-filtered noise shimmer — the sparkle, lands at arpeggio peak.
  const shimmerStart = t0 + 0.4;
  const noiseDur = 0.55;
  const noiseSamples = Math.floor(c.sampleRate * noiseDur);
  const buffer = c.createBuffer(1, noiseSamples, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < noiseSamples; i++) {
    const t = i / noiseSamples;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 0.6);
  }

  const source = c.createBufferSource();
  source.buffer = buffer;

  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 7000;
  bp.Q.value = 9;

  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0, shimmerStart);
  noiseGain.gain.linearRampToValueAtTime(0.07, shimmerStart + 0.05);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, shimmerStart + 0.55);

  source.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(c.destination);
  source.start(shimmerStart);
  source.stop(shimmerStart + noiseDur);
}
