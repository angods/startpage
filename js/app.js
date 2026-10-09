/* ==========================================================================
   Startpage · Arranque
   Carga el estado, arma la barra de herramientas, crea el tablero inicial
   la primera vez y conecta atajos, pegado de enlaces y arrastre de videos.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  /* ---------- Menú "Agregar" ---------- */
  const ADD_ITEMS = [
    { type: 'text', icon: 'note', label: 'Nota', desc: 'Texto libre' },
    { type: 'link', icon: 'link', label: 'Acceso directo', desc: 'Una página con su ícono' },
    { type: 'weather', icon: 'cloud', label: 'Clima', desc: 'Elegí tu ciudad' },
    { type: 'sheet', icon: 'table', label: 'Planilla', desc: 'Tabla con sumas y fórmulas' },
    { type: 'pomodoro', icon: 'timer', label: 'Pomodoro', desc: 'Foco y descansos' },
    { type: 'youtube', icon: 'video', label: 'Video de YouTube', desc: 'Pegá un enlace' },
    { type: 'todo', icon: 'list', label: 'Tareas', desc: 'Lista con checks' },
    { type: 'clock', icon: 'clock', label: 'Reloj', desc: 'Hora y fecha' },
    { type: 'calc', icon: 'calc', label: 'Calculadora', desc: '6 skins para elegir' },
    { type: 'search', icon: 'search', label: 'Buscador', desc: 'Google, DuckDuckGo…' },
  ];

  async function addOfType(type) {
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
    SP.ui.menu(btn, h('div', { class: 'add-grid' }, ADD_ITEMS.map((it) => h('button', {
      type: 'button', class: 'add-item',
      onclick: () => { SP.ui.closeMenu(); addOfType(it.type); },
    },
    h('span', { class: 'add-ico', html: SP.icon(it.icon, 18) }),
    h('span', { class: 'add-text' }, h('strong', { text: it.label }), h('small', { text: it.desc }))))));
  }

  /* ---------- Tablero inicial ---------- */
  function seed() {
    const W = Math.max(window.innerWidth, 1200);
    const ox = Math.max(0, Math.round((W - 1400) / 2 / 10) * 10);
    const at = (x, y, w, hh) => ({ x: x + ox, y, w, h: hh });
    const B = SP.board;

    B.add('clock', {}, at(40, 80, 280, 150));
    B.add('weather', {}, at(40, 250, 280, 250));
    B.add('search', {}, at(340, 80, 436, 92));

    const links = [
      ['https://www.youtube.com', 'YouTube'], ['https://mail.google.com', 'Gmail'],
      ['https://github.com', 'GitHub'], ['https://www.reddit.com', 'Reddit'],
      ['https://es.wikipedia.org', 'Wikipedia'], ['https://open.spotify.com', 'Spotify'],
      ['https://drive.google.com', 'Drive'], ['https://www.pinterest.com', 'Pinterest'],
    ];
    links.forEach(([url, title], i) => {
      B.add('link', { url, title }, at(340 + (i % 4) * 112, 192 + Math.floor(i / 4) * 112, 100, 100));
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
    }, at(340, 420, 436, 270));

    B.add('text', {
      text: '¡Hola! Este es tu tablero ✨\n\n' +
        '• Arrastrá las notas desde su barra.\n' +
        '• Esquina inferior derecha: tamaño.\n' +
        '• ⋯ para color, orden y más.\n' +
        '• El candado fija todo en su lugar.\n' +
        '• Ctrl+V con un link crea un acceso.\n' +
        '• Soltá un .mp4 para usarlo de fondo.\n\n' +
        'Todo se guarda solo.',
    }, at(800, 80, 290, 300));

    B.add('todo', { items: ['Elegir mi ciudad en el clima', 'Subir un video de fondo', 'Probar el pomodoro'] }, at(800, 400, 290, 230));
    B.add('pomodoro', {}, at(1110, 80, 260, 300));

    SP.store.state.seeded = true;
    SP.store.save();
  }

  /* ---------- Pegar enlaces sobre el tablero ---------- */
  function isEditable(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  function onPaste(e) {
    if (isEditable(e.target) || SP.store.state.locked) return;
    const text = (e.clipboardData && e.clipboardData.getData('text')) || '';
    const t = text.trim();
    if (!t || /\s/.test(t)) return;
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
    }
  }

  /* ---------- Soltar un video para usarlo de fondo ---------- */
  function setupDrop() {
    let depth = 0;
    const hint = h('div', { id: 'drop-hint', class: 'glass' }, h('span', { html: SP.icon('video', 22) }), 'Soltá el video para usarlo de fondo');
    document.body.append(hint);
    const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    document.addEventListener('dragenter', (e) => { if (hasFiles(e)) { depth++; hint.classList.add('show'); } });
    document.addEventListener('dragleave', (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; hint.classList.remove('show'); } });
    document.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    document.addEventListener('drop', async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0; hint.classList.remove('show');
      const f = [...e.dataTransfer.files].find((x) => /^video\//.test(x.type));
      if (!f) { SP.ui.toast('Soltá un archivo de video (.mp4 / .webm)'); return; }
      SP.ui.toast('Guardando video…');
      await SP.background.setFile(SP.background.activeSlot(), f);
      if (SP.settings) SP.settings.render();
      SP.ui.toast('¡Listo! Video de fondo actualizado');
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
    SP.store.replace(data);
    SP.theme.apply(); SP.board.renderAll(); SP.board.setLocked(SP.store.state.locked, { silent: true }); SP.background.refresh();
    SP.ui.toast('¡Listo! Tus notas ya están acá');
  }

  /* ---------- Atajos ---------- */
  function onKey(e) {
    if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.querySelector('.modal-wrap')) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); openAddMenu(); }
    else if (k === 'l') { e.preventDefault(); SP.board.setLocked(!SP.store.state.locked); }
    else if (k === 't') { e.preventDefault(); SP.theme.toggle(); }
  }

  /* ---------- Inicio ---------- */
  function init() {
    SP.store.load();
    SP.theme.apply();

    const $ = (id) => document.getElementById(id);
    $('btn-add').innerHTML = SP.icon('plus', 18) + '<span>Agregar</span>';
    $('btn-settings').innerHTML = SP.icon('sliders', 18);
    $('btn-add').addEventListener('click', openAddMenu);
    $('btn-lock').addEventListener('click', () => SP.board.setLocked(!SP.store.state.locked));
    $('btn-theme').addEventListener('click', () => SP.theme.toggle());
    $('btn-settings').addEventListener('click', () => SP.settings.open());

    SP.board.init();
    if (!SP.store.state.seeded && SP.store.state.notes.length === 0) seed();
    SP.board.setLocked(SP.store.state.locked, { silent: true });
    SP.background.refresh();

    checkImport();
    document.addEventListener('paste', onPaste);
    document.addEventListener('keydown', onKey);
    setupDrop();
    requestAnimationFrame(() => document.body.classList.add('ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SP);
