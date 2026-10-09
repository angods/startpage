/* ==========================================================================
   Startpage · Arranque
   Carga el estado, arma la barra de herramientas, las pestañas de tableros
   y el zoom, crea el tablero inicial la primera vez y conecta atajos,
   pegado de enlaces/imágenes/texto y arrastre de archivos.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  /* ---------- Menú "Agregar" ---------- */
  const ADD_ITEMS = [
    { cat: 'Escribir', type: 'text', icon: 'note', label: 'Nota', desc: 'Texto libre' },
    { cat: 'Escribir', type: 'markdown', icon: 'markdown', label: 'Markdown', desc: 'Títulos, listas, links' },
    { cat: 'Escribir', type: 'todo', icon: 'list', label: 'Tareas', desc: 'Lista con checks' },
    { cat: 'Escribir', type: 'ascii', icon: 'ascii', label: 'ASCII art', desc: 'Dibujos con letras' },
    { cat: 'Escribir', type: 'draw', icon: 'brush', label: 'Dibujo', desc: 'Pizarra a mano alzada' },
    { cat: 'Escribir', type: 'image', icon: 'image', label: 'Imágenes', desc: 'Foto o galería' },
    { cat: 'Accesos', type: 'link', icon: 'link', label: 'Acceso directo', desc: 'Una página con su ícono' },
    { cat: 'Accesos', type: 'folder', icon: 'folder', label: 'Carpeta', desc: 'Agrupa accesos' },
    { cat: 'Accesos', type: 'search', icon: 'search', label: 'Buscador', desc: 'Google, DuckDuckGo…' },
    { cat: 'Tiempo', type: 'clock', icon: 'clock', label: 'Reloj', desc: 'Hora y fecha' },
    { cat: 'Tiempo', type: 'calendar', icon: 'calendar', label: 'Calendario', desc: 'Mes y agenda' },
    { cat: 'Tiempo', type: 'countdown', icon: 'hourglass', label: 'Cuenta regresiva', desc: 'Días hasta…' },
    { cat: 'Tiempo', type: 'pomodoro', icon: 'timer', label: 'Pomodoro', desc: 'Foco y descansos' },
    { cat: 'Tiempo', type: 'habits', icon: 'flame', label: 'Hábitos', desc: 'Rachas diarias' },
    { cat: 'Info', type: 'weather', icon: 'cloud', label: 'Clima', desc: 'Elegí tu ciudad' },
    { cat: 'Info', type: 'rss', icon: 'rss', label: 'Noticias (RSS)', desc: 'Titulares de un sitio' },
    { cat: 'Info', type: 'rates', icon: 'dollar', label: 'Cotizaciones', desc: 'Dólar y cripto' },
    { cat: 'Info', type: 'converter', icon: 'swap', label: 'Conversor', desc: 'Unidades y monedas' },
    { cat: 'Herramientas', type: 'sheet', icon: 'table', label: 'Planilla', desc: 'Tabla con fórmulas' },
    { cat: 'Herramientas', type: 'calc', icon: 'calc', label: 'Calculadora', desc: '6 skins para elegir' },
    { cat: 'Media', type: 'youtube', icon: 'video', label: 'Video de YouTube', desc: 'Pegá un enlace' },
    { cat: 'Media', type: 'ambient', icon: 'music', label: 'Sonido ambiente', desc: 'Lluvia, olas, fuego…' },
  ];

  async function addOfType(type) {
    if (SP.store.state.locked) { SP.ui.toast('Desbloqueá el tablero para agregar notas'); return; }
    if (type === 'link') {
      const r = await SP.link.prompt();
      if (r) SP.board.add('link', { url: r.url, title: r.title, icon: r.icon });
      return;
    }
    if (type === 'youtube') {
      const v = await SP.youtube.ask();
      if (v) SP.board.add('youtube', v);
      return;
    }
    SP.board.add(type);
  }

  function openAddMenu() {
    if (SP.store.state.locked) { SP.ui.toast('Desbloqueá el tablero para agregar notas'); return; }
    const btn = document.getElementById('btn-add');
    const search = h('input', { class: 'font-search menu-search', type: 'search', placeholder: 'Buscar widget…', spellcheck: 'false', 'aria-label': 'Buscar widget' });
    const cats = [...new Set(ADD_ITEMS.map((i) => i.cat))];
    const grid = h('div', { class: 'add-grid' }, cats.map((c) => [
      h('div', { class: 'add-cat', text: c, dataset: { cat: c } }),
      ADD_ITEMS.filter((it) => it.cat === c).map((it) => h('button', {
        type: 'button', class: 'add-item', dataset: { q: SP.util.fold(it.label + ' ' + it.desc), cat: c },
        onclick: () => { SP.ui.closeMenu(); addOfType(it.type); },
      },
      h('span', { class: 'add-ico', html: SP.icon(it.icon, 18) }),
      h('span', { class: 'add-text' }, h('strong', { text: it.label }), h('small', { text: it.desc })))),
    ]));
    search.addEventListener('input', () => {
      const q = SP.util.fold(search.value.trim());
      grid.querySelectorAll('.add-item').forEach((b) => { b.hidden = !!q && !b.dataset.q.includes(q); });
      grid.querySelectorAll('.add-cat').forEach((c) => {
        c.hidden = !!q || ![...grid.querySelectorAll(`.add-item[data-cat="${c.dataset.cat}"]`)].some((b) => !b.hidden);
      });
    });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = grid.querySelector('.add-item:not([hidden])'); if (first) first.click(); }
    });
    SP.ui.menu(btn, h('div', { class: 'add-menu' }, search, grid));
    setTimeout(() => search.focus(), 30);
  }

  /* ---------- Tablero inicial ---------- */
  function seed() {
    const W = Math.max(window.innerWidth, 1200);
    const ox = Math.max(0, Math.round((W - 1400) / 2 / 20) * 20);
    const at = (x, y, w, hh) => ({ x: x + ox, y, w, h: hh });
    const B = SP.board;

    B.add('clock', {}, at(40, 80, 280, 160));
    B.add('weather', {}, at(40, 260, 280, 240));
    B.add('search', {}, at(340, 80, 440, 100));

    const links = [
      ['https://www.youtube.com', 'YouTube'], ['https://mail.google.com', 'Gmail'],
      ['https://github.com', 'GitHub'], ['https://www.reddit.com', 'Reddit'],
      ['https://es.wikipedia.org', 'Wikipedia'], ['https://open.spotify.com', 'Spotify'],
      ['https://drive.google.com', 'Drive'], ['https://www.pinterest.com', 'Pinterest'],
    ];
    links.forEach(([url, title], i) => {
      B.add('link', { url, title }, at(340 + (i % 4) * 120, 200 + Math.floor(i / 4) * 120, 100, 100));
    });

    B.add('sheet', {
      title: 'Compras',
      cols: 4, rows: 6,
      cells: {
        A1: 'Ítem', B1: 'Cant.', C1: 'Precio', D1: 'Subtotal',
        A2: 'Café', B2: '2', C2: '1500', D2: '=B2*C2',
        A3: 'Libro', B3: '1', C3: '12000', D3: '=B3*C3',
        A4: 'Plantas', B4: '3', C4: '2500', D4: '=B4*C4',
      },
    }, at(340, 440, 440, 280));

    B.add('text', {
      text: '¡Hola! Este es tu tablero ✨\n\n' +
        '• Arrastrá las notas desde su barra.\n' +
        '• Esquina inferior derecha: tamaño.\n' +
        '• ⋯ o clic derecho: color, orden y más.\n' +
        '• Ctrl+K: buscar y hacer cualquier cosa.\n' +
        '• Ctrl+Z deshace · arrastrá en vacío para elegir varias.\n' +
        '• Pegá un link, una imagen o un texto.\n\n' +
        'Todo se guarda solo.',
    }, at(800, 80, 300, 320));

    B.add('todo', { items: ['Elegir mi ciudad en el clima', 'Subir un video de fondo', 'Probar el pomodoro'] }, at(800, 420, 300, 240));
    B.add('pomodoro', {}, at(1120, 80, 260, 300));
    B.add('ascii', { preset: 'cat' }, at(1120, 400, 260, 260));

    SP.store.state.seeded = true;
    SP.history.clear();
    SP.store.save();
  }

  /* ---------- Pegar sobre el tablero: enlaces, imágenes y texto ---------- */
  function isEditable(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  /** ¿Parece ASCII art? (varias líneas y muchos símbolos) */
  function looksLikeAscii(t) {
    const lines = t.split('\n');
    if (lines.length < 3) return false;
    const sym = (t.match(/[^\w\sáéíóúñ.,;:¿?¡!'"()-]/gi) || []).length;
    return sym / t.replace(/\s/g, '').length > 0.35 || /^ {2,}\S/m.test(t) && sym > 20;
  }

  function onPaste(e) {
    if (isEditable(e.target) || SP.store.state.locked || document.querySelector('.modal-wrap')) return;
    const dt = e.clipboardData;
    if (!dt) return;
    const img = [...dt.files].find((f) => /^image\//.test(f.type));
    if (img) { e.preventDefault(); SP.image.addFiles([img]); return; }
    const text = dt.getData('text') || '';
    const t = text.trim();
    if (!t) return;
    if (!/\s/.test(t)) {
      const yt = SP.youtube.parse(t);
      if (yt && /youtu/.test(t)) {
        e.preventDefault();
        SP.board.add('youtube', { url: t, ...yt });
        SP.ui.toast('Video de YouTube agregado');
        return;
      }
      if (/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(t)) {
        e.preventDefault();
        const url = SP.util.normalizeUrl(t);
        SP.board.add('link', { url, title: SP.link.prettyName(url) });
        SP.ui.toast('Acceso directo agregado');
        return;
      }
    }
    // Texto suelto: nueva nota (o nota ASCII si lo parece)
    e.preventDefault();
    if (looksLikeAscii(text)) {
      SP.board.add('ascii', { art: text.replace(/\s+$/, '') });
      SP.ui.toast('Nota ASCII creada con lo que pegaste');
    } else {
      SP.board.add('text', { text: t });
      SP.ui.toast('Nota creada con lo que pegaste');
    }
  }

  /* ---------- Soltar archivos y enlaces sobre la página ---------- */
  function setupDrop() {
    let depth = 0;
    const label = h('span', { text: 'Soltá acá' });
    const hint = h('div', { id: 'drop-hint', class: 'glass' }, h('span', { html: SP.icon('upload', 22) }), label);
    document.body.append(hint);
    const kinds = (e) => [...((e.dataTransfer && e.dataTransfer.types) || [])];
    const accepts = (e) => { const k = kinds(e); return k.includes('Files') || k.includes('text/uri-list'); };
    document.addEventListener('dragenter', (e) => {
      if (!accepts(e)) return;
      depth++;
      label.textContent = kinds(e).includes('Files') ? 'Soltá una imagen (nota) o un video (fondo)' : 'Soltá el enlace para crear un acceso';
      hint.classList.add('show');
    });
    document.addEventListener('dragleave', (e) => { if (accepts(e) && --depth <= 0) { depth = 0; hint.classList.remove('show'); } });
    document.addEventListener('dragover', (e) => { if (accepts(e)) e.preventDefault(); });
    document.addEventListener('drop', async (e) => {
      if (!accepts(e)) return;
      e.preventDefault();
      depth = 0; hint.classList.remove('show');
      const files = [...e.dataTransfer.files];
      const pos = SP.board.toCanvas(e.clientX, e.clientY);
      const imgs = files.filter((x) => /^image\//.test(x.type));
      if (imgs.length) { SP.image.addFiles(imgs, pos); return; }
      const f = files.find((x) => /^video\//.test(x.type));
      if (f) {
        SP.ui.toast('Guardando video…');
        await SP.background.setFile(SP.background.activeSlot(), f);
        if (SP.settings) SP.settings.render();
        SP.ui.toast('¡Listo! Video de fondo actualizado');
        return;
      }
      if (files.length) { SP.ui.toast('Soltá una imagen o un video (.mp4 / .webm)'); return; }
      const url = (e.dataTransfer.getData('text/uri-list') || '').split('\n').find((l) => l && l[0] !== '#');
      if (url && !SP.store.state.locked) {
        const W = SP.widgets.link.size;
        SP.board.add('link', { url, title: SP.link.prettyName(url) }, { x: Math.max(0, Math.round(pos.x - W[0] / 2)), y: Math.max(0, Math.round(pos.y - W[1] / 2)), w: W[0], h: W[1] });
        SP.ui.toast('Acceso directo agregado');
      }
    });
  }

  /* ---------- Llevar los datos a otra dirección (archivo local → GitHub Pages, etc.) ---------- */
  const IMPORT_KEY = '#sp-import=';
  function toB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function fromB64(b64) {
    const bin = atob(b64);
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  SP.migrate = {
    openAt(url) {
      SP.store.saveNow();
      const data = JSON.stringify(SP.store.state);
      window.open(url.replace(/#.*$/, '') + IMPORT_KEY + encodeURIComponent(toB64(data)), '_blank');
    },
  };
  async function checkImport() {
    if (!location.hash.startsWith(IMPORT_KEY)) return;
    const raw = location.hash.slice(IMPORT_KEY.length);
    history.replaceState(null, '', location.pathname + location.search);
    let data;
    try { data = JSON.parse(fromB64(decodeURIComponent(raw))); } catch (e) { SP.ui.toast('No se pudieron leer los datos recibidos'); return; }
    if (!data || data.v !== 1 || !Array.isArray(data.notes)) return;
    const ok = await SP.ui.modal({
      title: '¿Traer tus notas?',
      message: `Llegaron ${data.notes.length} notas y tus ajustes desde otra dirección. Van a reemplazar lo que hay acá.`,
      submitText: 'Traer notas',
    });
    if (!ok) return;
    SP.app.replaceState(data);
    SP.ui.toast('¡Listo! Tus notas ya están acá');
  }

  /* ---------- Pestañas de tableros ---------- */
  function renderBoards() {
    const nav = document.getElementById('boards');
    const s = SP.store.state;
    const count = (id) => s.notes.filter((n) => n.board === id).length;
    nav.replaceChildren(
      ...s.boards.map((b, i) => {
        const tab = h('button', {
          type: 'button', role: 'tab',
          class: 'board-tab' + (b.id === s.board ? ' active' : ''),
          'aria-selected': b.id === s.board ? 'true' : 'false',
          title: `${b.name} · ${count(b.id)} notas${i < 9 ? ` (Alt+${i + 1})` : ''}\nDoble clic: renombrar · Clic derecho: opciones`,
          onclick: () => SP.board.switchBoard(b.id),
          ondblclick: () => renameBoardInline(tab, b),
          oncontextmenu: (e) => { e.preventDefault(); boardMenu(tab, b); },
        }, h('span', { class: 'board-name', text: b.name }));
        // Soltar notas seleccionadas sobre una pestaña: mover a ese tablero
        return tab;
      }),
      h('button', {
        type: 'button', class: 'board-tab add', title: 'Nuevo tablero', 'aria-label': 'Nuevo tablero', html: SP.icon('plus', 15),
        onclick: () => {
          const b = SP.board.addBoard();
          requestAnimationFrame(() => { const t = nav.querySelector('.board-tab.active'); if (t) renameBoardInline(t, b); });
        },
      }));
    nav.hidden = false;
  }

  function renameBoardInline(tab, b) {
    const name = tab.querySelector('.board-name');
    if (!name) return;
    name.contentEditable = 'true';
    name.focus();
    const r = document.createRange(); r.selectNodeContents(name);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const done = (save) => {
      name.contentEditable = 'false';
      name.removeEventListener('keydown', onKey);
      const t = name.textContent.trim();
      if (save && t && t !== b.name) SP.board.renameBoard(b.id, t.slice(0, 40));
      else name.textContent = b.name;
    };
    const onKey = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); done(true); name.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); done(false); name.blur(); }
    };
    name.addEventListener('keydown', onKey);
    name.addEventListener('blur', () => { if (name.isContentEditable) done(true); }, { once: true });
  }

  function boardMenu(anchor, b) {
    SP.ui.menu(anchor, [
      h('div', { class: 'menu-label', text: b.name }),
      SP.ui.menuItem('edit', 'Renombrar', () => renameBoardInline(anchor, b)),
      SP.ui.menuItem('back_arrow', 'Mover a la izquierda', () => SP.board.moveBoard(b.id, -1)),
      SP.ui.menuItem('chevron', 'Mover a la derecha', () => SP.board.moveBoard(b.id, 1)),
      SP.ui.menuItem('layout', 'Ordenar sus notas', () => { SP.board.switchBoard(b.id); SP.board.arrange(); }),
      h('div', { class: 'menu-sep' }),
      SP.ui.menuItem('trash', 'Borrar tablero', () => SP.board.deleteBoard(b.id), { danger: true }),
    ], { align: 'start' });
  }

  /* ---------- Zoom ---------- */
  function renderZoom() {
    const pct = document.getElementById('zoom-pct');
    if (pct) pct.textContent = Math.round(SP.board.zoom() * 100) + '%';
  }

  /* ---------- Ayuda de atajos ---------- */
  const SHORTCUTS = [
    ['Ctrl K', 'Paleta de comandos: buscar notas y acciones'],
    ['N', 'Agregar nota'],
    ['Ctrl Z', 'Deshacer'], ['Ctrl Shift Z', 'Rehacer (o Ctrl Y)'],
    ['Clic + arrastrar en vacío', 'Elegir varias notas'],
    ['Shift + clic', 'Sumar o quitar una nota de la selección'],
    ['Flechas', 'Mover lo elegido (Shift: más · Alt: de a 1px)'],
    ['Supr', 'Borrar lo elegido'], ['Ctrl D', 'Duplicar'], ['Ctrl A', 'Elegir todo el tablero'],
    ['Esc', 'Soltar la selección'],
    ['Tab', 'Recorrer las notas · Enter entra a la nota'],
    ['Alt 1…9', 'Ir al tablero 1…9'],
    ['Ctrl + rueda', 'Zoom (también Ctrl + / Ctrl − / Ctrl 0)'], ['F', 'Ver todo el tablero'],
    ['L', 'Candado'], ['T', 'Tema claro / oscuro'],
    ['Ctrl V', 'Pegar un enlace, una imagen o un texto crea una nota'],
    ['Doble clic en el título', 'Renombrar · en la barra: plegar'],
    ['?', 'Esta ayuda'],
  ];
  function showShortcuts() {
    const KEY = /^(Ctrl|Shift|Alt|Supr|Esc|Tab|Enter|Flechas|[A-Z0-9?]|1…9)$/;
    const kbd = (s) => s.split(' ').map((k, i) => [i ? ' ' : null, KEY.test(k) ? h('kbd', { text: k }) : k]);
    SP.ui.modal({
      title: 'Atajos de teclado',
      submitText: 'Listo', noCancel: true, wide: true,
      content: h('div', { class: 'shortcuts' }, SHORTCUTS.map(([k, d]) => h('div', { class: 'sc-row' }, h('span', { class: 'sc-keys' }, kbd(k)), h('span', { text: d })))),
    });
  }

  /* ---------- Atajos ---------- */
  function onKey(e) {
    if (document.querySelector('.modal-wrap.show, .palette-wrap.show')) return;
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    // Paleta de comandos: funciona siempre
    if (mod && k === 'k') { e.preventDefault(); SP.palette.open(); return; }
    if (isEditable(e.target)) return;
    if (mod && !e.altKey) {
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); SP.history.undo(); return; }
      if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); SP.history.redo(); return; }
      if (k === '=' || k === '+') { e.preventDefault(); SP.board.zoomBy(1.2); return; }
      if (k === '-') { e.preventDefault(); SP.board.zoomBy(1 / 1.2); return; }
      if (k === '0') { e.preventDefault(); SP.board.setZoom(1); return; }
    }
    if (e.altKey && !mod && /^[1-9]$/.test(e.key)) {
      const b = SP.store.state.boards[+e.key - 1];
      if (b) { e.preventDefault(); SP.board.switchBoard(b.id); }
      return;
    }
    // Si el foco está dentro de un widget (p. ej. la calculadora), las teclas son suyas
    if (e.target.closest && e.target.closest('.note-body, .popover, .settings')) return;
    if (SP.board.handleKey(e)) { e.preventDefault(); return; }
    if (mod || e.altKey) return;
    if (k === 'n') { e.preventDefault(); openAddMenu(); }
    else if (k === 'l') { e.preventDefault(); SP.board.setLocked(!SP.store.state.locked); }
    else if (k === 't') { e.preventDefault(); SP.theme.toggle(); }
    else if (k === 'f') { e.preventDefault(); SP.board.zoomFit(); }
    else if (e.key === '?') { e.preventDefault(); showShortcuts(); }
  }

  /** Reemplaza todo el estado (importar, sincronizar) y redibuja */
  function replaceState(data) {
    SP.store.replace(data);
    SP.history.clear();
    SP.theme.apply();
    SP.board.renderAll({ entrance: true });
    SP.board.setLocked(SP.store.state.locked, { silent: true });
    SP.background.refresh();
    renderBoards(); renderZoom();
    if (SP.settings) SP.settings.render();
  }

  /* ---------- Inicio ---------- */
  function init() {
    SP.store.load();
    SP.theme.apply();

    const $ = (id) => document.getElementById(id);
    $('btn-add').innerHTML = SP.icon('plus', 18) + '<span>Agregar</span>';
    $('btn-settings').innerHTML = SP.icon('sliders', 18);
    $('btn-undo').innerHTML = SP.icon('undo', 18);
    $('btn-redo').innerHTML = SP.icon('redo', 18);
    $('btn-cmd').innerHTML = SP.icon('command', 18);
    $('btn-add').addEventListener('click', openAddMenu);
    $('btn-lock').addEventListener('click', () => SP.board.setLocked(!SP.store.state.locked));
    $('btn-theme').addEventListener('click', () => SP.theme.toggle());
    $('btn-settings').addEventListener('click', () => SP.settings.open());
    $('btn-undo').addEventListener('click', () => SP.history.undo());
    $('btn-redo').addEventListener('click', () => SP.history.redo());
    $('btn-cmd').addEventListener('click', () => SP.palette.open());
    $('zoom-out').innerHTML = SP.icon('zoomout', 16);
    $('zoom-in').innerHTML = SP.icon('zoomin', 16);
    $('zoom-fit').innerHTML = SP.icon('fit', 16);
    $('zoom-out').addEventListener('click', () => SP.board.zoomBy(1 / 1.2));
    $('zoom-in').addEventListener('click', () => SP.board.zoomBy(1.2));
    $('zoom-pct').addEventListener('click', () => SP.board.setZoom(1));
    $('zoom-fit').addEventListener('click', () => SP.board.zoomFit());
    const syncHist = () => { $('btn-undo').disabled = !SP.history.canUndo(); $('btn-redo').disabled = !SP.history.canRedo(); };
    document.addEventListener('sp:history', syncHist);
    syncHist();

    SP.board.init();
    if (!SP.store.state.seeded && SP.store.state.notes.length === 0) seed();
    SP.board.setLocked(SP.store.state.locked, { silent: true });
    SP.background.refresh();
    renderBoards(); renderZoom();
    document.addEventListener('sp:boards', renderBoards);
    document.addEventListener('sp:zoom', renderZoom);

    checkImport();
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    setupDrop();
    requestAnimationFrame(() => document.body.classList.add('ready'));
    // Limpieza de imágenes que ya no usa ninguna nota (sin apuro)
    setTimeout(() => SP.media.gc(), 4000);
    if (SP.sync) SP.sync.init();

    // App instalable y sin conexión (solo si se sirve por http/https)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  SP.app = { openAddMenu, addOfType, ADD_ITEMS, showShortcuts, replaceState, renderBoards };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SP);
