/* ==========================================================================
   Startpage · Pomodoro
   Foco / pausa / descanso largo con tiempos editables, alarma a elección,
   tic-tac opcional, cuenta regresiva final y modo silencio. Sigue corriendo
   aunque recargues la página (guarda la hora de fin).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const MODES = {
    focus: { label: 'Foco' },
    short: { label: 'Pausa' },
    long: { label: 'Descanso' },
  };
  const DEFAULTS = {
    mode: 'focus', dur: { focus: 25, short: 5, long: 15 }, longEvery: 4,
    running: false, endAt: null, left: null, sessions: 0, auto: false,
    alarm: 'chime', repeat: 2, tick: 'none', countdown: true, volume: 70, muted: false, notify: true,
  };
  const R = 44;
  const LEN = 2 * Math.PI * R;
  const baseTitle = document.title;

  function notify(text) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Pomodoro', { body: text, silent: true, icon: 'assets/icon.svg' });
    } catch (e) { /* nada */ }
  }

  const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  /* ---------- Vista de ajustes dentro de la nota ---------- */
  function renderSettings(body, n, ctx, back) {
    const d = n.data;
    const num = (key, label, min, max) => {
      const input = h('input', { type: 'number', min, max, value: d.dur[key], class: 'pomo-num' });
      input.addEventListener('change', () => {
        d.dur[key] = Math.max(min, Math.min(max, parseInt(input.value, 10) || d.dur[key]));
        input.value = d.dur[key];
        if (!d.running && d.mode === key) d.left = d.dur[key] * 60000;
        ctx.save();
      });
      return h('label', { class: 'pomo-field' }, h('span', { text: label }), h('span', { class: 'pomo-num-wrap' }, input, h('small', { text: 'min' })));
    };
    const select = (value, options, onChange) => {
      const s = h('select', { class: 'pomo-select' }, Object.entries(options).map(([k, o]) => h('option', { value: k, text: o.label || o })));
      s.value = value;
      s.addEventListener('change', () => onChange(s.value));
      return s;
    };
    const check = (label, value, onChange) => {
      const input = h('input', { type: 'checkbox' });
      input.checked = !!value;
      input.addEventListener('change', () => onChange(input.checked));
      return h('label', { class: 'pomo-check' }, input, h('span', { text: label }));
    };
    const test = (fn) => h('button', { type: 'button', class: 'pomo-test', title: 'Probar', html: SP.icon('play', 12), onclick: fn });

    const vol = h('input', { type: 'range', min: 0, max: 100, value: d.volume, class: 'pomo-range' });
    vol.addEventListener('input', () => { d.volume = +vol.value; ctx.save(); });
    vol.addEventListener('change', () => SP.sound.beep(d.volume));

    const repeatSel = select(String(d.repeat), { 1: '1 vez', 2: '2 veces', 3: '3 veces', 5: '5 veces' }, (v) => { d.repeat = +v; ctx.save(); });

    body.append(h('div', { class: 'pomo-settings no-drag' },
      h('div', { class: 'pomo-set-title' }, h('span', { text: 'Ajustes del timer' })),
      h('div', { class: 'pomo-grid' },
        num('focus', 'Foco', 1, 240),
        num('short', 'Pausa corta', 1, 60),
        num('long', 'Descanso largo', 1, 120),
        h('label', { class: 'pomo-field' }, h('span', { text: 'Descanso largo cada' }),
          select(String(d.longEvery), { 2: '2 focos', 3: '3 focos', 4: '4 focos', 5: '5 focos', 6: '6 focos' }, (v) => { d.longEvery = +v; ctx.save(); }))),
      h('div', { class: 'pomo-set-sub', text: 'Sonido' }),
      h('label', { class: 'pomo-field' }, h('span', { text: 'Alarma' }),
        h('span', { class: 'pomo-inline' },
          select(d.alarm, { ...SP.sound.ALARMS, none: { label: 'Sin alarma' } }, (v) => { d.alarm = v; ctx.save(); SP.sound.alarm(v, d.volume, 1); }),
          test(() => SP.sound.alarm(d.alarm, d.volume, 1)))),
      h('label', { class: 'pomo-field' }, h('span', { text: 'Repetir alarma' }), repeatSel),
      h('label', { class: 'pomo-field' }, h('span', { text: 'Tic-tac' }),
        h('span', { class: 'pomo-inline' },
          select(d.tick, SP.sound.TICKS, (v) => { d.tick = v; ctx.save(); }),
          test(() => { let i = 0; const t = setInterval(() => { SP.sound.tick(d.tick, d.volume, i % 2); if (++i >= 4) clearInterval(t); }, 500); }))),
      h('label', { class: 'pomo-field' }, h('span', { text: 'Volumen' }), vol),
      check('Cuenta regresiva (3, 2, 1)', d.countdown, (v) => { d.countdown = v; ctx.save(); }),
      check('Silenciar todo', d.muted, (v) => { d.muted = v; ctx.save(); }),
      h('div', { class: 'pomo-set-sub', text: 'Comportamiento' }),
      check('Encadenar foco y pausas automáticamente', d.auto, (v) => { d.auto = v; ctx.save(); }),
      check('Notificación al terminar', d.notify, (v) => {
        d.notify = v; ctx.save();
        if (v && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
      }),
      h('button', { type: 'button', class: 'pomo-done', text: 'Listo', onclick: back })));
  }

  SP.board.register('pomodoro', {
    label: 'Pomodoro',
    icon: 'timer',
    size: [260, 300],
    min: [200, 210],
    color: 'pink',
    create: () => JSON.parse(JSON.stringify(DEFAULTS)),
    render(body, n, ctx) {
      const d = n.data;
      for (const [k, v] of Object.entries(DEFAULTS)) if (d[k] === undefined) d[k] = JSON.parse(JSON.stringify(v));
      const total = () => d.dur[d.mode] * 60000;
      if (d.left == null) d.left = total();
      body.classList.add('pomo');

      if (ctx.showSettings) {
        renderSettings(body, n, ctx, () => { ctx.showSettings = false; ctx.rerender(); });
        return null;
      }

      const tabs = h('div', { class: 'pomo-tabs' }, Object.entries(MODES).map(([k, m]) => h('button', {
        type: 'button', class: 'pomo-tab', dataset: { mode: k }, text: m.label,
        onclick: () => { d.mode = k; d.running = false; d.endAt = null; d.left = total(); ctx.save(); paint(); },
      })));

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('class', 'pomo-svg');
      svg.innerHTML = `<circle cx="50" cy="50" r="${R}" class="pomo-track"/><circle cx="50" cy="50" r="${R}" class="pomo-prog" stroke-dasharray="${LEN}" transform="rotate(-90 50 50)"/>`;
      const prog = svg.querySelector('.pomo-prog');
      const time = h('button', { class: 'pomo-time', type: 'button', title: 'Cambiar tiempos', onclick: () => openSettings() });
      const sub = h('div', { class: 'pomo-sub' });
      const ring = h('div', { class: 'pomo-ring' }, svg, h('div', { class: 'pomo-center' }, time, sub));

      const playBtn = h('button', { class: 'pomo-btn main', type: 'button', onclick: () => toggle() });
      const muteBtn = h('button', {
        class: 'pomo-btn small', type: 'button',
        onclick: () => { d.muted = !d.muted; ctx.save(); paint(); },
      });
      const controls = h('div', { class: 'pomo-controls' },
        muteBtn,
        h('button', { class: 'pomo-btn', type: 'button', title: 'Reiniciar', 'aria-label': 'Reiniciar', html: SP.icon('reset', 16),
          onclick: () => { d.running = false; d.endAt = null; d.left = total(); ctx.save(); paint(); } }),
        playBtn,
        h('button', { class: 'pomo-btn', type: 'button', title: 'Saltar', 'aria-label': 'Saltar', html: SP.icon('skip', 16),
          onclick: () => advance(false) }),
        h('button', { class: 'pomo-btn small', type: 'button', title: 'Tiempos, alarma y sonidos', 'aria-label': 'Ajustes del pomodoro', html: SP.icon('gear', 15),
          onclick: () => openSettings() }));

      body.append(tabs, ring, controls);

      function openSettings() { ctx.showSettings = true; ctx.rerender(); }

      function toggle() {
        SP.sound.unlock();
        if (d.running) {
          d.left = d.endAt - Date.now(); d.running = false; d.endAt = null;
        } else {
          if (d.notify && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
          if (d.left <= 0) d.left = total();
          d.endAt = Date.now() + d.left; d.running = true;
        }
        ctx.save(); paint();
      }

      function advance(finished) {
        if (finished) {
          if (!d.muted && d.alarm !== 'none') SP.sound.alarm(d.alarm, d.volume, d.repeat);
          if (d.notify) notify(d.mode === 'focus' ? '¡Bien! Tomate un respiro.' : 'A enfocarse de nuevo.');
        }
        if (d.mode === 'focus') {
          if (finished) d.sessions++;
          d.mode = d.sessions > 0 && d.sessions % d.longEvery === 0 && finished ? 'long' : 'short';
        } else d.mode = 'focus';
        d.left = total();
        d.running = finished && d.auto;
        d.endAt = d.running ? Date.now() + d.left : null;
        ctx.save(); paint();
      }

      let lastSec = null;
      function paint() {
        const left = d.running ? d.endAt - Date.now() : d.left;
        if (d.running && left <= 0) { advance(true); return; }
        const sec = Math.ceil(left / 1000);
        if (d.running && lastSec !== null && sec !== lastSec && !d.muted) {
          if (d.countdown && sec <= 3 && sec >= 1) SP.sound.beep(d.volume);
          else if (d.tick !== 'none') SP.sound.tick(d.tick, d.volume, sec % 2 === 0);
        }
        lastSec = sec;
        time.textContent = fmt(left);
        const every = d.longEvery || 4;
        const done = d.sessions % every;
        sub.textContent = MODES[d.mode].label + ' · ' + '●'.repeat(done) + '○'.repeat(every - done);
        const p = 1 - left / total();
        prog.style.strokeDashoffset = String(LEN * (1 - Math.min(1, Math.max(0, p))));
        tabs.querySelectorAll('.pomo-tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === d.mode));
        playBtn.innerHTML = SP.icon(d.running ? 'pause' : 'play', 20);
        playBtn.title = d.running ? 'Pausar' : 'Empezar';
        muteBtn.innerHTML = SP.icon(d.muted ? 'mute' : 'volume', 15);
        muteBtn.title = d.muted ? 'Activar sonido' : 'Silenciar';
        muteBtn.classList.toggle('off', d.muted);
        body.classList.toggle('running', d.running);
        if (d.running) document.title = `${fmt(left)} · ${MODES[d.mode].label} — Startpage`;
        else if (document.title.endsWith('— Startpage')) document.title = baseTitle;
      }

      paint();
      const t = setInterval(() => { if (d.running) paint(); }, 200);
      return () => { clearInterval(t); if (document.title.endsWith('— Startpage')) document.title = baseTitle; };
    },
    menu(n, ctx) {
      const d = n.data;
      return [
        { icon: 'gear', label: 'Tiempos, alarma y sonidos…', fn: () => { ctx.showSettings = true; ctx.rerender(); } },
        { icon: d.muted ? 'volume' : 'mute', label: d.muted ? 'Activar sonido' : 'Silenciar', fn: () => { d.muted = !d.muted; ctx.save(); ctx.rerender(); } },
        { icon: 'reset', label: 'Reiniciar sesiones', fn: () => { d.sessions = 0; ctx.save(); ctx.rerender(); } },
      ];
    },
  });
})(window.SP);
