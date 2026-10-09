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
          else if (k === 'style' && typeof v === 'object') {
            for (const [sk, sv] of Object.entries(v)) {
              if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
            }
          }
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
    escapeHtml(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    /** Quita tildes y pasa a minúsculas (para buscar) */
    fold(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); },
    /** Búsqueda difusa simple: puntaje > 0 si todas las letras de q aparecen en orden */
    fuzzy(q, text) {
      q = util.fold(q); text = util.fold(text);
      if (!q) return 1;
      const at = text.indexOf(q);
      if (at >= 0) return 100 - Math.min(at, 50) + (at === 0 ? 50 : 0);
      let i = 0; let score = 0; let prev = -2;
      for (let j = 0; j < text.length && i < q.length; j++) {
        if (text[j] === q[i]) { score += prev === j - 1 ? 3 : 1; prev = j; i++; }
      }
      return i === q.length ? score : 0;
    },
    /** Lee un archivo/blob como data URL */
    readAsDataURL(blob) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
    },
    async dataURLToBlob(url) { return (await fetch(url)).blob(); },
    reducedMotion() {
      return document.documentElement.classList.contains('lite') ||
        (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8v6M8 11h6"/>',
    zoomout: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M8 11h6"/>',
    fit: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
    folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    rss: '<path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle cx="6" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 5 9 5 9 8.5s-9 3.5-9 8.5M16.5 3.5c0 5-9 5-9 8.5s9 3.5 9 8.5"/>',
    flame: '<path d="M12 21c-3.6 0-6.5-2.6-6.5-6.2 0-3.6 3-5.6 3.8-9.3 2 1.3 3 3.3 3 5.3 1-.7 1.7-1.8 2-3 1.6 1.6 4.2 3.8 4.2 7C18.5 18.4 15.6 21 12 21z"/>',
    dollar: '<path d="M12 3v18M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4.3 1.3-4.3 3.2 0 4.6 9 2.4 9 7 0 2-1.9 3.3-4.7 3.3-2.2 0-3.9-.8-4.7-2.3"/>',
    swap: '<path d="M7 4 3.5 7.5 7 11M3.5 7.5h13M17 13l3.5 3.5L17 20M20.5 16.5h-13"/>',
    markdown: '<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M6 15V9l2.5 3L11 9v6M15.5 9v6M13.5 13l2 2 2-2"/>',
    brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2 20 2 20s4 .5 5.5-1 2-2.5 1.5-3.5"/>',
    music: '<path d="M9 17.5V5.5l11-2v12"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="15.5" r="2.5"/>',
    ascii: '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M6.5 9l3 3-3 3M11.5 15.5h6"/>',
    command: '<path d="M9 6v12M15 6v12M6 9h12M6 15h12"/><path d="M9 6a3 3 0 1 0-3 3M15 6a3 3 0 1 1 3 3M9 18a3 3 0 1 1-3-3M15 18a3 3 0 1 0 3-3"/>',
    alignL: '<path d="M4 3.5v17M8 7h10v4H8zM8 13h7v4H8z"/>',
    alignCX: '<path d="M12 3.5v17M6 7h12v4H6zM8 13h8v4H8z"/>',
    alignR: '<path d="M20 3.5v17M6 7h10v4H6zM9 13h7v4H9z"/>',
    alignT: '<path d="M3.5 4h17M7 8v10h4V8zM13 8v7h4V8z"/>',
    alignCY: '<path d="M3.5 12h17M7 6v12h4V6zM13 8v8h4V8z"/>',
    alignB: '<path d="M3.5 20h17M7 6v10h4V6zM13 9v7h4V9z"/>',
    distH: '<path d="M4 4v16M20 4v16M9.5 8h5v8h-5z"/>',
    distV: '<path d="M4 4h16M4 20h16M8 9.5h8v5H8z"/>',
    layout: '<rect x="3.5" y="3.5" width="7" height="9" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.5"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.5"/><rect x="3.5" y="15.5" width="7" height="5" rx="1.5"/>',
    collapse: '<path d="M6 9l6 6 6-6"/>',
    pinned: '<path d="M9 4h6l-1 6 3 3v1.5H7V13l3-3z"/><path d="M12 14.5V20"/>',
    cloudsync: '<path d="M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.75 4.75 0 0 0 7 18.5z"/><path d="M10 13.5l2-2 2 2M12 11.5v5"/>',
    keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" stroke-width="2.2"/>',
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
      guides: true,           // guías de alineación con otras notas
      boards: [{ id: 'main', name: 'Principal', zoom: 1 }],
      board: 'main',          // tablero visible
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

  /** Completa datos de versiones anteriores (tableros, etc.) */
  function migrate(st) {
    if (!Array.isArray(st.notes)) st.notes = [];
    if (!Array.isArray(st.boards) || !st.boards.length) st.boards = [{ id: 'main', name: 'Principal', zoom: 1 }];
    st.boards.forEach((b) => { if (!b.zoom) b.zoom = 1; });
    if (!st.boards.some((b) => b.id === st.board)) st.board = st.boards[0].id;
    const ids = new Set(st.boards.map((b) => b.id));
    st.notes.forEach((n) => { if (!ids.has(n.board)) n.board = st.boards[0].id; });
    return st;
  }

  const store = {
    key: KEY,
    state: null,
    load() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }
      const d = defaults();
      this.state = saved && saved.v === 1 ? util.deepMerge(d, saved) : d;
      migrate(this.state);
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
      migrate(this.state);
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
    keys() { return this.run('readonly', (s) => s.getAllKeys()); },
  };

  /* ---------- Archivos de las notas (imágenes, dibujos) ----------
     Se guardan en IndexedDB con clave "img:<id>" y nunca se pisan: cada cambio
     crea una clave nueva. Así "Deshacer" y "Duplicar" funcionan sin copiar
     nada, y al arrancar se borran las que ya no usa ninguna nota. */
  const media = {
    async put(blob) {
      const key = 'img:' + util.uid();
      await idb.put(key, blob);
      return key;
    },
    get(key) { return idb.get(key); },
    /** Claves de imágenes que usa una nota (cada widget las declara en data.media) */
    refs(n) { return (n.data && Array.isArray(n.data.media)) ? n.data.media : []; },
    async gc() {
      try {
        const used = new Set(store.state.notes.flatMap((n) => media.refs(n)));
        const keys = await idb.keys();
        await Promise.all(keys.filter((k) => typeof k === 'string' && k.startsWith('img:') && !used.has(k)).map((k) => idb.del(k)));
      } catch (e) { /* nada */ }
    },
  };

  SP.util = util;
  SP.store = store;
  SP.idb = idb;
  SP.media = media;
})(window.SP);
