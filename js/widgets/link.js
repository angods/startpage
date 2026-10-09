/* ==========================================================================
   Startpage · Accesos directos (mini sticky note con el ícono de la página)
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, normalizeUrl, hostOf } = SP.util;

  function faviconFor(url) {
    const host = hostOf(url);
    return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128` : '';
  }

  function prettyName(url) {
    const host = hostOf(url);
    if (!host) return 'Enlace';
    const base = host.split('.').slice(-2, -1)[0] || host;
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /** Diálogo para crear/editar un acceso. Devuelve {url,title,icon} o null */
  async function prompt(existing) {
    const r = await SP.ui.modal({
      title: existing ? 'Editar acceso' : 'Nuevo acceso directo',
      submitText: existing ? 'Guardar' : 'Agregar',
      fields: [
        { name: 'url', label: 'Dirección', placeholder: 'youtube.com', value: existing ? existing.url : '', required: true },
        { name: 'title', label: 'Nombre', placeholder: 'Se completa solo si lo dejás vacío', value: existing ? existing.title : '' },
        { name: 'icon', label: 'Ícono (opcional)', placeholder: 'URL de una imagen o un emoji', value: existing ? existing.icon : '' },
      ],
    });
    if (!r || !r.url.trim()) return null;
    const url = normalizeUrl(r.url);
    return { url, title: r.title.trim() || prettyName(url), icon: r.icon.trim() };
  }

  function iconEl(n) {
    const custom = n.data.icon;
    const letter = h('span', { class: 'link-letter', text: (n.title || '?').trim().charAt(0).toUpperCase() });
    if (custom && !/^(https?:|data:|\.{0,2}\/|assets\/)/i.test(custom)) {
      // Emoji o texto corto
      return h('span', { class: 'link-ico emoji', text: custom });
    }
    const src = custom || faviconFor(n.data.url);
    if (!src) return h('span', { class: 'link-ico' }, letter);
    const img = h('img', { src, alt: '', draggable: 'false', loading: 'lazy', referrerpolicy: 'no-referrer' });
    const box = h('span', { class: 'link-ico' }, img);
    img.addEventListener('error', () => img.replaceWith(letter));
    // Google devuelve un globo genérico de 16px si no encuentra el ícono
    img.addEventListener('load', () => { if (!custom && img.naturalWidth <= 16) img.replaceWith(letter); });
    return box;
  }

  SP.board.register('link', {
    label: 'Acceso',
    icon: 'link',
    size: [100, 100],
    min: [76, 76],
    color: 'glass',
    headless: true,
    create: (o) => ({ url: o.url || '', icon: o.icon || '', newTab: !!o.newTab }),
    render(body, n, ctx) {
      const a = h('a', {
        class: 'link-tile',
        href: n.data.url,
        draggable: 'false',
        title: n.data.url,
        target: n.data.newTab ? '_blank' : null,
        rel: n.data.newTab ? 'noopener' : null,
      }, iconEl(n), h('span', { class: 'link-name', text: n.title || prettyName(n.data.url) }));
      a.addEventListener('click', (e) => { if (ctx.el._justDragged) e.preventDefault(); });
      body.append(a);
    },
    menu(n, ctx) {
      return [
        {
          icon: 'edit', label: 'Editar acceso',
          fn: async () => {
            const r = await prompt({ url: n.data.url, title: n.title, icon: n.data.icon });
            if (!r) return;
            n.data.url = r.url; n.data.icon = r.icon; n.title = r.title;
            ctx.save(); ctx.rerender();
          },
        },
        {
          icon: 'external', label: n.data.newTab ? 'Abrir en esta pestaña' : 'Abrir en pestaña nueva',
          fn: () => { n.data.newTab = !n.data.newTab; ctx.save(); ctx.rerender(); },
        },
      ];
    },
  });

  SP.link = { prompt, prettyName };
})(window.SP);
