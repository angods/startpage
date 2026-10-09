/* ==========================================================================
   Startpage · Sonido ambiente
   Lluvia, olas, viento, fuego y ruidos de color, todos sintetizados con
   Web Audio (no se descarga ningún archivo). Se pueden mezclar.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const SOUNDS = {
    rain: { label: 'Lluvia', icon: '🌧️' },
    waves: { label: 'Olas', icon: '🌊' },
    wind: { label: 'Viento', icon: '🍃' },
    fire: { label: 'Fuego', icon: '🔥' },
    brown: { label: 'Ruido marrón', icon: '🟤' },
    pink: { label: 'Ruido rosa', icon: '🌸' },
    white: { label: 'Ruido blanco', icon: '⚪' },
  };

  /* ---------- Generadores ---------- */
  function noise(ac, kind, seconds = 6) {
    const len = ac.sampleRate * seconds;
    const buf = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0; let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'white') d[i] = w * 0.5;
        else if (kind === 'pink') { // filtro de Paul Kellet
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // marrón
      }
      // Fundido en los bordes para que el bucle no haga "clic"
      const f = Math.min(2000, len / 4);
      for (let i = 0; i < f; i++) { const k = i / f; d[i] *= k; d[len - 1 - i] *= k; }
    }
    return buf;
  }

  function loop(ac, buf, out) {
    const src = ac.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.loopStart = 0.05; src.loopEnd = buf.duration - 0.05;
    src.playbackRate.value = 0.97 + Math.random() * 0.06;
    src.connect(out);
    src.start(0, Math.random() * buf.duration);
    return src;
  }

  function lfo(ac, freq, depth, target, offset) {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.frequency.value = freq; g.gain.value = depth;
    o.connect(g).connect(target);
    if (offset != null) target.value = offset;
    o.start();
    return o;
  }

  /** Arma un sonido; devuelve { gain, stop } */
  function build(ac, kind, bufs, master) {
    const gain = ac.createGain(); gain.gain.value = 0;
    gain.connect(master);
    const nodes = []; const timers = [];
    const filt = (type, f, q = 0.7) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };

    if (kind === 'white' || kind === 'pink' || kind === 'brown') {
      nodes.push(loop(ac, bufs[kind], gain));
    } else if (kind === 'rain') {
      const hp = filt('highpass', 500); const lp = filt('lowpass', 7000);
      hp.connect(lp).connect(gain);
      nodes.push(loop(ac, bufs.pink, hp));
      // Gotas: golpecitos cortos al azar
      const drop = () => {
        const s = ac.createBufferSource(); s.buffer = bufs.white;
        const bp = filt('bandpass', 2500 + Math.random() * 3500, 4);
        const g = ac.createGain(); const t = ac.currentTime;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25 + Math.random() * 0.3, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04 + Math.random() * 0.05);
        s.connect(bp).connect(g).connect(gain);
        s.start(t, Math.random() * 4); s.stop(t + 0.12);
      };
      timers.push(setInterval(() => { for (let i = 0; i < 3; i++) if (Math.random() < 0.7) setTimeout(drop, Math.random() * 90); }, 90));
    } else if (kind === 'waves') {
      const lp = filt('lowpass', 500); const swell = ac.createGain();
      lp.connect(swell).connect(gain);
      nodes.push(loop(ac, bufs.brown, lp));
      nodes.push(lfo(ac, 0.09, 0.45, swell.gain, 0.55));
      nodes.push(lfo(ac, 0.09, 350, lp.frequency, 650));
    } else if (kind === 'wind') {
      const bp = filt('bandpass', 700, 1.6); const g2 = ac.createGain();
      bp.connect(g2).connect(gain);
      nodes.push(loop(ac, bufs.pink, bp));
      nodes.push(lfo(ac, 0.13, 420, bp.frequency, 750));
      nodes.push(lfo(ac, 0.07, 0.35, g2.gain, 0.7));
    } else if (kind === 'fire') {
      const lp = filt('lowpass', 260);
      lp.connect(gain);
      nodes.push(loop(ac, bufs.brown, lp));
      const crack = () => {
        const s = ac.createBufferSource(); s.buffer = bufs.white;
        const hp = filt('highpass', 1500 + Math.random() * 2500);
        const g = ac.createGain(); const t = ac.currentTime;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2 + Math.random() * 0.5, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.01 + Math.random() * 0.03);
        s.connect(hp).connect(g).connect(gain);
        s.start(t, Math.random() * 4); s.stop(t + 0.06);
      };
      timers.push(setInterval(() => { if (Math.random() < 0.45) crack(); if (Math.random() < 0.08) { crack(); setTimeout(crack, 30); } }, 70));
    }
    return {
      gain,
      stop() {
        timers.forEach(clearInterval);
        nodes.forEach((x) => { try { x.stop(); } catch (e) { /* nada */ } });
        gain.disconnect();
      },
    };
  }

  /* ---------- Motor (uno por nota) ---------- */
  function engine() {
    let ac = null; let master = null; let bufs = null;
    const voices = {};
    return {
      start() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        if (!ac) {
          ac = new AC();
          master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
          bufs = { white: noise(ac, 'white'), pink: noise(ac, 'pink'), brown: noise(ac, 'brown') };
        }
        if (ac.state === 'suspended') ac.resume();
        return true;
      },
      set(kind, level, vol) {
        if (!ac) return;
        if (level > 0 && !voices[kind]) voices[kind] = build(ac, kind, bufs, master);
        if (voices[kind]) voices[kind].gain.gain.setTargetAtTime((level / 100) ** 2, ac.currentTime, 0.15);
        master.gain.setTargetAtTime(vol, ac.currentTime, 0.3);
      },
      fadeOut() {
        if (!ac) return;
        master.gain.setTargetAtTime(0, ac.currentTime, 0.25);
      },
      close() {
        Object.values(voices).forEach((v) => v.stop());
        if (ac) ac.close().catch(() => {});
        ac = null;
      },
    };
  }

  SP.board.register('ambient', {
    label: 'Sonido ambiente',
    icon: 'music',
    size: [280, 300],
    min: [210, 180],
    color: 'lavender',
    create: () => ({ levels: { rain: 60, fire: 0, waves: 0, wind: 0, brown: 0, pink: 0, white: 0 }, volume: 70, playing: false }),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('amb-body');
      const eng = engine();
      let playing = false;
      const apply = () => { if (playing) Object.keys(SOUNDS).forEach((k) => eng.set(k, d.levels[k] || 0, d.volume / 100)); };
      const playBtn = h('button', { type: 'button', class: 'pomo-btn amb-play', 'aria-label': 'Reproducir' });
      const paint = () => {
        playBtn.innerHTML = SP.icon(playing ? 'pause' : 'play', 18);
        playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
        body.classList.toggle('playing', playing);
      };
      playBtn.addEventListener('click', () => {
        if (!playing) {
          if (!eng.start()) { SP.ui.toast('Este navegador no puede generar sonido'); return; }
          playing = true;
          if (!Object.values(d.levels).some((v) => v > 0)) d.levels.rain = 60;
          apply();
        } else { playing = false; eng.fadeOut(); }
        d.playing = playing; ctx.save(); paint(); draw();
      });

      const rows = h('div', { class: 'amb-list' });
      const draw = () => {
        rows.replaceChildren(...Object.entries(SOUNDS).map(([k, s]) => {
          const range = h('input', { type: 'range', min: 0, max: 100, value: d.levels[k] || 0, class: 'amb-range', 'aria-label': s.label });
          range.addEventListener('input', () => {
            d.levels[k] = +range.value; ctx.save();
            row.classList.toggle('on', d.levels[k] > 0);
            apply();
          });
          const row = h('label', { class: 'amb-row' + ((d.levels[k] || 0) > 0 ? ' on' : '') },
            h('span', { class: 'amb-ico', text: s.icon }), h('span', { class: 'amb-name', text: s.label }), range);
          return row;
        }));
      };
      const vol = h('input', { type: 'range', min: 0, max: 100, value: d.volume, class: 'pomo-range', 'aria-label': 'Volumen general' });
      vol.addEventListener('input', () => { d.volume = +vol.value; ctx.save(); apply(); });

      draw(); paint();
      body.append(h('div', { class: 'amb-top' }, playBtn, h('span', { html: SP.icon('volume', 15) }), vol), rows);
      if (d.playing) {
        // Los navegadores no dejan sonar sin un clic: arranca con el primero
        const resume = (e) => { if (!playBtn.contains(e.target) && !playing && d.playing && ctx.el.isConnected) playBtn.click(); };
        document.addEventListener('pointerdown', resume, { once: true, capture: true });
      }
      return () => eng.close();
    },
  });
})(window.SP);
