/* ==========================================================================
   Startpage · Video de YouTube como nota
   Acepta enlaces watch?v=, youtu.be, shorts, embed, live y listas.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  function parseYouTube(input) {
    const s = (input || '').trim();
    if (/^[\w-]{11}$/.test(s)) return { id: s, list: '' };
    let u;
    try { u = new URL(SP.util.normalizeUrl(s)); } catch (e) { return null; }
    const host = u.hostname.replace(/^(www|m|music)\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1, 12);
    else if (/youtube(-nocookie)?\.com$/.test(host)) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else {
        const m = /^\/(embed|shorts|live|v)\/([\w-]{11})/.exec(u.pathname);
        if (m) id = m[2];
      }
    } else return null;
    const list = u.searchParams.get('list') || '';
    const t = u.searchParams.get('t') || u.searchParams.get('start') || '';
    if (!id && !list) return null;
    return { id, list, start: parseInt(String(t).replace(/s$/, ''), 10) || 0 };
  }

  function watchUrl(v) {
    return v.id ? `https://www.youtube.com/watch?v=${v.id}${v.list ? '&list=' + v.list : ''}` : `https://www.youtube.com/playlist?list=${v.list}`;
  }

  function embedUrl(v) {
    const p = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
    if (v.list) p.set('list', v.list);
    if (v.start) p.set('start', String(v.start));
    if (location.origin && location.origin !== 'null') p.set('origin', location.origin);
    const path = v.id ? v.id : 'videoseries';
    return `https://www.youtube-nocookie.com/embed/${path}?${p.toString()}`;
  }

  async function ask(current) {
    const r = await SP.ui.modal({
      title: 'Video de YouTube',
      submitText: 'Listo',
      fields: [{ name: 'url', label: 'Enlace del video o lista', placeholder: 'https://youtu.be/…', value: current || '', required: true }],
    });
    if (!r) return null;
    const v = parseYouTube(r.url);
    if (!v) { SP.ui.toast('Ese enlace no parece de YouTube'); return null; }
    return { url: r.url.trim(), ...v };
  }

  SP.board.register('youtube', {
    label: 'YouTube',
    icon: 'video',
    size: [400, 262],
    min: [220, 150],
    color: 'graphite',
    create: (o) => ({ url: o.url || '', id: o.id || '', list: o.list || '', start: o.start || 0 }),
    render(body, n, ctx) {
      body.classList.add('yt');
      if (!n.data.id && !n.data.list) {
        const input = h('input', { class: 'yt-input', placeholder: 'Pegá un enlace de YouTube y Enter', spellcheck: 'false' });
        const go = () => {
          const v = parseYouTube(input.value);
          if (!v) { SP.ui.toast('Ese enlace no parece de YouTube'); return; }
          Object.assign(n.data, { url: input.value.trim() }, v);
          ctx.save(); ctx.rerender();
        };
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
        input.addEventListener('paste', () => setTimeout(() => { if (parseYouTube(input.value)) go(); }, 0));
        body.append(h('div', { class: 'yt-empty' },
          h('span', { class: 'yt-empty-ico', html: SP.icon('video', 34) }), input));
        return;
      }
      // Abierta como archivo local (file://) YouTube rechaza el reproductor incrustado
      // ("Error 153"): mostramos la miniatura y la abrimos en una ventanita.
      if (location.protocol === 'file:') {
        const open = () => window.open(watchUrl(n.data), 'sp-youtube', 'width=1000,height=620');
        const thumb = n.data.id ? `https://i.ytimg.com/vi/${n.data.id}/hqdefault.jpg` : '';
        const hint = h('div', { class: 'yt-hint' }, 'Abierta como archivo, YouTube solo se ve en ventana aparte. Publicada en GitHub Pages se ve acá adentro.');
        body.append(
          h('button', { type: 'button', class: 'yt-thumb', style: thumb ? { backgroundImage: `url("${thumb}")` } : null, onclick: open, title: 'Reproducir' },
            h('span', { class: 'yt-play', html: SP.icon('play', 22) })),
          hint);
        return;
      }
      const iframe = h('iframe', {
        src: embedUrl(n.data),
        title: n.title || 'YouTube',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowfullscreen: true,
        referrerpolicy: 'strict-origin-when-cross-origin',
        loading: 'lazy',
      });
      body.append(iframe);
    },
    menu(n, ctx) {
      return [
        {
          icon: 'edit', label: 'Cambiar video',
          fn: async () => {
            const v = await ask(n.data.url);
            if (v) { Object.assign(n.data, v); ctx.save(); ctx.rerender(); }
          },
        },
        {
          icon: 'external', label: 'Abrir en YouTube',
          fn: () => window.open(watchUrl(n.data), '_blank', 'noopener'),
        },
      ];
    },
  });

  SP.youtube = { parse: parseYouTube, ask };
})(window.SP);
