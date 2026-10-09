/* ==========================================================================
   Startpage · Cuenta regresiva
   Días, horas y minutos hasta una fecha (o desde, si ya pasó), con un
   anillo que muestra cuánto falta desde que la creaste. Festeja al llegar.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const R = 44; const LEN = 2 * Math.PI * R;

  function nextNewYear() { return `${new Date().getFullYear() + 1}-01-01T00:00`; }

  async function ask(d) {
    const r = await SP.ui.modal({
      title: 'Cuenta regresiva',
      fields: [
        { name: 'label', label: 'Para qué', value: d.label, placeholder: 'Vacaciones, cumple, entrega…' },
        { name: 'target', label: 'Fecha y hora', type: 'datetime-local', value: d.target, required: true },
      ],
    });
    if (!r || !r.target) return false;
    d.label = r.label.trim(); d.target = r.target; d.from = Date.now(); d.celebrated = false;
    return true;
  }

  SP.board.register('countdown', {
    label: 'Cuenta regresiva',
    icon: 'hourglass',
    size: [260, 200],
    min: [170, 130],
    color: 'peach',
    create: (o) => ({ label: o.label || 'Año nuevo', target: o.target || nextNewYear(), from: Date.now(), celebrated: false }),
    text: (n) => n.data.label,
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('cd-body');
      const ring = h('div', {
        class: 'cd-ring',
        html: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${R}" class="cd-track"/><circle cx="50" cy="50" r="${R}" class="cd-prog" stroke-dasharray="${LEN}" stroke-dashoffset="0"/></svg>`,
      });
      const big = h('div', { class: 'cd-big' });
      const unit = h('div', { class: 'cd-unit' });
      const small = h('div', { class: 'cd-small' });
      const label = h('button', { type: 'button', class: 'cd-label', title: 'Cambiar fecha', text: d.label || 'Cuenta regresiva', onclick: async () => { if (await ctx.history('Cambiar cuenta regresiva', () => ask(d))) { ctx.save(); ctx.rerender(); } } });
      ring.append(h('div', { class: 'cd-center' }, big, unit));
      body.append(ring, h('div', { class: 'cd-side' }, label, small));
      const prog = ring.querySelector('.cd-prog');

      const tick = () => {
        const target = new Date(d.target).getTime();
        const now = Date.now();
        let ms = target - now;
        const past = ms < 0;
        ms = Math.abs(ms);
        const days = Math.floor(ms / 864e5);
        const hrs = Math.floor(ms / 36e5) % 24;
        const min = Math.floor(ms / 6e4) % 60;
        const sec = Math.floor(ms / 1e3) % 60;
        if (days > 0) { big.textContent = days; unit.textContent = days === 1 ? 'día' : 'días'; } else { big.textContent = `${hrs}:${String(min).padStart(2, '0')}`; unit.textContent = 'horas'; }
        small.textContent = (past ? 'Pasaron ' : 'Faltan ') + (days ? `${days} d ` : '') + `${hrs} h ${min} min ${days ? '' : sec + ' s'}`;
        const total = Math.max(1, target - (d.from || now));
        const frac = past ? 1 : Math.min(1, Math.max(0, 1 - (target - now) / total));
        prog.setAttribute('stroke-dashoffset', String(LEN * (1 - frac)));
        body.classList.toggle('done', past);
        if (past && !d.celebrated && now - target < 864e5) { d.celebrated = true; ctx.save(); SP.ui.confetti(ctx.el); SP.sound.alarm('chime', 50, 1); }
      };
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      return [{ icon: 'calendar', label: 'Cambiar fecha…', fn: async () => { if (await ask(n.data)) { ctx.save(); ctx.rerender(); } } }];
    },
  });
})(window.SP);
