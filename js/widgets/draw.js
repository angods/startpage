/* ==========================================================================
   Startpage · Dibujo a mano alzada
   Los trazos se guardan como vectores (no como imagen): ocupan poco, se ven
   nítidos en cualquier pantalla, el color "tinta" sigue al tema y cada trazo
   se puede deshacer con Ctrl+Z.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const COLORS = ['ink', '#e5484d', '#f59e0b', '#22a06b', '#2f80ed', '#9b51e0'];
  const TOOLS = { pen: 'Lápiz', marker: 'Resaltador', eraser: 'Goma' };

  function strokePath(c, p) {
    c.beginPath();
    c.moveTo(p[0], p[1]);
    if (p.length === 2) { c.lineTo(p[0] + 0.1, p[1] + 0.1); return; }
    // Curvas suaves pasando por los puntos medios
    for (let i = 2; i < p.length - 2; i += 2) {
      const mx = (p[i] + p[i + 2]) / 2; const my = (p[i + 1] + p[i + 3]) / 2;
      c.quadraticCurveTo(p[i], p[i + 1], mx, my);
    }
    c.lineTo(p[p.length - 2], p[p.length - 1]);
  }

  function drawStroke(c, s, ink) {
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = s.w;
    c.globalCompositeOperation = s.t === 'eraser' ? 'destination-out' : 'source-over';
    c.globalAlpha = s.t === 'marker' ? 0.35 : 1;
    c.strokeStyle = s.c === 'ink' ? ink : s.c;
    strokePath(c, s.p);
    c.stroke();
    c.restore();
  }

  SP.board.register('draw', {
    label: 'Dibujo',
    icon: 'brush',
    size: [320, 260],
    min: [160, 120],
    color: 'glass',
    create: () => ({ strokes: [], tool: 'pen', color: 'ink', size: 3 }),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('draw-body');
      const cv = h('canvas', { class: 'draw-canvas no-drag', 'aria-label': 'Pizarra para dibujar' });
      const c2 = cv.getContext('2d');
      let ink = '#000';

      const redraw = () => {
        const dpr = window.devicePixelRatio || 1;
        const w = body.clientWidth; const hh = body.clientHeight;
        if (!w || !hh) return;
        cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr);
        cv.style.width = w + 'px'; cv.style.height = hh + 'px';
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        ink = getComputedStyle(ctx.el).getPropertyValue('--note-ink').trim() || '#222';
        c2.clearRect(0, 0, w, hh);
        d.strokes.forEach((s) => drawStroke(c2, s, ink));
      };

      // Barra de herramientas flotante
      const tools = h('div', { class: 'draw-tools no-drag' },
        Object.entries(TOOLS).map(([k, label]) => h('button', {
          type: 'button', class: 'draw-tool' + (d.tool === k ? ' active' : ''), title: label, 'aria-label': label,
          html: SP.icon(k === 'eraser' ? 'backspace' : k === 'marker' ? 'pen' : 'brush', 14),
          onclick: (e) => { d.tool = k; ctx.save(); tools.querySelectorAll('.draw-tool').forEach((b) => b.classList.remove('active')); e.currentTarget.classList.add('active'); },
        })),
        h('span', { class: 'draw-sep' }),
        COLORS.map((col) => h('button', {
          type: 'button', class: 'draw-color' + (d.color === col ? ' active' : ''), title: col === 'ink' ? 'Tinta' : col, 'aria-label': 'Color ' + (col === 'ink' ? 'tinta' : col),
          style: { background: col === 'ink' ? 'var(--note-ink)' : col },
          onclick: (e) => { d.color = col; if (d.tool === 'eraser') d.tool = 'pen'; ctx.save(); tools.querySelectorAll('.draw-color').forEach((b) => b.classList.remove('active')); e.currentTarget.classList.add('active'); },
        })),
        h('input', {
          type: 'range', min: 1, max: 24, value: d.size, class: 'draw-size', title: 'Grosor', 'aria-label': 'Grosor',
          oninput: (e) => { d.size = +e.target.value; ctx.save(); },
        }));

      cv.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || SP.store.state.locked) return;
        e.preventDefault();
        cv.setPointerCapture(e.pointerId);
        const r = cv.getBoundingClientRect();
        const sc = cv.clientWidth / r.width; // compensa el zoom del tablero
        const pt = (ev) => [Math.round((ev.clientX - r.left) * sc * 10) / 10, Math.round((ev.clientY - r.top) * sc * 10) / 10];
        const s = { t: d.tool, c: d.color, w: d.tool === 'eraser' ? d.size * 4 : d.tool === 'marker' ? d.size * 4 : d.size, p: pt(e) };
        let lastX = s.p[0]; let lastY = s.p[1];
        // Copia de lo ya dibujado: en cada movimiento solo se repinta el trazo nuevo
        const base = document.createElement('canvas');
        base.width = cv.width; base.height = cv.height;
        base.getContext('2d').drawImage(cv, 0, 0);
        const paint = () => {
          c2.save(); c2.setTransform(1, 0, 0, 1, 0, 0);
          c2.clearRect(0, 0, cv.width, cv.height); c2.drawImage(base, 0, 0);
          c2.restore();
          drawStroke(c2, s, ink);
        };
        const move = (ev) => {
          const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
          for (const x of evs) {
            const [px, py] = pt(x);
            if (Math.hypot(px - lastX, py - lastY) < 1.5) continue;
            s.p.push(px, py); lastX = px; lastY = py;
          }
          paint();
        };
        const up = () => {
          cv.removeEventListener('pointermove', move);
          cv.removeEventListener('pointerup', up);
          cv.removeEventListener('pointercancel', up);
          ctx.history(s.t === 'eraser' ? 'Borrar con goma' : 'Trazo', () => { d.strokes.push(s); });
          ctx.save();
          redraw();
        };
        cv.addEventListener('pointermove', move);
        cv.addEventListener('pointerup', up);
        cv.addEventListener('pointercancel', up);
        drawStroke(c2, s, ink);
      });

      body.append(cv, tools);
      const ro = new ResizeObserver(redraw);
      ro.observe(body);
      const onTheme = () => setTimeout(redraw, 50);
      document.addEventListener('sp:theme', onTheme);
      return () => { ro.disconnect(); document.removeEventListener('sp:theme', onTheme); };
    },
    menu(n, ctx) {
      return [
        { icon: 'undo', label: 'Quitar el último trazo', fn: () => { n.data.strokes.pop(); ctx.save(); ctx.rerender(); } },
        { icon: 'trash', label: 'Borrar todo el dibujo', fn: () => { n.data.strokes = []; ctx.save(); ctx.rerender(); } },
        {
          icon: 'download', label: 'Descargar como PNG',
          fn: () => {
            const cv = ctx.body.querySelector('canvas');
            if (!cv) return;
            const a = h('a', { href: cv.toDataURL('image/png'), download: (n.title || 'dibujo') + '.png' });
            document.body.append(a); a.click(); a.remove();
          },
        },
      ];
    },
  });
})(window.SP);
