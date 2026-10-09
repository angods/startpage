/* ==========================================================================
   Startpage · Imágenes (una foto o una galería)
   Las imágenes se achican a 1920px y se guardan en IndexedDB (no ocupan el
   espacio de las notas). Pegá (Ctrl+V) o soltá imágenes sobre el tablero.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const MAX = 1920;

  /** Achica fotos grandes (los GIF y SVG se guardan tal cual) */
  async function shrink(file) {
    if (/gif|svg/.test(file.type) || file.size < 400 * 1024) return file;
    try {
      const img = await SP.ascii.loadImage(file);
      const k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise((r) => cv.toBlob(r, type, 0.86));
      return blob && blob.size < file.size ? blob : file;
    } catch (e) { return file; }
  }

  async function store(files) {
    const keys = [];
    let ratio = 0.75;
    for (const f of files) {
      const blob = await shrink(f);
      keys.push(await SP.media.put(blob));
      if (keys.length === 1) {
        try { const img = await SP.ascii.loadImage(blob); ratio = img.naturalHeight / img.naturalWidth; } catch (e) { /* nada */ }
      }
    }
    return { keys, ratio };
  }

  /** Crea una nota con estas imágenes (pos opcional en coordenadas del lienzo) */
  async function addFiles(files, pos) {
    if (SP.store.state.locked) { SP.ui.toast('Desbloqueá el tablero para agregar notas'); return; }
    SP.ui.toast(files.length > 1 ? `Guardando ${files.length} imágenes…` : 'Guardando imagen…', { ms: 1200 });
    try {
      const { keys, ratio } = await store(files);
      const w = 300; const hh = Math.round(Math.min(480, Math.max(120, w * ratio)) / 20) * 20;
      const geom = pos ? { x: Math.max(0, Math.round(pos.x - w / 2)), y: Math.max(0, Math.round(pos.y - hh / 2)), w, h: hh } : { w, h: hh, ...SP.board.findSpot(w, hh) };
      SP.board.add('image', { media: keys }, geom);
    } catch (e) { SP.ui.toast('No se pudo guardar la imagen'); }
  }

  function pickFiles(cb) {
    const input = h('input', { type: 'file', accept: 'image/*', multiple: true });
    input.addEventListener('change', () => { if (input.files.length) cb([...input.files]); });
    input.click();
  }

  SP.board.register('image', {
    label: 'Imagen',
    icon: 'image',
    size: [300, 220],
    min: [100, 80],
    color: 'glass',
    headless: true,
    create: (o) => ({ media: o.media || [], i: 0, fit: 'cover', auto: false }),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('img-body');
      let url = null; let timer = null;
      if (!d.media.length) {
        body.append(h('div', { class: 'img-empty' },
          h('span', { html: SP.icon('image', 28) }),
          h('button', {
            type: 'button', class: 'btn small primary', text: 'Elegir imágenes',
            onclick: () => pickFiles(async (files) => {
              const { keys } = await store(files);
              ctx.history('Agregar imágenes', () => { d.media.push(...keys); });
              ctx.save(); ctx.rerender();
            }),
          }),
          h('small', { text: 'o pegá / soltá una sobre el tablero' })));
        return null;
      }
      d.i = Math.min(d.i || 0, d.media.length - 1);
      const img = h('img', { class: 'img-main fit-' + d.fit, alt: n.title || 'Imagen', draggable: 'false' });
      const show = async () => {
        const blob = await SP.media.get(d.media[d.i]).catch(() => null);
        if (url) URL.revokeObjectURL(url);
        if (!blob) { img.removeAttribute('src'); img.alt = 'Imagen no disponible en este navegador'; body.classList.add('missing'); return; }
        body.classList.remove('missing');
        url = URL.createObjectURL(blob);
        img.classList.remove('in'); void img.offsetWidth;
        img.src = url;
        img.classList.add('in');
        dots.querySelectorAll('i').forEach((x, k) => x.classList.toggle('on', k === d.i));
      };
      const go = (delta) => { d.i = (d.i + delta + d.media.length) % d.media.length; ctx.save(); show(); };
      const dots = h('div', { class: 'img-dots' }, d.media.length > 1 ? d.media.map(() => h('i')) : null);
      body.append(img, dots);
      if (d.media.length > 1) {
        body.append(
          h('button', { type: 'button', class: 'img-nav prev', 'aria-label': 'Anterior', html: SP.icon('back_arrow', 16), onclick: () => go(-1) }),
          h('button', { type: 'button', class: 'img-nav next', 'aria-label': 'Siguiente', html: SP.icon('chevron', 16), onclick: () => go(1) }));
        if (d.auto) timer = setInterval(() => { if (!document.hidden && !ctx.el.hidden) go(1); }, 6000);
      }
      show();
      return () => { clearInterval(timer); if (url) URL.revokeObjectURL(url); };
    },
    menu(n, ctx) {
      const d = n.data;
      return [
        {
          icon: 'plus', label: 'Agregar imágenes…',
          fn: () => pickFiles(async (files) => {
            const { keys } = await store(files);
            ctx.history('Agregar imágenes', () => { d.media.push(...keys); });
            ctx.save(); ctx.rerender();
          }),
        },
        d.media.length ? { icon: 'fit', label: d.fit === 'cover' ? 'Mostrar entera' : 'Llenar la nota', fn: () => { d.fit = d.fit === 'cover' ? 'contain' : 'cover'; ctx.save(); ctx.rerender(); } } : null,
        d.media.length > 1 ? { icon: 'play', label: d.auto ? 'Detener pase automático' : 'Pase automático', fn: () => { d.auto = !d.auto; ctx.save(); ctx.rerender(); } } : null,
        d.media.length ? { icon: 'trash', label: 'Quitar esta imagen', fn: () => { d.media.splice(d.i, 1); d.i = 0; ctx.save(); ctx.rerender(); } } : null,
        d.media.length ? {
          icon: 'download', label: 'Descargar',
          fn: async () => {
            const blob = await SP.media.get(d.media[d.i]);
            if (!blob) return;
            const a = h('a', { href: URL.createObjectURL(blob), download: (n.title || 'imagen') });
            document.body.append(a); a.click(); a.remove();
          },
        } : null,
      ].filter(Boolean);
    },
  });

  SP.image = { addFiles };
})(window.SP);
