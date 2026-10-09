/* ==========================================================================
   Startpage · Notas básicas: texto, lista de tareas, reloj y buscador
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const { register } = SP.board;

  /* ---------- Nota de texto ---------- */
  register('text', {
    label: 'Nota',
    icon: 'note',
    size: [260, 220],
    min: [150, 100],
    color: 'yellow',
    create: (o) => ({ text: o.text || '', hand: !!o.hand }),
    text: (n) => n.data.text,
    render(body, n, ctx) {
      const ta = h('textarea', {
        class: 'note-text' + (n.data.hand ? ' hand' : ''),
        placeholder: 'Escribí algo…',
        spellcheck: 'false',
        value: n.data.text,
      });
      ta.addEventListener('input', () => { n.data.text = ta.value; ctx.save(); });
      body.append(ta);
    },
    menu(n, ctx) {
      return [{
        icon: 'pen',
        label: n.data.hand ? 'Letra normal' : 'Letra manuscrita',
        fn: () => { n.data.hand = !n.data.hand; ctx.save(); ctx.rerender(); },
      }];
    },
  });

  /* ---------- Lista de tareas ---------- */
  register('todo', {
    label: 'Tareas',
    icon: 'list',
    size: [260, 250],
    min: [180, 140],
    color: 'lavender',
    create: (o) => ({ items: (o.items || []).map((t) => ({ id: SP.util.uid(), text: t, done: false })) }),
    text: (n) => n.data.items.map((i) => i.text).join(' '),
    render(body, n, ctx) {
      const list = h('ul', { class: 'todo-list' });
      const draw = () => {
        list.replaceChildren(...n.data.items.map((it) => {
          const li = h('li', { class: 'todo-item' + (it.done ? ' done' : '') },
            h('button', {
              class: 'todo-check', type: 'button', 'aria-label': it.done ? 'Marcar pendiente' : 'Marcar hecha',
              html: SP.icon('check', 12),
              onclick: (e) => {
                const at = e.currentTarget.getBoundingClientRect();
                it.done = !it.done; ctx.save(); draw();
                // Festejo chiquito al terminar todas
                if (it.done && n.data.items.length > 1 && n.data.items.every((x) => x.done)) SP.ui.confetti(ctx.el);
                else if (it.done) SP.ui.burst(at);
              },
            }),
            h('span', {
              class: 'todo-text', text: it.text, title: 'Doble clic para editar',
              ondblclick: (e) => {
                const sp = e.currentTarget;
                sp.contentEditable = 'true'; sp.focus();
                const onKey = (ev) => {
                  if (ev.key === 'Enter') { ev.preventDefault(); sp.blur(); }
                  if (ev.key === 'Escape') { ev.preventDefault(); sp.textContent = it.text; sp.blur(); }
                };
                const fin = () => {
                  sp.removeEventListener('keydown', onKey);
                  sp.contentEditable = 'false';
                  it.text = sp.textContent.trim() || it.text; ctx.save(); draw();
                };
                sp.addEventListener('blur', fin, { once: true });
                sp.addEventListener('keydown', onKey);
              },
            }),
            h('button', {
              class: 'todo-del', type: 'button', 'aria-label': 'Borrar', html: SP.icon('x', 12),
              onclick: () => { n.data.items = n.data.items.filter((x) => x !== it); ctx.save(); draw(); },
            }));
          return li;
        }));
      };
      const input = h('input', { class: 'todo-input', placeholder: '+ Nueva tarea y Enter', spellcheck: 'false' });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          n.data.items.push({ id: SP.util.uid(), text: input.value.trim(), done: false });
          input.value = '';
          ctx.save(); draw();
          list.scrollTop = list.scrollHeight;
        }
      });
      draw();
      body.append(input, list);
    },
    menu(n, ctx) {
      return [{
        icon: 'check', label: 'Borrar completadas',
        fn: () => { n.data.items = n.data.items.filter((i) => !i.done); ctx.save(); ctx.rerender(); },
      }];
    },
  });

  /* ---------- Reloj ---------- */
  function greeting(hr) {
    if (hr < 6) return 'Buenas noches';
    if (hr < 13) return 'Buen día';
    if (hr < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }
  register('clock', {
    label: 'Reloj',
    icon: 'clock',
    size: [260, 150],
    min: [160, 100],
    color: 'glass',
    create: () => ({ h24: true, seconds: false, name: '' }),
    render(body, n) {
      const time = h('div', { class: 'clock-time' });
      const date = h('div', { class: 'clock-date' });
      const greet = h('div', { class: 'clock-greet' });
      const wrap = h('div', { class: 'clock' }, greet, time, date);
      body.append(wrap);
      const tick = () => {
        const d = new Date();
        const opts = { hour: '2-digit', minute: '2-digit', hour12: !n.data.h24 };
        if (n.data.seconds) opts.second = '2-digit';
        time.textContent = d.toLocaleTimeString('es', opts);
        const ds = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });
        date.textContent = ds.charAt(0).toUpperCase() + ds.slice(1);
        greet.textContent = greeting(d.getHours()) + (n.data.name ? ', ' + n.data.name : '');
      };
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      return [
        { icon: 'clock', label: n.data.h24 ? 'Formato 12 h' : 'Formato 24 h', fn: () => { n.data.h24 = !n.data.h24; ctx.save(); ctx.rerender(); } },
        { icon: 'timer', label: n.data.seconds ? 'Ocultar segundos' : 'Mostrar segundos', fn: () => { n.data.seconds = !n.data.seconds; ctx.save(); ctx.rerender(); } },
        {
          icon: 'edit', label: 'Tu nombre en el saludo',
          fn: async () => {
            const r = await SP.ui.modal({ title: 'Saludo', fields: [{ name: 'name', label: 'Tu nombre', value: n.data.name, placeholder: 'Opcional' }] });
            if (r) { n.data.name = r.name.trim(); ctx.save(); ctx.rerender(); }
          },
        },
      ];
    },
  });

  /* ---------- Buscador ---------- */
  const ENGINES = {
    google: { name: 'Google', url: 'https://www.google.com/search?q=' },
    duck: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=' },
    youtube: { name: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
  };
  register('search', {
    label: 'Buscar',
    icon: 'search',
    size: [380, 96],
    min: [220, 84],
    color: 'glass',
    create: () => ({ engine: 'google' }),
    render(body, n, ctx) {
      const eng = () => ENGINES[n.data.engine] || ENGINES.google;
      const input = h('input', { class: 'search-input', type: 'search', placeholder: `Buscar en ${eng().name}…`, spellcheck: 'false' });
      const chip = h('button', {
        class: 'search-engine', type: 'button', text: eng().name, title: 'Cambiar buscador',
        onclick: () => {
          const keys = Object.keys(ENGINES);
          n.data.engine = keys[(keys.indexOf(n.data.engine) + 1) % keys.length];
          chip.textContent = eng().name;
          input.placeholder = `Buscar en ${eng().name}…`;
          ctx.save();
          input.focus();
        },
      });
      const form = h('form', {
        class: 'search',
        onsubmit: (e) => {
          e.preventDefault();
          const q = input.value.trim();
          if (!q) return;
          // Si parece una URL, ir directo
          if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !q.includes(' ')) location.href = SP.util.normalizeUrl(q);
          else location.href = eng().url + encodeURIComponent(q);
        },
      }, h('span', { class: 'search-ico', html: SP.icon('search', 18) }), input, chip);
      body.append(form);
    },
  });
})(window.SP);
