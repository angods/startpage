/* ==========================================================================
   Startpage · Noticias (RSS / Atom)
   Muchos sitios no dejan leer su feed desde otra página (CORS), así que si
   la lectura directa falla se usa un intermediario público (allorigins).
   Si pegás la dirección de un sitio, busca su feed solo.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const PROXY = 'https://api.allorigins.win/raw?url=';
  const SUGGEST = [
    ['Hacker News', 'https://hnrss.org/frontpage'],
    ['BBC Mundo', 'https://feeds.bbci.co.uk/mundo/rss.xml'],
    ['Xataka', 'https://www.xataka.com/feedburner.xml'],
    ['The Verge', 'https://www.theverge.com/rss/index.xml'],
  ];

  async function getText(url) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.text();
    } catch (e) { /* CORS o red: probar con el intermediario */ }
    const r = await fetch(PROXY + encodeURIComponent(url));
    if (!r.ok) throw new Error('No se pudo leer (' + r.status + ')');
    return r.text();
  }

  function parseFeed(text, base) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror')) {
      // ¿Es una página? Buscar <link rel="alternate" type="application/rss+xml">
      const html = new DOMParser().parseFromString(text, 'text/html');
      const l = html.querySelector('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]');
      if (l) return { discover: new URL(l.getAttribute('href'), base).href };
      throw new Error('No parece un feed RSS');
    }
    const title = (doc.querySelector('channel > title, feed > title') || {}).textContent || '';
    const txt = (el, sel) => { const x = el.querySelector(sel); return x ? x.textContent.trim() : ''; };
    const items = [...doc.querySelectorAll('item, entry')].slice(0, 30).map((it) => {
      let link = txt(it, 'link');
      const atom = it.querySelector('link[href]');
      if (!link && atom) link = atom.getAttribute('href');
      const date = txt(it, 'pubDate') || txt(it, 'updated') || txt(it, 'published') || txt(it, 'date');
      // Solo enlaces http(s): un feed podría traer "javascript:…"
      try { link = new URL(link, base).href; } catch (e) { link = ''; }
      if (!/^https?:/i.test(link)) link = '';
      return { title: txt(it, 'title') || '(sin título)', link, date: date ? new Date(date).getTime() || 0 : 0 };
    });
    return { title: title.trim(), items };
  }

  async function loadFeed(url) {
    let text = await getText(url);
    let feed = parseFeed(text, url);
    if (feed.discover) { url = feed.discover; text = await getText(url); feed = parseFeed(text, url); }
    return { ...feed, url };
  }

  function ago(ts) {
    if (!ts) return '';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 60) return m <= 1 ? 'recién' : `hace ${m} min`;
    const hrs = Math.round(m / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  SP.board.register('rss', {
    label: 'Noticias',
    icon: 'rss',
    size: [320, 340],
    min: [200, 160],
    color: 'glass',
    create: (o) => ({ url: o.url || '', cache: null, seen: [] }),
    text: (n) => (n.data.cache ? n.data.cache.items.map((i) => i.title).join(' ') : ''),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('rss-body');

      const setup = (msg) => {
        const input = h('input', { class: 'todo-input', placeholder: 'Dirección del feed o del sitio', spellcheck: 'false', value: d.url || '' });
        const go = async (url) => {
          if (!url) return;
          body.replaceChildren(h('p', { class: 'rss-msg', text: 'Buscando…' }));
          try {
            const f = await loadFeed(SP.util.normalizeUrl(url));
            ctx.history('Elegir feed', () => { d.url = f.url; d.cache = { at: Date.now(), items: f.items }; });
            if (f.title) ctx.setTitle(f.title.slice(0, 40));
            ctx.save(); draw();
          } catch (e) { setup(e.message); }
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(input.value.trim()); });
        body.replaceChildren(
          h('p', { class: 'rss-msg', text: msg || 'Pegá un feed RSS o la dirección de un sitio:' }),
          input,
          h('div', { class: 'rss-suggest' }, SUGGEST.map(([name, url]) => h('button', { type: 'button', class: 'chip', text: name, onclick: () => go(url) }))));
      };

      const draw = () => {
        if (!d.url) { setup(); return; }
        const items = (d.cache && d.cache.items) || [];
        const seen = new Set(d.seen || []);
        body.replaceChildren(h('ul', { class: 'rss-list' }, items.length ? items.map((it) => h('li', { class: 'rss-item' + (seen.has(it.link) ? ' seen' : '') },
          h('a', {
            href: it.link || null, target: '_blank', rel: 'noopener', text: it.title,
            onclick: () => { d.seen = [...(d.seen || []), it.link].slice(-200); ctx.save(); setTimeout(draw, 50); },
          }),
          h('small', { text: ago(it.date) }))) : h('li', { class: 'rss-msg', text: 'Cargando…' })));
      };

      const refresh = async (force) => {
        if (!d.url) return;
        if (!force && d.cache && Date.now() - d.cache.at < 30 * 60000) return;
        try {
          const f = await loadFeed(d.url);
          d.cache = { at: Date.now(), items: f.items };
          ctx.save(); draw();
        } catch (e) { if (!d.cache) setup('No se pudo leer: ' + e.message); }
      };
      ctx.refreshFeed = () => refresh(true);
      draw();
      refresh(false);
      const t = setInterval(() => refresh(false), 5 * 60000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      return [
        { icon: 'refresh', label: 'Actualizar', fn: () => ctx.refreshFeed && ctx.refreshFeed() },
        { icon: 'edit', label: 'Cambiar feed', fn: () => { n.data.url = ''; n.data.cache = null; ctx.save(); ctx.rerender(); } },
      ];
    },
  });

  SP.rss = { parseFeed, loadFeed };
})(window.SP);
