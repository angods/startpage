/* ==========================================================================
   Startpage · Paleta de comandos (Ctrl+K)
   Un buscador para todo: ir a una nota (de cualquier tablero), agregar
   widgets, cambiar de tablero, ajustes rápidos o buscar en la web.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, fuzzy, fold } = SP.util;
  let wrap = null;

  const S = () => SP.store.state;

  function commands() {
    const s = S();
    const B = SP.board;
    const cmds = [];
    const add = (icon, label, run, extra = {}) => cmds.push({ icon, label, run, group: 'Acciones', ...extra });

    SP.app.ADD_ITEMS.forEach((it) => add(it.icon, 'Agregar ' + it.label.toLowerCase(), () => SP.app.addOfType(it.type), { hint: it.desc, group: 'Agregar', keys: 'nuevo crear widget' }));
    add('undo', 'Deshacer', SP.history.undo, { kbd: 'Ctrl Z' });
    add('redo', 'Rehacer', SP.history.redo, { kbd: 'Ctrl Shift Z' });
    add(s.theme === 'dark' ? 'sun' : 'moon', s.theme === 'dark' ? 'Tema claro' : 'Tema oscuro', SP.theme.toggle, { kbd: 'T' });
    add(s.locked ? 'unlock' : 'lock', s.locked ? 'Desbloquear tablero' : 'Bloquear tablero', () => B.setLocked(!s.locked), { kbd: 'L' });
    add('fit', 'Ver todo el tablero', B.zoomFit, { kbd: 'F', keys: 'zoom vista general' });
    add('zoomin', 'Acercar', () => B.zoomBy(1.2), { kbd: 'Ctrl +', keys: 'zoom' });
    add('zoomout', 'Alejar', () => B.zoomBy(1 / 1.2), { kbd: 'Ctrl −', keys: 'zoom' });
    add('search', 'Zoom al 100%', () => B.setZoom(1), { kbd: 'Ctrl 0' });
    add('layout', 'Ordenar el tablero', B.arrange, { keys: 'acomodar organizar auto' });
    add('grid', 'Elegir todas las notas', () => B.select(B.notes().map((n) => n.id)), { kbd: 'Ctrl A' });
    add('plus', 'Nuevo tablero', () => B.addBoard(), { keys: 'pestaña' });
    add('grid', (s.snap ? 'Desactivar' : 'Activar') + ' la cuadrícula', () => { s.snap = !s.snap; SP.store.save(); SP.ui.toast(s.snap ? 'Cuadrícula activada' : 'Cuadrícula desactivada'); });
    add('alignCX', (s.guides ? 'Desactivar' : 'Activar') + ' las guías de alineación', () => { s.guides = !s.guides; SP.store.save(); SP.ui.toast(s.guides ? 'Guías activadas' : 'Guías desactivadas'); });
    add('bolt', (s.lite ? 'Desactivar' : 'Activar') + ' el modo ligero', () => { s.lite = !s.lite; SP.store.save(); SP.theme.applyLook(); });
    add('sliders', 'Abrir ajustes', SP.settings.open, { keys: 'configuracion opciones' });
    add('keyboard', 'Atajos de teclado', SP.app.showShortcuts, { kbd: '?', keys: 'ayuda' });
    add('download', 'Exportar copia de seguridad', () => SP.settings.exportData(), { keys: 'backup json' });
    if (SP.sync && SP.sync.ready()) add('cloudsync', 'Sincronizar ahora', () => SP.sync.now(), { keys: 'gist nube' });

    s.boards.forEach((b, i) => {
      if (b.id !== s.board) cmds.push({ icon: 'layout', label: 'Ir al tablero ' + b.name, run: () => B.switchBoard(b.id), group: 'Tableros', kbd: i < 9 ? 'Alt ' + (i + 1) : null });
    });

    // Notas de todos los tableros
    const boardName = (id) => (s.boards.find((b) => b.id === id) || {}).name || '';
    s.notes.forEach((n) => {
      const W = SP.widgets[n.type];
      if (!W) return;
      let text = '';
      try { text = W.text ? String(W.text(n) || '') : ''; } catch (e) { text = ''; }
      if (n.type === 'link') text = n.data.url;
      const title = n.title || W.label;
      cmds.push({
        icon: W.icon, label: title, run: () => B.focusNote(n.id), group: 'Notas',
        hint: (s.boards.length > 1 ? boardName(n.board) + ' · ' : '') + text.replace(/\s+/g, ' ').slice(0, 80),
        keys: text.slice(0, 2000) + ' ' + W.label,
      });
    });
    return cmds;
  }

  function score(c, q) {
    if (!q) return c.group === 'Notas' ? 0 : 1;
    const a = fuzzy(q, c.label) * 2;
    const b = c.keys ? (fold(c.keys).includes(fold(q)) ? 40 : 0) : 0;
    const d = c.hint ? (fold(c.hint).includes(fold(q)) ? 20 : 0) : 0;
    return Math.max(a, b, d);
  }

  function open() {
    if (wrap) { close(); return; }
    SP.ui.closeMenu();
    const all = commands();
    const input = h('input', {
      class: 'palette-input', type: 'text', placeholder: 'Buscá notas, widgets o acciones…',
      spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Buscar comandos',
      role: 'combobox', 'aria-expanded': 'true', 'aria-controls': 'palette-list',
    });
    const list = h('div', { class: 'palette-list', id: 'palette-list', role: 'listbox' });
    let items = []; let active = 0;

    const render = () => {
      const q = input.value.trim();
      items = all.map((c) => ({ c, s: score(c, q) })).filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s).slice(0, q ? 40 : 60).map((x) => x.c);
      if (!q) {
        // Sin búsqueda: primero acciones útiles, después las notas
        items.sort((a, b) => (a.group === 'Notas') - (b.group === 'Notas'));
      }
      if (q) items.push({ icon: 'globe', label: `Buscar "${q}" en la web`, group: 'Web', run: () => window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener') });
      active = Math.min(active, items.length - 1);
      let lastGroup = null;
      list.replaceChildren(...items.flatMap((c, i) => {
        const out = [];
        if (c.group !== lastGroup) { out.push(h('div', { class: 'palette-group', text: c.group })); lastGroup = c.group; }
        out.push(h('div', {
          class: 'palette-item' + (i === active ? ' active' : ''), role: 'option', id: 'pi-' + i,
          'aria-selected': i === active ? 'true' : 'false',
          onpointerdown: (e) => { e.preventDefault(); run(i); },
          onpointermove: () => { if (active !== i) { active = i; paintActive(); } },
        },
        h('span', { class: 'palette-ico', html: SP.icon(c.icon || 'chevron', 16) }),
        h('span', { class: 'palette-text' }, h('span', { text: c.label }), c.hint ? h('small', { text: c.hint }) : null),
        c.kbd ? h('span', { class: 'palette-kbd' }, c.kbd.split(' ').map((k) => h('kbd', { text: k }))) : null));
        return out;
      }));
      paintActive();
    };
    const paintActive = () => {
      list.querySelectorAll('.palette-item').forEach((el, i) => {
        el.classList.toggle('active', i === active);
        el.setAttribute('aria-selected', i === active ? 'true' : 'false');
      });
      const el = list.querySelector('#pi-' + active);
      if (el) { el.scrollIntoView({ block: 'nearest' }); input.setAttribute('aria-activedescendant', el.id); }
    };
    const run = (i) => {
      const c = items[i];
      if (!c) return;
      close();
      setTimeout(() => c.run(), 10);
    };

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; paintActive(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + items.length) % items.length; paintActive(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); close(); }
    });

    wrap = h('div', { class: 'palette-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Paleta de comandos' },
      h('div', { class: 'palette glass' },
        h('div', { class: 'palette-head' }, h('span', { html: SP.icon('search', 18) }), input, h('kbd', { text: 'Esc' })),
        list,
        h('div', { class: 'palette-foot' },
          h('span', null, h('kbd', { text: '↑' }), h('kbd', { text: '↓' }), ' moverse'),
          h('span', null, h('kbd', { text: 'Enter' }), ' elegir'),
          h('span', null, h('kbd', { text: 'Ctrl' }), h('kbd', { text: 'K' }), ' abrir / cerrar'))));
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
    document.body.append(wrap);
    render();
    requestAnimationFrame(() => { wrap.classList.add('show'); input.focus(); });
  }

  function close() {
    if (!wrap) return;
    const w = wrap; wrap = null;
    w.classList.remove('show');
    if (w.contains(document.activeElement)) document.activeElement.blur();
    setTimeout(() => w.remove(), 160);
  }

  SP.palette = { open, close };
})(window.SP);
