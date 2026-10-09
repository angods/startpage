/* ==========================================================================
   Startpage · Wikipedia al azar
   Muestra un artículo aleatorio en el idioma elegido, con su imagen
   principal, y lo cambia solo cada 10 min, 30 min, 1 h, 6 h o 1 día.
   Usa la API oficial de Wikipedia (permite leer desde cualquier página,
   sin intermediarios ni clave).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const LANGS = {
    es: 'Español', en: 'English', pt: 'Português', fr: 'Français', de: 'Deutsch', it: 'Italiano',
    ca: 'Català', gl: 'Galego', eu: 'Euskara', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska',
    ru: 'Русский', uk: 'Українська', ja: '日本語', zh: '中文', ko: '한국어', ar: 'العربية',
    hi: 'हिन्दी', tr: 'Türkçe', he: 'עברית', simple: 'Simple English',
  };
  const RATES = [
    [10 * 60e3, 'Cada 10 minutos'], [30 * 60e3, 'Cada 30 minutos'], [60 * 60e3, 'Cada 1 hora'],
    [6 * 60 * 60e3, 'Cada 6 horas'], [24 * 60 * 60e3, 'Cada 1 día'], [0, 'Solo a mano'],
  ];
  const RTL = new Set(['ar', 'he']);

  /** Imagen en mejor calidad que la miniatura (Wikimedia genera el tamaño pedido) */
  function bigger(src, px = 800) {
    return /\/\d+px-/.test(src) ? src.replace(/\/(\d+)px-/, (m, n) => (+n < px ? `/${px}px-` : m)) : src;
  }

  async function fetchRandom(lang, needImage) {
    let last = null;
    // Muchos artículos no tienen imagen: si se pide imagen, se prueba unas veces
    for (let i = 0; i < (needImage ? 6 : 1); i++) {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 10000);
      try {
        const r = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`, { signal: c.signal, cache: 'no-store' });
        if (!r.ok) throw new Error('Wikipedia respondió ' + r.status);
        const j = await r.json();
        const url = j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page;
        last = {
          title: j.title || '',
          desc: j.description || '',
          extract: j.extract || '',
          image: j.thumbnail && j.thumbnail.source ? bigger(j.thumbnail.source) : '',
          url: /^https:\/\/[\w.-]+\.wikipedia\.org\//.test(url || '') ? url : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(j.title || '')}`,
          lang,
        };
        if (!needImage || last.image) return last;
      } finally { clearTimeout(t); }
    }
    return last;
  }

  function untilText(ms) {
    if (ms <= 0) return 'enseguida';
    const m = Math.ceil(ms / 60000);
    if (m < 60) return `en ${m} min`;
    const hr = Math.round(m / 60);
    return hr < 24 ? `en ${hr} h` : 'mañana';
  }

  SP.board.register('wikipedia', {
    label: 'Wikipedia',
    icon: 'book',
    size: [320, 440],
    min: [200, 200],
    color: 'glass',
    create: (o) => ({
      lang: o.lang || (navigator.language || 'es').slice(0, 2).toLowerCase().replace(/^(?!(es|en|pt|fr|de|it)$).*/, 'es'),
      every: o.every != null ? o.every : 60 * 60e3,
      onlyImg: true,
      page: null, at: 0, back: [],
    }),
    text: (n) => (n.data.page ? n.data.page.title + ' ' + n.data.page.extract : ''),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('wiki-body');
      let loading = false;

      const next = async (manual) => {
        if (loading) return;
        loading = true; body.classList.add('loading');
        try {
          const p = await fetchRandom(d.lang, d.onlyImg);
          if (p) {
            if (d.page) d.back = [d.page, ...(d.back || [])].slice(0, 15);
            d.page = p; d.at = Date.now(); d.error = null;
          }
        } catch (e) {
          d.error = e.name === 'AbortError' ? 'Wikipedia tardó demasiado en responder.' : 'No se pudo conectar con Wikipedia (¿sin conexión?).';
          if (!d.page) d.at = 0;
          if (manual) SP.ui.toast(d.error);
        }
        loading = false; body.classList.remove('loading');
        ctx.save(); draw();
      };

      const prev = () => {
        if (!d.back || !d.back.length) return;
        d.page = d.back.shift(); d.at = Date.now();
        ctx.save(); draw();
      };

      const foot = h('div', { class: 'wiki-foot' });
      const paintFoot = () => {
        const left = d.every ? d.at + d.every - Date.now() : null;
        foot.replaceChildren(
          h('button', { type: 'button', class: 'wiki-btn', title: 'Anterior', 'aria-label': 'Artículo anterior', html: SP.icon('back_arrow', 14), disabled: !(d.back && d.back.length), onclick: prev }),
          h('button', { type: 'button', class: 'wiki-btn', title: 'Otro al azar', 'aria-label': 'Otro artículo al azar', html: SP.icon('refresh', 14), onclick: () => next(true) }),
          h('span', { class: 'wiki-when', text: `${LANGS[d.lang] || d.lang} · ${d.every ? 'nuevo ' + untilText(left) : 'a mano'}` }),
          d.page ? h('a', { class: 'wiki-read', href: d.page.url, target: '_blank', rel: 'noopener', text: 'Leer' }) : null);
      };

      const draw = () => {
        const p = d.page;
        if (!p) {
          body.replaceChildren(h('div', { class: 'wiki-empty' },
            h('span', { class: 'wiki-logo', text: 'W' }),
            h('p', { text: d.error || 'Buscando un artículo…' }),
            d.error ? h('button', { type: 'button', class: 'btn small', text: 'Reintentar', onclick: () => next(true) }) : null),
          foot);
          paintFoot();
          return;
        }
        const img = p.image ? h('a', { class: 'wiki-img', href: p.url, target: '_blank', rel: 'noopener', tabindex: '-1' },
          h('img', { src: p.image, alt: p.title, loading: 'lazy', referrerpolicy: 'no-referrer', draggable: 'false' })) : null;
        if (img) img.firstChild.addEventListener('error', () => img.remove());
        body.replaceChildren(
          ...(img ? [img] : []),
          h('div', { class: 'wiki-text', dir: RTL.has(p.lang) ? 'rtl' : null, lang: p.lang },
            h('a', { class: 'wiki-title', href: p.url, target: '_blank', rel: 'noopener', text: p.title }),
            p.desc ? h('div', { class: 'wiki-desc', text: p.desc }) : null,
            h('p', { class: 'wiki-extract', text: p.extract })),
          foot);
        body.classList.toggle('no-img', !img);
        paintFoot();
      };

      draw();
      const due = () => !d.page || (d.every && Date.now() - d.at >= d.every);
      if (due()) next(false);
      // Revisa cada 30 s si ya toca otro (solo con la pestaña visible)
      const t = setInterval(() => {
        if (document.hidden) return;
        if (due()) next(false); else paintFoot();
      }, 30000);
      const onVis = () => { if (!document.hidden && due()) next(false); };
      document.addEventListener('visibilitychange', onVis);
      ctx.nextWiki = () => next(true);
      return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
    },
    menu(n, ctx) {
      const d = n.data;
      return [
        { icon: 'refresh', label: 'Otro artículo ahora', fn: () => ctx.nextWiki && ctx.nextWiki() },
        {
          icon: 'globe', label: 'Idioma y frecuencia…',
          fn: async () => {
            const r = await SP.ui.modal({
              title: 'Wikipedia al azar',
              fields: [
                { name: 'lang', label: 'Idioma', type: 'select', value: d.lang, options: Object.entries(LANGS).map(([value, label]) => ({ value, label })) },
                { name: 'every', label: 'Un artículo nuevo', type: 'select', value: String(d.every), options: RATES.map(([value, label]) => ({ value: String(value), label })) },
                { name: 'img', label: 'Artículos', type: 'select', value: d.onlyImg ? '1' : '0', options: [{ value: '1', label: 'Solo los que tienen imagen' }, { value: '0', label: 'Cualquiera' }] },
              ],
            });
            if (!r) return;
            const langChanged = r.lang !== d.lang;
            d.lang = r.lang; d.every = +r.every; d.onlyImg = r.img === '1';
            if (langChanged) { d.page = null; d.at = 0; d.back = []; }
            ctx.save(); ctx.rerender();
          },
        },
      ];
    },
  });
})(window.SP);
