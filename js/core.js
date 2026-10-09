/* ==========================================================================
   Startpage · núcleo
   Utilidades, íconos, estado persistente (localStorage) y almacenamiento de
   videos (IndexedDB). Todo cuelga del espacio de nombres global `SP`.
   ========================================================================== */
window.SP = window.SP || {};

(function (SP) {
  'use strict';

  /* ---------- Utilidades ---------- */
  const util = {
    uid() {
      return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
    },
    clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },
    debounce(fn, ms) {
      let t;
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    },
    /** Crea un elemento: h('div', {class:'x', onclick: fn}, hijo1, 'texto') */
    h(tag, attrs, ...children) {
      const el = document.createElement(tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v == null || v === false) continue;
          if (k === 'class') el.className = v;
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else if (k === 'html') el.innerHTML = v;
          else if (k === 'text') el.textContent = v;
          else if (k === 'dataset') Object.assign(el.dataset, v);
          else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
          else if (k === 'value') el.value = v;
          else if (v === true) el.setAttribute(k, '');
          else el.setAttribute(k, v);
        }
      }
      for (const c of children.flat(Infinity)) {
        if (c == null || c === false) continue;
        el.append(c.nodeType ? c : document.createTextNode(String(c)));
      }
      return el;
    },
    normalizeUrl(u) {
      u = (u || '').trim();
      if (!u) return '';
      if (/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])(:\d+)?(\/|$)/i.test(u)) return 'http://' + u;
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u) && !/^(mailto|tel|data|about|file):/i.test(u)) u = 'https://' + u;
      return u;
    },
    hostOf(u) {
      try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    },
    hexToRgb(hex) {
      let h = String(hex || '').replace('#', '');
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      const n = parseInt(h, 16);
      if (Number.isNaN(n) || h.length !== 6) return { r: 128, g: 128, b: 128 };
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    },
    luminance(hex) {
      const { r, g, b } = util.hexToRgb(hex);
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    },
    /** Color de texto legible sobre un fondo dado */
    inkFor(hex) {
      const L = util.luminance(hex);
      const contrastBlack = (L + 0.05) / 0.05;
      const contrastWhite = 1.05 / (L + 0.05);
      return contrastBlack >= contrastWhite ? '#1f1c26' : '#fbfaff';
    },
    deepMerge(base, over) {
      if (Array.isArray(over) || typeof over !== 'object' || over === null) return over === undefined ? base : over;
      const out = Array.isArray(base) ? [] : { ...base };
      for (const k of Object.keys(over)) {
        const b = base ? base[k] : undefined;
        out[k] = b && typeof b === 'object' && !Array.isArray(b) ? util.deepMerge(b, over[k]) : over[k];
      }
      return out;
    },
    fmtNumber(n, max = 2) {
      return new Intl.NumberFormat('es', { maximumFractionDigits: max }).format(n);
    },
  };

  /* ---------- Íconos (trazos estilo línea, 24×24) ---------- */
  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7z"/>',
    sliders: '<path d="M4 20v-6M4 10V4M12 20v-8M12 8V4M20 20v-4M20 12V4M2 14h4M10 8h4M18 16h4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    dots: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
    note: '<path d="M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 20v-4a1 1 0 0 1 1-1h4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M3 14.5h18M9 9.5V20M15 9.5V20"/>',
    timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.2 1.6M9.5 2.5h5M12 2.5V6"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
    reset: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
    skip: '<path d="M5 5l10 7-10 7z" fill="currentColor"/><path d="M19 5v14"/>',
    video: '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    upload: '<path d="M12 15.5V4M7 8.5 12 3.5l5 5M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
    locate: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22"/>',
    refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1l2.6 2.6"/><path d="M20.5 3.5v5h-5"/>',
    check: '<path d="M4.5 12.5l4.5 4.5 10.5-11"/>',
    list: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="M4 6.5l1 1 2-2M4 12l1 1 2-2M4 17.5l1 1 2-2"/>',
    front: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 4.5H6.5a2 2 0 0 0-2 2V16"/>',
    back: '<rect x="4" y="4" width="12" height="12" rx="2.5" stroke-dasharray="3 2.4"/><rect x="8" y="8" width="12" height="12" rx="2.5"/>',
    copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V5.5a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M4 6.5h16M9.5 6.5V4.5h5v2M6 6.5l1 13a1.5 1.5 0 0 0 1.5 1.4h7A1.5 1.5 0 0 0 17 19.5l1-13"/>',
    pen: '<path d="M3.5 20.5c3-1 4.5-3 7-3s3 2 5.5 2 3.5-1.5 4.5-2.5"/><path d="M14 4.5l3.5 3.5-8 8H6v-3.5z"/>',
    sigma: '<path d="M17.5 5.5V4h-12l7 8-7 8h12v-1.5"/>',
    drop: '<path d="M12 3s-6.5 6.6-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 9.6 12 3 12 3z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    image: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-9 8.5"/>',
    download: '<path d="M12 4v11.5M7 10.5l5 5 5-5M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M8.5 6.5h7v3h-7z"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17h.01M12 17h.01M15.5 17h.01" stroke-width="2.6"/>',
    font: '<path d="M4 19.5 9.5 5h1l5.5 14.5M6.3 14h7.4"/><path d="M17 11.5c.6-.7 1.4-1 2.3-1 1.5 0 2.2.9 2.2 2.3v6.7M21.5 15.5c-3 0-4.8.6-4.8 2.2 0 1 .8 1.8 2 1.8 1.6 0 2.8-1.2 2.8-3"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.3 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.3-3.5-8.5S9.6 5.9 12 3.5z"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    back_arrow: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    backspace: '<path d="M9 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3 12z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  };
  SP.icon = function (name, size = 18) {
    return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  };

  /* ---------- Estado persistente ---------- */
  const KEY = 'startpage:v1';

  function defaults() {
    const dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    return {
      v: 1,
      theme: dark ? 'dark' : 'light',
      palette: 'aurora',
      accent: null,           // color de acento personalizado (null = el de la paleta)
      locked: false,
      snap: true,             // ajustar a cuadrícula al mover
      gloss: 45,              // brillo tipo vidrio (0 mate – 100 liquid glass)
      opacity: 96,            // opacidad de las notas de color (60–100)
      lite: false,            // modo ligero: sin desenfoques ni animaciones
      fonts: { ui: 'nunito', display: 'fraunces' },
      sound: { volume: 70, muted: false },
      bg: {
        mode: 'default',      // 'default' (aurora animada) | 'video'
        sameForBoth: true,    // mismo video para claro y oscuro
        overlay: 30,          // intensidad del velo de tema (0-80)
        blur: 0,              // desenfoque del video en px
        videos: { dark: null, light: null }, // {src:'file'|'url', kind, url, name}
      },
      notes: [],
      seeded: false,
    };
  }

  const store = {
    key: KEY,
    state: null,
    load() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
      const d = defaults();
      this.state = saved && saved.v === 1 ? util.deepMerge(d, saved) : d;
      if (!Array.isArray(this.state.notes)) this.state.notes = [];
      return this.state;
    },
    saveNow() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[startpage] no se pudo guardar', e);
        if (SP.ui) SP.ui.toast('No se pudo guardar (almacenamiento lleno o bloqueado)');
      }
    },
    replace(newState) {
      this.state = util.deepMerge(defaults(), newState);
      this.saveNow();
    },
    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* nada */ }
      this.state = defaults();
    },
    defaults,
  };
  store.save = util.debounce(() => store.saveNow(), 250);
  window.addEventListener('beforeunload', () => store.saveNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) store.saveNow(); });

  /* ---------- IndexedDB (videos de fondo) ---------- */
  const idb = {
    _db: null,
    open() {
      if (!this._db) {
        this._db = new Promise((resolve, reject) => {
          const req = indexedDB.open('startpage', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('media');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      return this._db;
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('media', mode);
        const req = fn(tx.objectStore('media'));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    },
    get(k) { return this.run('readonly', (s) => s.get(k)); },
    put(k, v) { return this.run('readwrite', (s) => s.put(v, k)); },
    del(k) { return this.run('readwrite', (s) => s.delete(k)); },
    clear() { return this.run('readwrite', (s) => s.clear()); },
  };

  SP.util = util;
  SP.store = store;
  SP.idb = idb;
})(window.SP);
