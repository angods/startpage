/* ==========================================================================
   Startpage · Noticias (RSS / Atom)
   Por qué antes fallaba ("NetworkError when attempting to fetch resource"):
   la mayoría de los medios no deja que otra página lea su feed (CORS) y el
   único intermediario que se usaba (allorigins) se cae seguido. Ahora se
   prueban varios caminos en orden, cada uno con tiempo límite, y se recuerda
   cuál funcionó para cada sitio:
     directo → rss2json → allorigins → codetabs → corsproxy.io
   Una nota puede juntar varias fuentes (catálogo por temas en rss-sources.js).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const TIMEOUT = 9000;
  const VIA_KEY = 'startpage:rss-via';
  const enc = encodeURIComponent;

  /* ---------- Caminos para leer un feed ---------- */
  function withTimeout(ms) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    return { signal: c.signal, done: () => clearTimeout(t) };
  }

  async function fetchText(url) {
    const t = withTimeout(TIMEOUT);
    try {
      const r = await fetch(url, { signal: t.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      if (!/<(rss|feed|rdf:RDF|channel|html|\?xml)[\s>]/i.test(text.slice(0, 2000))) throw new Error('respuesta inesperada');
      return { text };
    } finally { t.done(); }
  }

  const STRATEGIES = [
    { id: 'direct', get: (u) => fetchText(u) },
    {
      // Devuelve JSON ya interpretado; muy confiable para feeds conocidos
      id: 'rss2json',
      get: async (u) => {
        const t = withTimeout(TIMEOUT);
        try {
          const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + enc(u), { signal: t.signal });
          const j = await r.json();
          if (j.status !== 'ok') throw new Error(j.message || 'rss2json');
          return { json: j };
        } finally { t.done(); }
      },
    },
    { id: 'allorigins', get: (u) => fetchText('https://api.allorigins.win/raw?url=' + enc(u)) },
    { id: 'codetabs', get: (u) => fetchText('https://api.codetabs.com/v1/proxy/?quest=' + enc(u)) },
    { id: 'corsproxy', get: (u) => fetchText('https://corsproxy.io/?url=' + enc(u)) },
  ];

  const viaMap = (() => { try { return JSON.parse(localStorage.getItem(VIA_KEY) || '{}'); } catch (e) { return {}; } })();
  const hostOf = (u) => { try { return new URL(u).host; } catch (e) { return u; } };
  function rememberVia(url, id) {
    viaMap[hostOf(url)] = id;
    try { localStorage.setItem(VIA_KEY, JSON.stringify(viaMap)); } catch (e) { /* nada */ }
  }

  /* ---------- Interpretar ---------- */
  const safeLink = (link, base) => {
    try { link = new URL(link, base).href; } catch (e) { return ''; }
    return /^https?:/i.test(link) ? link : ''; // nunca "javascript:…"
  };

  function parseFeed(text, base) {
    const doc = new DOMParser().parseFromString(text, 'text/xml');
    if (doc.querySelector('parsererror') || !doc.querySelector('rss, feed, RDF, channel')) {
      // ¿Es una página? Buscar <link rel="alternate" type="application/rss+xml">
      const html = new DOMParser().parseFromString(text, 'text/html');
      const l = html.querySelector('link[rel="alternate"][type*="rss"], link[rel="alternate"][type*="atom"]');
      if (l) return { discover: new URL(l.getAttribute('href'), base).href };
      throw new Error('no parece un feed RSS');
    }
    const title = (doc.querySelector('channel > title, feed > title') || {}).textContent || '';
    const txt = (el, sel) => { const x = el.querySelector(sel); return x ? x.textContent.trim() : ''; };
    const items = [...doc.querySelectorAll('item, entry')].slice(0, 30).map((it) => {
      let link = txt(it, 'link');
      const atom = it.querySelector('link[href]:not([rel]), link[rel="alternate"][href], link[href]');
      if (!link && atom) link = atom.getAttribute('href');
      const date = txt(it, 'pubDate') || txt(it, 'updated') || txt(it, 'published') || txt(it, 'date');
      return { title: txt(it, 'title') || '(sin título)', link: safeLink(link, base), date: date ? new Date(date).getTime() || 0 : 0 };
    });
    return { title: title.trim(), items };
  }

  function fromJson(j, base) {
    return {
      title: (j.feed && j.feed.title) || '',
      items: (j.items || []).slice(0, 30).map((it) => ({
        title: it.title || '(sin título)',
        link: safeLink(it.link, base),
        // rss2json devuelve "2026-10-09 12:00:00" en UTC
        date: it.pubDate ? new Date(it.pubDate.replace(' ', 'T') + 'Z').getTime() || 0 : 0,
      })),
    };
  }

  /** Lee un feed probando todos los caminos; recuerda el que anduvo */
  async function loadFeed(url, depth = 0) {
    const first = viaMap[hostOf(url)];
    const order = [...STRATEGIES].sort((a, b) => (b.id === first) - (a.id === first));
    const errors = [];
    for (const s of order) {
      try {
        const res = await s.get(url);
        const feed = res.json ? fromJson(res.json, url) : parseFeed(res.text, url);
        if (feed.discover) {
          if (depth > 0) throw new Error('no parece un feed RSS');
          return loadFeed(feed.discover, depth + 1);
        }
        if (!feed.items.length) throw new Error('el feed está vacío');
        rememberVia(url, s.id);
        return { ...feed, url };
      } catch (e) {
        errors.push(s.id + ': ' + (e.name === 'AbortError' ? 'tardó demasiado' : e.message));
      }
    }
    const err = new Error('No se pudo leer el feed. El sitio no deja leerlo directo y los intermediarios públicos no respondieron (puede ser la conexión o un bloqueador de anuncios).');
    err.details = errors;
    console.warn('[startpage] RSS', url, errors);
    throw err;
  }

  /** Lee varias fuentes a la vez (de a 4) y junta los titulares por fecha */
  async function loadAll(feeds) {
    const results = new Array(feeds.length);
    let i = 0;
    const worker = async () => {
      while (i < feeds.length) {
        const k = i++;
        try { results[k] = { ok: true, feed: await loadFeed(feeds[k].url) }; } catch (e) { results[k] = { ok: false, error: e }; }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, feeds.length) }, worker));
    const items = []; const failed = [];
    results.forEach((r, k) => {
      if (r.ok) r.feed.items.forEach((it) => items.push({ ...it, src: feeds[k].name }));
      else failed.push(feeds[k].name);
    });
    items.sort((a, b) => b.date - a.date);
    const perFeed = feeds.length > 1 ? 40 : 30;
    return { at: Date.now(), items: items.slice(0, perFeed), failed, error: failed.length === feeds.length ? (results[0].error && results[0].error.message) : null };
  }

  function ago(ts) {
    if (!ts) return '';
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 0) return '';
    if (m < 60) return m <= 1 ? 'recién' : `hace ${m} min`;
    const hrs = Math.round(m / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  }

  const shortName = (name) => name.split(' · ')[0];

  SP.board.register('rss', {
    label: 'Noticias',
    icon: 'rss',
    size: [360, 420],
    min: [220, 180],
    color: 'glass',
    create: (o) => ({ feeds: o.url ? [{ name: o.title || hostOf(o.url), url: o.url }] : [], cache: null, seen: [], topic: 'world' }),
    text: (n) => (n.data.cache ? n.data.cache.items.map((i) => i.title).join(' ') : '') + ' ' + (n.data.feeds || []).map((f) => f.name).join(' '),
    render(body, n, ctx) {
      const d = n.data;
      // Notas de la versión anterior (una sola dirección)
      if (!d.feeds) { d.feeds = d.url ? [{ name: n.title || hostOf(d.url), url: d.url }] : []; delete d.url; }
      body.classList.add('rss-body');
      let loading = false;

      /* --- Elegir fuentes: temas + catálogo + dirección propia --- */
      const setup = (msg) => {
        const chosen = new Map(d.feeds.map((f) => [f.url, f]));
        const topics = SP.RSS_SOURCES || [];
        let topic = topics.find((t) => t.id === d.topic) || topics[0];
        const tabs = h('div', { class: 'rss-topics' });
        const list = h('div', { class: 'rss-sources' });
        const count = h('span');
        const doneBtn = h('button', { type: 'button', class: 'btn small primary' }, 'Listo ', count);
        const paintCount = () => { count.textContent = chosen.size ? `(${chosen.size})` : ''; doneBtn.disabled = !chosen.size; };
        const paintTabs = () => tabs.replaceChildren(...topics.map((t) => h('button', {
          type: 'button', class: 'chip' + (t === topic ? ' on' : ''), text: t.label,
          onclick: () => { topic = t; d.topic = t.id; paintTabs(); paintList(); },
        })));
        const paintList = () => list.replaceChildren(...topic.sources.map(([name, url]) => {
          const on = chosen.has(url);
          return h('button', {
            type: 'button', class: 'rss-src' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false',
            onclick: () => { if (chosen.has(url)) chosen.delete(url); else chosen.set(url, { name, url }); paintList(); paintCount(); },
          }, h('span', { class: 'rss-src-check', html: on ? SP.icon('check', 11) : '' }), h('span', { text: name }));
        }));
        const input = h('input', { class: 'todo-input', placeholder: 'Otra: dirección de un feed o de un sitio + Enter', spellcheck: 'false' });
        input.addEventListener('keydown', async (e) => {
          if (e.key !== 'Enter' || !input.value.trim()) return;
          const url = SP.util.normalizeUrl(input.value.trim());
          input.disabled = true; input.value = 'Buscando el feed…';
          try {
            const f = await loadFeed(url);
            chosen.set(f.url, { name: (f.title || hostOf(f.url)).slice(0, 40), url: f.url });
            input.value = ''; paintCount();
            SP.ui.toast('Agregada: ' + (f.title || hostOf(f.url)));
          } catch (err) { input.value = ''; SP.ui.toast('No se pudo leer esa dirección'); }
          input.disabled = false; input.focus();
        });
        const custom = h('div', { class: 'rss-custom' }, [...chosen.values()].filter((f) => !topics.some((t) => t.sources.some((s) => s[1] === f.url)))
          .map((f) => h('button', { type: 'button', class: 'chip on', title: 'Quitar', text: '✕ ' + f.name, onclick: (e) => { chosen.delete(f.url); e.currentTarget.remove(); paintCount(); } })));
        doneBtn.addEventListener('click', () => {
          ctx.history('Elegir fuentes', () => { d.feeds = [...chosen.values()]; d.cache = null; });
          if (d.feeds.length === 1) ctx.setTitle(shortName(d.feeds[0].name));
          else if (!n.title || n.title === shortName(n.title)) ctx.setTitle(topic.label.replace(/^\S+\s/, ''));
          ctx.save(); draw(); refresh(true);
        });
        paintTabs(); paintList(); paintCount();
        body.replaceChildren(h('div', { class: 'rss-setup' },
          msg ? h('p', { class: 'rss-msg error', text: msg }) : h('p', { class: 'rss-msg', text: 'Elegí una o varias fuentes:' }),
          tabs, list, custom, input,
          h('div', { class: 'rss-setup-foot' },
            d.feeds.length ? h('button', { type: 'button', class: 'btn small ghost', text: 'Cancelar', onclick: draw }) : null,
            doneBtn)));
      };
      ctx.setupFeeds = () => setup();

      /* --- Titulares --- */
      const draw = () => {
        if (!d.feeds.length) { setup(); return; }
        const c = d.cache;
        if (c && c.error && !c.items.length) {
          body.replaceChildren(h('div', { class: 'rss-msg error' }, c.error, ' ',
            h('button', { type: 'button', class: 'linkish', text: 'Reintentar', onclick: () => refresh(true) }), ' · ',
            h('button', { type: 'button', class: 'linkish', text: 'Cambiar fuentes', onclick: () => setup() })));
          return;
        }
        const items = (c && c.items) || [];
        const seen = new Set(d.seen || []);
        const multi = d.feeds.length > 1;
        body.replaceChildren(
          h('ul', { class: 'rss-list' }, items.length ? items.map((it) => h('li', { class: 'rss-item' + (seen.has(it.link) ? ' seen' : '') },
            h('a', {
              href: it.link || null, target: '_blank', rel: 'noopener', text: it.title,
              onclick: () => { d.seen = [...(d.seen || []), it.link].slice(-300); ctx.save(); setTimeout(draw, 50); },
            }),
            h('small', { text: [multi ? shortName(it.src || '') : '', ago(it.date)].filter(Boolean).join(' · ') }))) : h('li', { class: 'rss-msg', text: loading ? 'Cargando titulares…' : 'Sin titulares todavía' })),
          ...(c && c.failed && c.failed.length && items.length ? [h('small', { class: 'rss-failed', title: 'Probá de nuevo más tarde' }, 'No respondieron: ' + c.failed.map(shortName).join(', ') + ' · ',
            h('button', { type: 'button', class: 'linkish', text: 'Reintentar', onclick: () => refresh(true) }))] : []));
      };

      const refresh = async (force) => {
        if (!d.feeds.length || loading) return;
        if (!force && d.cache && !d.cache.error && Date.now() - d.cache.at < 20 * 60000) return;
        loading = true;
        if (!d.cache || !d.cache.items.length) draw();
        const feeds = d.feeds.slice();
        const res = await loadAll(feeds);
        loading = false;
        if (!body.isConnected || feeds !== d.feeds && JSON.stringify(feeds) !== JSON.stringify(d.feeds)) return;
        if (!res.items.length && d.cache && d.cache.items.length) { d.cache.failed = res.failed; draw(); return; } // queda lo último
        d.cache = res; ctx.save(); draw();
      };
      ctx.refreshFeed = () => refresh(true);
      draw();
      refresh(false);
      const t = setInterval(() => { if (!document.hidden) refresh(false); }, 5 * 60000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      return [
        { icon: 'refresh', label: 'Actualizar', fn: () => ctx.refreshFeed && ctx.refreshFeed() },
        { icon: 'rss', label: 'Elegir fuentes…', fn: () => setTimeout(() => ctx.setupFeeds && ctx.setupFeeds(), 30) },
      ];
    },
  });

  SP.rss = { parseFeed, loadFeed, loadAll, STRATEGIES };
})(window.SP);
