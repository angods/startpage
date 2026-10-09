/* ==========================================================================
   Startpage · Calendario y agenda
   Mes con los días que tienen eventos, lista de lo próximo y eventos
   propios (con repetición anual para cumpleaños). Importa archivos .ics
   (Google Calendar, Outlook, Apple: "Exportar calendario").
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const pad = (x) => String(x).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayIso = () => iso(new Date());

  /** ¿El evento cae en la fecha `day` (YYYY-MM-DD)? */
  const occurs = (ev, day) => (ev.yearly ? ev.date.slice(5) === day.slice(5) && ev.date <= day : ev.date === day);

  /** Próximas apariciones a partir de hoy */
  function upcoming(events, days = 60) {
    const out = [];
    const d = new Date(); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < days && out.length < 30; i++) {
      const day = iso(d);
      events.filter((e) => occurs(e, day)).sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach((e) => out.push({ ...e, day }));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }

  /* ---------- .ics ---------- */
  function parseIcs(text) {
    const lines = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
    const events = [];
    let cur = null;
    for (const line of lines) {
      if (line === 'BEGIN:VEVENT') cur = {};
      else if (line === 'END:VEVENT') {
        if (cur && cur.date) events.push({ id: SP.util.uid(), title: cur.title || '(sin título)', date: cur.date, time: cur.time || '', yearly: !!cur.yearly });
        cur = null;
      } else if (cur) {
        const i = line.indexOf(':');
        if (i < 0) continue;
        const key = line.slice(0, i); const val = line.slice(i + 1);
        if (key.startsWith('SUMMARY')) cur.title = val.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ');
        else if (key.startsWith('DTSTART')) {
          const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(val);
          if (!m) continue;
          if (m[4] && m[7]) { // en UTC: pasar a hora local
            const d = new Date(Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]));
            cur.date = iso(d); cur.time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
          } else {
            cur.date = `${m[1]}-${m[2]}-${m[3]}`;
            if (m[4]) cur.time = `${m[4]}:${m[5]}`;
          }
        } else if (key === 'RRULE' && /FREQ=YEARLY/.test(val)) cur.yearly = true;
      }
    }
    return events;
  }

  async function eventDialog(ev = {}) {
    const r = await SP.ui.modal({
      title: ev.id ? 'Editar evento' : 'Nuevo evento',
      submitText: ev.id ? 'Guardar' : 'Agregar',
      fields: [
        { name: 'title', label: 'Qué', value: ev.title || '', required: true, placeholder: 'Cumple de Ana, turno médico…' },
        { name: 'date', label: 'Día', type: 'date', value: ev.date || todayIso(), required: true },
        { name: 'time', label: 'Hora (opcional)', type: 'time', value: ev.time || '' },
        { name: 'yearly', label: 'Repetir', type: 'select', value: ev.yearly ? '1' : '0', options: [{ value: '0', label: 'No se repite' }, { value: '1', label: 'Todos los años' }] },
      ],
    });
    if (!r || !r.title.trim() || !r.date) return null;
    return { id: ev.id || SP.util.uid(), title: r.title.trim(), date: r.date, time: r.time, yearly: r.yearly === '1' };
  }

  SP.board.register('calendar', {
    label: 'Calendario',
    icon: 'calendar',
    size: [300, 380],
    min: [220, 200],
    color: 'glass',
    create: () => ({ events: [], offset: 0 }),
    text: (n) => n.data.events.map((e) => e.title).join(' '),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('cal-body');
      let selectedDay = todayIso();
      let offset = 0; // meses respecto del actual (no se guarda)

      const draw = () => {
        const now = new Date();
        const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const t0 = first.toLocaleDateString('es', { month: 'long', year: 'numeric' });
        const title = t0.charAt(0).toUpperCase() + t0.slice(1);
        const start = new Date(first);
        start.setDate(1 - ((first.getDay() + 6) % 7)); // semana desde el lunes
        const cells = [];
        for (let i = 0; i < 42; i++) {
          const day = new Date(start); day.setDate(start.getDate() + i);
          const id = iso(day);
          const has = d.events.some((e) => occurs(e, id));
          cells.push(h('button', {
            type: 'button',
            class: 'cal-day' + (day.getMonth() !== first.getMonth() ? ' out' : '') + (id === todayIso() ? ' today' : '') + (id === selectedDay ? ' sel' : '') + (has ? ' has' : ''),
            'aria-label': day.toLocaleDateString('es', { dateStyle: 'full' }) + (has ? ', con eventos' : ''),
            onclick: () => { selectedDay = id; draw(); },
            ondblclick: async () => {
              const ev = await eventDialog({ date: id });
              if (ev) { ctx.history('Agregar evento', () => d.events.push(ev)); ctx.save(); draw(); }
            },
          }, String(day.getDate())));
        }
        const dow = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => h('span', { class: 'cal-dow', text: x }));

        const dayEvents = d.events.filter((e) => occurs(e, selectedDay)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const isToday = selectedDay === todayIso();
        const list = isToday ? upcoming(d.events).slice(0, 8) : dayEvents.map((e) => ({ ...e, day: selectedDay }));
        const listTitle = isToday ? 'Próximo' : fromIso(selectedDay).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });

        body.replaceChildren(
          h('div', { class: 'cal-head' },
            h('button', { type: 'button', class: 'cal-nav', 'aria-label': 'Mes anterior', html: SP.icon('back_arrow', 14), onclick: () => { offset--; draw(); } }),
            h('button', { type: 'button', class: 'cal-title', text: title, title: 'Volver a hoy', onclick: () => { offset = 0; selectedDay = todayIso(); draw(); } }),
            h('button', { type: 'button', class: 'cal-nav', 'aria-label': 'Mes siguiente', html: SP.icon('chevron', 14), onclick: () => { offset++; draw(); } })),
          h('div', { class: 'cal-grid' }, dow, cells),
          h('div', { class: 'cal-list-head' },
            h('span', { text: listTitle }),
            h('button', {
              type: 'button', class: 'cal-add', title: 'Agregar evento', html: SP.icon('plus', 14),
              onclick: async () => {
                const ev = await eventDialog({ date: selectedDay });
                if (ev) { ctx.history('Agregar evento', () => d.events.push(ev)); ctx.save(); draw(); }
              },
            })),
          h('ul', { class: 'cal-list' }, list.length ? list.map((e) => {
            const when = e.day === todayIso() ? 'Hoy' : fromIso(e.day).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });
            const orig = d.events.find((x) => x.id === e.id);
            return h('li', { class: 'cal-ev' },
              h('span', { class: 'cal-when', text: (isToday ? when + ' ' : '') + (e.time || '') }),
              h('span', { class: 'cal-what', text: e.title + (e.yearly ? ' 🎂' : '') }),
              h('button', {
                type: 'button', class: 'todo-del', 'aria-label': 'Editar', html: SP.icon('edit', 12),
                onclick: async () => {
                  const ev = await eventDialog(orig);
                  if (ev) { ctx.history('Editar evento', () => Object.assign(orig, ev)); ctx.save(); draw(); }
                },
              }),
              h('button', {
                type: 'button', class: 'todo-del', 'aria-label': 'Borrar', html: SP.icon('x', 12),
                onclick: () => { ctx.history('Borrar evento', () => { d.events = d.events.filter((x) => x.id !== e.id); }); ctx.save(); draw(); },
              }));
          }) : h('li', { class: 'cal-empty', text: isToday ? 'Nada en los próximos días. Doble clic en un día para agregar.' : 'Sin eventos' })));
      };
      draw();
      // A medianoche cambia el "hoy"
      let last = todayIso();
      const t = setInterval(() => { if (todayIso() !== last) { last = todayIso(); selectedDay = last; draw(); } }, 60000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      return [
        {
          icon: 'upload', label: 'Importar .ics…',
          fn: () => {
            // (sin devolver promesa: si se cancela el selector, no queda nada abierto)
            const input = h('input', { type: 'file', accept: '.ics,text/calendar' });
            input.addEventListener('change', async () => {
              try {
                const evs = parseIcs(await input.files[0].text());
                const seen = new Set(n.data.events.map((e) => e.title + e.date + e.time));
                const fresh = evs.filter((e) => !seen.has(e.title + e.date + e.time));
                ctx.history('Importar eventos', () => n.data.events.push(...fresh));
                ctx.save(); ctx.rerender();
                SP.ui.toast(`${fresh.length} eventos importados`);
              } catch (e) { SP.ui.toast('No se pudo leer el archivo'); }
            });
            input.click();
          },
        },
        {
          icon: 'trash', label: 'Borrar eventos pasados',
          fn: () => { const t = todayIso(); n.data.events = n.data.events.filter((e) => e.yearly || e.date >= t); ctx.save(); ctx.rerender(); },
        },
      ];
    },
  });

  SP.calendar = { parseIcs, upcoming };
})(window.SP);
