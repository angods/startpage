/* ==========================================================================
   Startpage · Fuentes
   Selección curada de fuentes gratuitas (Google Fonts + Fontshare + sistema).
   Solo se descargan las que usás; las vistas previas del selector bajan
   apenas las letras del nombre (parámetro &text= de Google Fonts).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  // [id, nombre, fuente, categoría, pesos (Google), recomendada]
  const RAW = [
    // Sans
    ['inter', 'Inter', 'google', 'sans', 'wght@400;500;600;700;800', 1],
    ['geist', 'Geist', 'google', 'sans', 'wght@400;500;600;700;800', 1],
    ['plus-jakarta', 'Plus Jakarta Sans', 'google', 'sans', 'wght@400;500;600;700;800', 1],
    ['dm-sans', 'DM Sans', 'google', 'sans', 'wght@400;500;600;700;800'],
    ['manrope', 'Manrope', 'google', 'sans', 'wght@400;500;600;700;800'],
    ['outfit', 'Outfit', 'google', 'sans', 'wght@400;500;600;700;800'],
    ['figtree', 'Figtree', 'google', 'sans', 'wght@400;500;600;700;800'],
    ['onest', 'Onest', 'google', 'sans', 'wght@400;500;600;700;800'],
    ['space-grotesk', 'Space Grotesk', 'google', 'sans', 'wght@400;500;600;700'],
    ['instrument-sans', 'Instrument Sans', 'google', 'sans', 'wght@400;500;600;700'],
    ['satoshi', 'Satoshi', 'fontshare', 'sans', 'satoshi@400,500,700,900', 1],
    ['general-sans', 'General Sans', 'fontshare', 'sans', 'general-sans@400,500,600,700'],
    ['switzer', 'Switzer', 'fontshare', 'sans', 'switzer@400,500,600,700,800'],
    // Redondeadas
    ['nunito', 'Nunito', 'google', 'round', 'wght@400;600;700;800', 1],
    ['quicksand', 'Quicksand', 'google', 'round', 'wght@400;500;600;700'],
    ['fredoka', 'Fredoka', 'google', 'round', 'wght@400;500;600;700', 1],
    ['comfortaa', 'Comfortaa', 'google', 'round', 'wght@400;500;600;700'],
    ['baloo', 'Baloo 2', 'google', 'round', 'wght@400;500;600;700;800'],
    ['mplus-rounded', 'M PLUS Rounded 1c', 'google', 'round', 'wght@400;500;700;800'],
    ['varela-round', 'Varela Round', 'google', 'round', ''],
    // Serif
    ['fraunces', 'Fraunces', 'google', 'serif', 'wght@400;500;600;700', 1],
    ['instrument-serif', 'Instrument Serif', 'google', 'serif', '', 1],
    ['playfair', 'Playfair Display', 'google', 'serif', 'wght@400;500;600;700'],
    ['lora', 'Lora', 'google', 'serif', 'wght@400;500;600;700'],
    ['newsreader', 'Newsreader', 'google', 'serif', 'wght@400;500;600;700'],
    ['eb-garamond', 'EB Garamond', 'google', 'serif', 'wght@400;500;600;700'],
    ['dm-serif', 'DM Serif Display', 'google', 'serif', ''],
    ['young-serif', 'Young Serif', 'google', 'serif', ''],
    ['gambetta', 'Gambetta', 'fontshare', 'serif', 'gambetta@400,500,600,700'],
    // Display
    ['clash-display', 'Clash Display', 'fontshare', 'display', 'clash-display@400,500,600,700', 1],
    ['cabinet-grotesk', 'Cabinet Grotesk', 'fontshare', 'display', 'cabinet-grotesk@400,500,700,800'],
    ['bricolage', 'Bricolage Grotesque', 'google', 'display', 'wght@400;500;600;700;800', 1],
    ['syne', 'Syne', 'google', 'display', 'wght@400;500;600;700;800'],
    ['unbounded', 'Unbounded', 'google', 'display', 'wght@400;500;600;700'],
    ['bebas', 'Bebas Neue', 'google', 'display', ''],
    ['abril', 'Abril Fatface', 'google', 'display', ''],
    ['righteous', 'Righteous', 'google', 'display', ''],
    ['pacifico', 'Pacifico', 'google', 'display', ''],
    // Manuscritas
    ['caveat', 'Caveat', 'google', 'hand', 'wght@400;500;600;700', 1],
    ['patrick-hand', 'Patrick Hand', 'google', 'hand', '', 1],
    ['kalam', 'Kalam', 'google', 'hand', 'wght@400;700'],
    ['gochi-hand', 'Gochi Hand', 'google', 'hand', ''],
    ['indie-flower', 'Indie Flower', 'google', 'hand', ''],
    ['shadows', 'Shadows Into Light', 'google', 'hand', ''],
    ['gaegu', 'Gaegu', 'google', 'hand', 'wght@400;700'],
    ['reenie', 'Reenie Beanie', 'google', 'hand', ''],
    // Mono
    ['jetbrains', 'JetBrains Mono', 'google', 'mono', 'wght@400;500;600;700;800', 1],
    ['ibm-plex-mono', 'IBM Plex Mono', 'google', 'mono', 'wght@400;500;600;700'],
    ['fira-code', 'Fira Code', 'google', 'mono', 'wght@400;500;600;700'],
    ['space-mono', 'Space Mono', 'google', 'mono', 'wght@400;700'],
    ['dm-mono', 'DM Mono', 'google', 'mono', 'wght@400;500'],
    // Sistema (no descargan nada)
    ['system', 'Sistema (Segoe / SF)', 'system', 'system', ''],
    ['georgia', 'Georgia', 'system', 'system', ''],
  ];

  const CATS = {
    sans: { label: 'Sans', fallback: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
    round: { label: 'Redondeadas', fallback: 'ui-rounded, system-ui, sans-serif' },
    serif: { label: 'Serif', fallback: 'Georgia, "Times New Roman", serif' },
    display: { label: 'Display', fallback: 'system-ui, sans-serif' },
    hand: { label: 'Manuscritas', fallback: '"Segoe Print", "Comic Sans MS", cursive' },
    mono: { label: 'Monoespaciadas', fallback: 'ui-monospace, Consolas, monospace' },
    system: { label: 'Del sistema', fallback: 'sans-serif' },
  };

  const FONTS = {};
  RAW.forEach(([id, name, src, cat, spec, star]) => { FONTS[id] = { id, name, src, cat, spec, star: !!star }; });

  const loaded = new Set();
  const previewed = new Set();

  function addCss(href) {
    document.head.append(h('link', { rel: 'stylesheet', href }));
  }
  function googleFamily(name) { return name.replace(/ /g, '+'); }

  /** Descarga una fuente completa (solo una vez) */
  function load(id) {
    const f = FONTS[id];
    if (!f || f.src === 'system' || loaded.has(id)) return;
    loaded.add(id);
    if (f.src === 'google') {
      addCss(`https://fonts.googleapis.com/css2?family=${googleFamily(f.name)}${f.spec ? ':' + f.spec : ''}&display=swap`);
    } else if (f.src === 'fontshare') {
      addCss(`https://api.fontshare.com/v2/css?f[]=${f.spec}&display=swap`);
    }
  }

  /** Descarga solo las letras del nombre para la vista previa */
  function preview(id) {
    const f = FONTS[id];
    if (!f || f.src === 'system' || loaded.has(id) || previewed.has(id)) return;
    previewed.add(id);
    if (f.src === 'google') {
      addCss(`https://fonts.googleapis.com/css2?family=${googleFamily(f.name)}&text=${encodeURIComponent(f.name + 'Aa0123456789')}&display=swap`);
    } else load(id);
  }

  function stack(id) {
    const f = FONTS[id];
    if (!f) return null;
    if (id === 'system') return 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    if (id === 'georgia') return 'Georgia, "Times New Roman", serif';
    return `"${f.name}", ${CATS[f.cat].fallback}`;
  }

  function name(id) { return FONTS[id] ? FONTS[id].name : 'Predeterminada'; }

  /**
   * Abre el selector de fuentes junto a `anchor`.
   * opts.inherit: muestra la opción "Igual que el tablero" (valor null).
   */
  function pick(anchor, current, onPick, opts = {}) {
    const search = h('input', { class: 'font-search', placeholder: 'Buscar fuente…', spellcheck: 'false' });
    const list = h('div', { class: 'font-list' });
    const row = (id, label, family, extra) => h('button', {
      type: 'button',
      class: 'font-row' + (current === id ? ' active' : ''),
      dataset: { name: (label || '').toLowerCase() },
      onclick: () => { SP.ui.closeMenu(); if (id) load(id); onPick(id); },
    }, h('span', { class: 'font-name', style: family ? { fontFamily: family } : null, text: label }), extra || null);

    const groups = [];
    if (opts.inherit) groups.push(row(null, 'Igual que el tablero', null, h('small', { text: 'Predeterminada' })));
    const favs = Object.values(FONTS).filter((f) => f.star);
    groups.push(h('div', { class: 'font-cat', text: '★ Las mejores' }));
    favs.forEach((f) => groups.push(row(f.id, f.name, stack(f.id), h('small', { text: CATS[f.cat].label }))));
    for (const [cat, c] of Object.entries(CATS)) {
      groups.push(h('div', { class: 'font-cat', dataset: { cat }, text: c.label }));
      Object.values(FONTS).filter((f) => f.cat === cat).forEach((f) => {
        groups.push(row(f.id, f.name, stack(f.id), f.src === 'fontshare' ? h('small', { text: 'Fontshare' }) : null));
      });
    }
    list.append(...groups);

    // Vistas previas perezosas: solo las filas visibles
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const btn = e.target;
        const f = Object.values(FONTS).find((x) => x.name.toLowerCase() === btn.dataset.name);
        if (f) preview(f.id);
        io.unobserve(btn);
      }
    }, { root: list, rootMargin: '120px' });
    list.querySelectorAll('.font-row').forEach((b) => io.observe(b));

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      list.querySelectorAll('.font-row').forEach((b) => { b.hidden = q && !b.dataset.name.includes(q); });
      list.querySelectorAll('.font-cat').forEach((c) => { c.hidden = !!q; });
    });

    const m = SP.ui.menu(anchor, h('div', { class: 'font-picker' }, search, list));
    const origClose = m.close;
    m.close = () => { io.disconnect(); origClose(); };
    setTimeout(() => {
      search.focus();
      const act = list.querySelector('.font-row.active');
      if (act) act.scrollIntoView({ block: 'center' });
    }, 30);
  }

  SP.fonts = { FONTS, CATS, load, preview, stack, name, pick };
})(window.SP);
