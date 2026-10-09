/* ==========================================================================
   Startpage · Hábitos
   Una fila por hábito con los últimos 7 días para marcar y la racha actual.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const pad = (x) => String(x).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function lastDays(k = 7) {
    const out = [];
    const d = new Date();
    for (let i = k - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(x); }
    return out;
  }

  /** Días seguidos hasta hoy (si hoy todavía no se marcó, cuenta desde ayer) */
  function streak(done) {
    const set = new Set(done);
    const d = new Date();
    if (!set.has(iso(d))) d.setDate(d.getDate() - 1);
    let s = 0;
    while (set.has(iso(d))) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }

  SP.board.register('habits', {
    label: 'Hábitos',
    icon: 'flame',
    size: [380, 230],
    min: [300, 140],
    color: 'mint',
    create: (o) => ({ habits: (o.habits || ['Tomar agua', 'Leer 20 min', 'Caminar']).map((name) => ({ id: SP.util.uid(), name, done: [] })) }),
    text: (n) => n.data.habits.map((x) => x.name).join(' '),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('hab-body');
      const draw = () => {
        const days = lastDays(7);
        const today = iso(new Date());
        body.replaceChildren(
          h('div', { class: 'hab-row hab-headrow' },
            h('span', { class: 'hab-name' }),
            days.map((x) => h('span', { class: 'hab-dow' + (iso(x) === today ? ' today' : ''), text: x.toLocaleDateString('es', { weekday: 'narrow' }) })),
            h('span', { class: 'hab-streak', html: SP.icon('flame', 13), title: 'Racha' })),
          h('div', { class: 'hab-list' }, d.habits.map((hb) => h('div', { class: 'hab-row' },
            h('span', {
              class: 'hab-name', text: hb.name, title: 'Doble clic para renombrar',
              ondblclick: async () => {
                const r = await SP.ui.modal({ title: 'Hábito', fields: [{ name: 'name', label: 'Nombre', value: hb.name }], submitText: 'Guardar' });
                if (r && r.name.trim()) { ctx.history('Renombrar hábito', () => { hb.name = r.name.trim(); }); ctx.save(); draw(); }
              },
            }),
            days.map((x) => {
              const id = iso(x);
              const on = hb.done.includes(id);
              return h('button', {
                type: 'button', class: 'hab-cell' + (on ? ' on' : '') + (id === today ? ' today' : ''),
                'aria-pressed': on ? 'true' : 'false', 'aria-label': `${hb.name}, ${x.toLocaleDateString('es', { weekday: 'long' })}`,
                onclick: (e) => {
                  const at = e.currentTarget.getBoundingClientRect();
                  ctx.history('Marcar hábito', () => { hb.done = on ? hb.done.filter((z) => z !== id) : [...hb.done, id].slice(-400); });
                  ctx.save(); draw();
                  if (!on) {
                    const s = streak(hb.done);
                    if (s > 0 && s % 7 === 0) SP.ui.confetti(ctx.el); else SP.ui.burst(at);
                  }
                },
              }, on ? h('span', { html: SP.icon('check', 12) }) : null);
            }),
            h('span', { class: 'hab-streak', text: String(streak(hb.done)) }),
            h('button', {
              type: 'button', class: 'todo-del', 'aria-label': 'Borrar hábito', html: SP.icon('x', 11),
              onclick: () => { ctx.history('Borrar hábito', () => { d.habits = d.habits.filter((x) => x !== hb); }); ctx.save(); draw(); },
            })))),
          h('input', {
            class: 'todo-input', placeholder: '+ Nuevo hábito y Enter', spellcheck: 'false',
            onkeydown: (e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                const name = e.target.value.trim();
                ctx.history('Nuevo hábito', () => d.habits.push({ id: SP.util.uid(), name, done: [] }));
                ctx.save(); draw();
                body.querySelector('.todo-input').focus();
              }
            },
          }));
      };
      draw();
      let last = iso(new Date());
      const t = setInterval(() => { if (iso(new Date()) !== last) { last = iso(new Date()); draw(); } }, 60000);
      return () => clearInterval(t);
    },
  });
})(window.SP);
