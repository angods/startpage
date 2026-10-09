/* ==========================================================================
   Startpage · Carpeta de accesos
   Soltá un acceso directo encima para guardarlo adentro; arrastrá un ícono
   fuera de la carpeta para devolverlo al tablero.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  SP.board.register('folder', {
    label: 'Carpeta',
    icon: 'folder',
    size: [280, 220],
    min: [150, 120],
    color: 'glass',
    create: (o) => ({ links: o.links || [], newTab: false }),
    text: (n) => n.data.links.map((l) => l.title + ' ' + l.url).join(' '),
    accepts: (other) => other.type === 'link',
    accept(folder, link) {
      folder.data.links.push({ id: SP.util.uid(), url: link.data.url, title: link.title || SP.link.prettyName(link.data.url), icon: link.data.icon || '' });
      SP.ui.toast(`"${link.title || 'Acceso'}" guardado en la carpeta`, { ms: 1800 });
    },
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('folder-body');
      const grid = h('div', { class: 'folder-grid' });

      const tile = (l) => {
        const a = h('a', {
          class: 'folder-tile', href: l.url, title: l.title + '\n' + l.url + '\n(arrastralo afuera para sacarlo)',
          draggable: 'false', target: d.newTab ? '_blank' : null, rel: d.newTab ? 'noopener' : null,
        }, SP.link.iconFor(l), h('span', { class: 'folder-name', text: l.title }));
        a.addEventListener('pointerdown', (e) => dragOut(e, a, l));
        a.addEventListener('click', (e) => { if (a._dragged) e.preventDefault(); });
        return a;
      };

      const addTile = h('button', {
        type: 'button', class: 'folder-tile add', title: 'Agregar acceso',
        onclick: async () => {
          const r = await SP.link.prompt();
          if (!r) return;
          ctx.history('Agregar a la carpeta', () => { d.links.push({ id: SP.util.uid(), ...r }); });
          ctx.save(); draw();
        },
      }, h('span', { class: 'link-ico', html: SP.icon('plus', 20) }), h('span', { class: 'folder-name', text: 'Agregar' }));

      const draw = () => {
        grid.replaceChildren(...d.links.map(tile), ...(SP.store.state.locked ? [] : [addTile]));
        if (!d.links.length) grid.prepend(h('p', { class: 'folder-empty', text: 'Soltá accesos directos acá' }));
      };

      // Arrastrar un ícono fuera de la carpeta lo devuelve al tablero
      function dragOut(e, a, l) {
        if (e.button !== 0 || SP.store.state.locked) return;
        e.stopPropagation();
        const sx = e.clientX; const sy = e.clientY;
        let ghost = null;
        const move = (ev) => {
          if (!ghost) {
            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
            a._dragged = true;
            ghost = a.cloneNode(true);
            ghost.classList.add('folder-ghost');
            document.body.append(ghost);
            a.classList.add('leaving');
            document.body.classList.add('is-dragging');
          }
          ghost.style.transform = `translate(${ev.clientX - 36}px, ${ev.clientY - 36}px)`;
          const r = ctx.el.getBoundingClientRect();
          ghost.classList.toggle('outside', ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom);
        };
        const end = (ev) => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', end);
          if (!ghost) return;
          setTimeout(() => { a._dragged = false; }, 0);
          ghost.remove();
          document.body.classList.remove('is-dragging');
          a.classList.remove('leaving');
          const r = ctx.el.getBoundingClientRect();
          const outside = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
          if (!outside) return;
          const p = SP.board.toCanvas(ev.clientX, ev.clientY);
          const t = SP.history.begin('Sacar de la carpeta');
          d.links = d.links.filter((x) => x !== l);
          SP.board.add('link', { url: l.url, title: l.title, icon: l.icon }, { x: Math.max(0, Math.round(p.x - 50)), y: Math.max(0, Math.round(p.y - 50)), w: 100, h: 100 });
          t.commit();
          ctx.save(); draw();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
      }

      draw();
      body.append(grid);
    },
    menu(n, ctx) {
      return [
        {
          icon: 'external', label: n.data.newTab ? 'Abrir en esta pestaña' : 'Abrir en pestaña nueva',
          fn: () => { n.data.newTab = !n.data.newTab; ctx.save(); ctx.rerender(); },
        },
        {
          icon: 'globe', label: 'Abrir todos', fn: () => {
            n.data.links.forEach((l) => window.open(l.url, '_blank', 'noopener'));
            if (n.data.links.length > 1) SP.ui.toast('Si se abrió uno solo, permití las ventanas emergentes');
          },
        },
        {
          icon: 'layout', label: 'Sacar todos al tablero', fn: () => {
            const W = n;
            n.data.links.forEach((l, i) => SP.board.add('link', { url: l.url, title: l.title, icon: l.icon },
              { x: W.x + (i % 4) * 120, y: W.y + W.h + 20 + Math.floor(i / 4) * 120, w: 100, h: 100 }));
            n.data.links = [];
            ctx.save(); ctx.rerender();
          },
        },
      ];
    },
  });
})(window.SP);
