/* ==========================================================================
   Startpage · Sonidos
   Alarmas y tic-tac sintetizados con Web Audio: no hay archivos que bajar.
   ========================================================================== */
(function (SP) {
  'use strict';

  let ac = null;
  let noise = null;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  }

  function noiseBuffer(a) {
    if (noise) return noise;
    noise = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }

  /** Nota simple con envolvente */
  function tone(a, out, { f, t, type = 'sine', attack = 0.01, decay = 0.6, gain = 0.3, to = null, glide = 0.05 }) {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + glide);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + attack + decay + 0.05);
  }

  /** Campana con parciales inarmónicos */
  function bellStrike(a, out, t, f0, len = 2.2, gain = 0.25) {
    [[1, 1], [2, 0.5], [2.76, 0.35], [5.4, 0.16], [8.93, 0.08]].forEach(([r, amp]) => {
      tone(a, out, { f: f0 * r, t, attack: 0.004, decay: len / Math.sqrt(r), gain: gain * amp });
    });
  }

  const ALARMS = {
    chime: { label: 'Campanitas', len: 1.5, play: (a, o, t) => [659.25, 783.99, 1046.5].forEach((f, i) => tone(a, o, { f, t: t + i * 0.22, decay: 0.9, gain: 0.28 })) },
    bell: { label: 'Campana', len: 2.6, play: (a, o, t) => { bellStrike(a, o, t, 880); bellStrike(a, o, t + 0.7, 784); } },
    digital: {
      label: 'Despertador digital', len: 1.4,
      play: (a, o, t) => { for (let g = 0; g < 2; g++) for (let i = 0; i < 4; i++) tone(a, o, { f: 1046, t: t + g * 0.7 + i * 0.12, type: 'square', attack: 0.004, decay: 0.07, gain: 0.08 }); },
    },
    marimba: {
      label: 'Marimba', len: 1.3,
      play: (a, o, t) => [523.25, 659.25, 783.99, 1046.5, 783.99].forEach((f, i) => {
        tone(a, o, { f, t: t + i * 0.14, decay: 0.35, gain: 0.3, attack: 0.003 });
        tone(a, o, { f: f * 4, t: t + i * 0.14, decay: 0.08, gain: 0.05, attack: 0.002 });
      }),
    },
    soft: { label: 'Suave', len: 2.4, play: (a, o, t) => [440, 554.37, 659.25].forEach((f, i) => tone(a, o, { f, t: t + i * 0.35, type: 'triangle', attack: 0.15, decay: 1.6, gain: 0.2 })) },
    gong: {
      label: 'Gong', len: 4,
      play: (a, o, t) => [[1, 1], [1.48, 0.6], [2.1, 0.45], [2.9, 0.3], [3.6, 0.2]].forEach(([r, g]) => tone(a, o, { f: 98 * r, t, attack: 0.02, decay: 4 / Math.sqrt(r), gain: 0.32 * g })),
    },
    birds: {
      label: 'Pajaritos', len: 1.8,
      play: (a, o, t) => [0, 0.16, 0.3, 0.75, 0.9, 1.05, 1.2].forEach((d, i) => tone(a, o, { f: 2300 + (i % 3) * 300, to: 3600 + (i % 2) * 500, glide: 0.07, t: t + d, decay: 0.09, attack: 0.005, gain: 0.12 })),
    },
    arcade: {
      label: 'Arcade', len: 1,
      play: (a, o, t) => [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(a, o, { f, t: t + i * 0.08, type: 'square', attack: 0.003, decay: 0.12, gain: 0.07 })),
    },
  };

  const TICKS = {
    none: { label: 'Sin tic-tac' },
    clock: {
      label: 'Reloj',
      play: (a, o, t, alt) => {
        const src = a.createBufferSource(); src.buffer = noiseBuffer(a);
        const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = alt ? 2200 : 3200; bp.Q.value = 8;
        const g = a.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
        src.connect(bp).connect(g).connect(o); src.start(t); src.stop(t + 0.05);
      },
    },
    soft: { label: 'Suave', play: (a, o, t, alt) => tone(a, o, { f: alt ? 660 : 880, t, attack: 0.003, decay: 0.05, gain: 0.08 }) },
    wood: { label: 'Madera', play: (a, o, t, alt) => tone(a, o, { f: alt ? 900 : 1250, to: alt ? 650 : 900, glide: 0.03, t, attack: 0.002, decay: 0.06, gain: 0.25 }) },
    drop: { label: 'Gota', play: (a, o, t) => tone(a, o, { f: 900, to: 380, glide: 0.06, t, attack: 0.003, decay: 0.09, gain: 0.18 }) },
  };

  function out(a, volume) {
    const g = a.createGain();
    g.gain.value = Math.max(0, Math.min(1, volume / 100)) * 1.4;
    g.connect(a.destination);
    return g;
  }

  /** Suena una alarma `repeat` veces */
  function alarm(name, volume = 70, repeat = 1) {
    const def = ALARMS[name];
    const a = ctx();
    if (!def || !a || volume <= 0) return;
    const o = out(a, volume);
    for (let i = 0; i < repeat; i++) def.play(a, o, a.currentTime + 0.05 + i * (def.len + 0.4));
  }

  function tick(name, volume = 50, alt = false) {
    const def = TICKS[name];
    const a = ctx();
    if (!def || !def.play || !a || volume <= 0) return;
    def.play(a, out(a, volume * 0.6), a.currentTime + 0.01, alt);
  }

  function beep(volume = 60, high = false) {
    const a = ctx();
    if (!a || volume <= 0) return;
    tone(a, out(a, volume), { f: high ? 1320 : 880, t: a.currentTime + 0.01, attack: 0.004, decay: high ? 0.35 : 0.12, gain: 0.22 });
  }

  /** Desbloquea el audio en el primer gesto del usuario */
  function unlock() { ctx(); }

  SP.sound = { ALARMS, TICKS, alarm, tick, beep, unlock };
})(window.SP);
