/* ==========================================================================
   Startpage · Tablero
   Monta cada nota en el lienzo y maneja todo lo que pasa sobre él:
   arrastrar (con cuadrícula y guías de alineación), redimensionar,
   selección múltiple, teclado, zoom, varios tableros, carpetas, orden de
   apilado (z-index), colores, menú contextual y el candado.
   Los tipos de nota se registran con SP.board.register(tipo, definición).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, clamp } = SP.util;

  const GRID = 20;
  const HEAD_H = 34;           // alto de la barra de la nota (al plegarla)
  const ZMIN = 0.3; const ZMAX = 2;
  const widgets = {};
  const views = new Map();     // id -> { el, body, cleanup, ctx }
  const selected = new Set();  // ids seleccionados
  let boardEl = null; let stage = null; let canvas = null;

  const state = () => SP.store.state;
  const allNotes = () => state().notes;
  /** Notas del tablero visible */
  const notes = () => allNotes().filter((n) => n.board === state().board);
  const byId = (id) => allNotes().find((n) => n.id === id);
  const activeBoard = () => state().boards.find((b) => b.id === state().board) || state().boards[0];
  const zoom = () => activeBoard().zoom || 1;
  const snap = (v) => (state().snap ? Math.round(v / GRID) * GRID : Math.round(v));
  const tx = (label, opts) => SP.history.begin(label, opts);

  /**
   * Registra un tipo de nota.
   * def = { label, icon, size:[w,h], min:[w,h], color, headless?, create(opts)->data,
   *         render(body, note, ctx) -> cleanup?, menu?(note, ctx) -> [{icon,label,fn}],
   *         accepts?(otraNota) -> bool, accept?(nota, otraNota)  // para soltar notas encima
   *         text?(note) -> string  // texto para la búsqueda de la paleta de comandos }
   */
  function register(type, def) { widgets[type] = def; }

  /* ---------- Geometría, color y estado visual ---------- */
  function applyGeom(el, n) {
    el.style.transform = `translate(${n.x}px, ${n.y}px) rotate(var(--tilt, 0deg))`;
    el.style.width = n.w + 'px';
    el.style.height = (n.collapsed ? HEAD_H : n.h) + 'px';
    el.style.zIndex = n.z;
  }

  function applyColor(el, n) {
    [...el.classList].filter((c) => c.startsWith('c-')).forEach((c) => el.classList.remove(c));
    if (n.color && n.color[0] === '#') {
      el.classList.add('c-custom');
      el.style.setProperty('--note-bg', n.color);
      el.style.setProperty('--note-ink', SP.util.inkFor(n.color));
    } else {
      el.style.removeProperty('--note-bg');
      el.style.removeProperty('--note-ink');
      el.classList.add('c-' + (n.color || 'yellow'));
    }
  }

  function applyFont(el, n) {
    if (n.font && SP.fonts.FONTS[n.font]) {
      SP.fonts.load(n.font);
      const st = SP.fonts.stack(n.font);
      el.style.setProperty('--font', st);
      el.style.setProperty('--font-display', st);
      el.classList.add('has-font');
    } else {
      el.style.removeProperty('--font');
      el.style.removeProperty('--font-display');
      el.classList.remove('has-font');
    }
  }

  function applyFlags(el, n) {
    el.classList.toggle('collapsed', !!n.collapsed);
    el.classList.toggle('pinned', !!n.pinned);
    el.hidden = n.board !== state().board;
    el.setAttribute('aria-label', (n.title || (widgets[n.type] && widgets[n.type].label) || 'Nota') + (n.pinned ? ' (fijada)' : ''));
  }

  function maxZ() { return notes().reduce((m, n) => Math.max(m, n.z || 0), 0); }
  function minZ() { return notes().reduce((m, n) => Math.min(m, n.z || 0), Infinity); }

  function normalizeZ() {
    [...notes()].sort((a, b) => a.z - b.z).forEach((n, i) => {
      n.z = i + 1;
      const v = views.get(n.id);
      if (v) v.el.style.zIndex = n.z;
    });
  }

  function bringToFront(n) {
    const top = maxZ();
    if (n.z === top && notes().filter((x) => x.z === top).length === 1) return;
    n.z = top + 1;
    const v = views.get(n.id);
    if (v) v.el.style.zIndex = n.z;
    if (n.z > 5000) normalizeZ();
    SP.store.save();
  }

  function sendToBack(n) {
    n.z = minZ() - 1;
    normalizeZ();
    SP.store.save();
  }

  /* ---------- Lienzo y zoom ----------
     #board (scroll) > #stage (tamaño ya escalado) > #canvas (scale(zoom)) */
  function updateCanvasSize() {
    if (!canvas) return;
    const z = zoom();
    let w = 0; let hh = 0;
    for (const n of notes()) { w = Math.max(w, n.x + n.w); hh = Math.max(hh, n.y + (n.collapsed ? HEAD_H : n.h)); }
    const cw = Math.max(w + 80, boardEl.clientWidth / z);
    const ch = Math.max(hh + 80, boardEl.clientHeight / z);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.transform = z === 1 ? '' : `scale(${z})`;
    canvas.style.setProperty('--z', z);
    stage.style.width = cw * z + 'px';
    stage.style.height = ch * z + 'px';
  }

  /** Pasa coordenadas de pantalla a coordenadas del lienzo */
  function toCanvas(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const z = zoom();
    return { x: (cx - r.left) / z, y: (cy - r.top) / z };
  }

  function setZoom(z, cx, cy) {
    const b = activeBoard();
    z = clamp(Math.round(z * 100) / 100, ZMIN, ZMAX);
    if (z === b.zoom) return;
    const br = boardEl.getBoundingClientRect();
    if (cx == null) { cx = br.left + boardEl.clientWidth / 2; cy = br.top + boardEl.clientHeight / 2; }
    const p = toCanvas(cx, cy);
    b.zoom = z;
    updateCanvasSize();
    boardEl.scrollLeft = p.x * z - (cx - br.left);
    boardEl.scrollTop = p.y * z - (cy - br.top);
    SP.store.save();
    document.dispatchEvent(new CustomEvent('sp:zoom', { detail: z }));
  }
  const zoomBy = (f, cx, cy) => setZoom(zoom() * f, cx, cy);

  /** Vista general: ajusta el zoom para ver todas las notas del tablero */
  function zoomFit() {
    const list = notes();
    if (!list.length) { setZoom(1); return; }
    const x0 = Math.min(...list.map((n) => n.x)); const y0 = Math.min(...list.map((n) => n.y));
    const x1 = Math.max(...list.map((n) => n.x + n.w)); const y1 = Math.max(...list.map((n) => n.y + n.h));
    const z = clamp(Math.min((boardEl.clientWidth - 60) / (x1 - x0 + 40), (boardEl.clientHeight - 120) / (y1 - y0 + 40), 1), ZMIN, ZMAX);
    activeBoard().zoom = Math.round(z * 100) / 100;
    updateCanvasSize();
    const zz = zoom();
    boardEl.scrollTo({ left: Math.max(0, x0 * zz - 30), top: Math.max(0, y0 * zz - 70), behavior: SP.util.reducedMotion() ? 'auto' : 'smooth' });
    SP.store.save();
    document.dispatchEvent(new CustomEvent('sp:zoom', { detail: zz }));
  }

  /* ---------- Cuadrícula guía, sombras y guías de alineación ----------
     Mientras se mueve o redimensiona se ve la cuadrícula y una "sombra" con
     el lugar exacto donde va a quedar cada nota. Las guías (líneas de color)
     aparecen cuando un borde o el centro coincide con el de otra nota. */
  let gridEl = null;
  const ghosts = [];
  const guideLines = [];

  function gridOn() {
    if (!gridEl) gridEl = h('div', { id: 'grid-guide', 'aria-hidden': 'true' });
    gridEl.style.setProperty('--grid', GRID + 'px');
    canvas.prepend(gridEl);
    void gridEl.offsetWidth; // fuerza un frame para que se vea la transición
    gridEl.classList.add('on');
  }

  function ghostFor(i, n, el) {
    let g = ghosts[i];
    if (!g) { g = h('div', { class: 'drop-ghost', 'aria-hidden': 'true' }); ghosts[i] = g; }
    g.style.borderRadius = getComputedStyle(el).borderRadius;
    // Mismo z que la nota y justo antes en el DOM: sobre las demás, debajo de esta
    g.style.zIndex = n.z;
    el.before(g);
    requestAnimationFrame(() => g.classList.add('on'));
    return g;
  }

  function placeGhost(g, box, hit) {
    g.style.transform = `translate(${box.x}px, ${box.y}px)`;
    g.style.width = box.w + 'px';
    g.style.height = (box.collapsed ? HEAD_H : box.h) + 'px';
    g.classList.toggle('overlap', !!hit);
  }

  function guidesOff() {
    if (gridEl) gridEl.classList.remove('on');
    ghosts.forEach((g) => { g.classList.remove('on', 'overlap', 'hidden'); g.remove(); });
    drawGuides([]);
  }

  function drawGuides(lines) {
    while (guideLines.length > lines.length) guideLines.pop().remove();
    lines.forEach((l, i) => {
      let el = guideLines[i];
      if (!el) { el = h('div', { class: 'guide-line', 'aria-hidden': 'true' }); guideLines.push(el); canvas.append(el); }
      el.className = 'guide-line ' + l.dir;
      if (l.dir === 'v') Object.assign(el.style, { left: l.at + 'px', top: l.from + 'px', height: (l.to - l.from) + 'px', width: '' });
      else Object.assign(el.style, { top: l.at + 'px', left: l.from + 'px', width: (l.to - l.from) + 'px', height: '' });
    });
  }

  const hgt = (n) => (n.collapsed ? HEAD_H : n.h);

  /**
   * Busca la alineación más cercana de `box` con las otras notas.
   * edges 'xy': bordes y centro; 'rb': solo borde derecho/inferior (redimensionar).
   */
  function findGuides(box, others, edges = 'xy') {
    if (!state().guides || !others.length) return { dx: null, dy: null };
    const T = 7 / zoom();
    let bx = null; let by = null;
    const xs = edges === 'rb' ? [box.x + box.w] : [box.x, box.x + box.w / 2, box.x + box.w];
    const ys = edges === 'rb' ? [box.y + box.h] : [box.y, box.y + box.h / 2, box.y + box.h];
    for (const o of others) {
      const oh = hgt(o);
      for (const t of [o.x, o.x + o.w / 2, o.x + o.w]) {
        for (const s of xs) { const d = t - s; if (Math.abs(d) <= T && (bx === null || Math.abs(d) < Math.abs(bx))) bx = d; }
      }
      for (const t of [o.y, o.y + oh / 2, o.y + oh]) {
        for (const s of ys) { const d = t - s; if (Math.abs(d) <= T && (by === null || Math.abs(d) < Math.abs(by))) by = d; }
      }
    }
    return { dx: bx, dy: by };
  }

  /** Líneas a dibujar para un box ya ubicado (todas las coincidencias exactas) */
  function guideLinesFor(box, others) {
    if (!state().guides) return [];
    const lines = [];
    const eq = (a, b) => Math.abs(a - b) < 0.5;
    const bh = hgt(box);
    for (const x of [box.x, box.x + box.w / 2, box.x + box.w]) {
      const al = others.filter((o) => [o.x, o.x + o.w / 2, o.x + o.w].some((t) => eq(t, x)));
      if (al.length) {
        lines.push({ dir: 'v', at: x, from: Math.min(box.y, ...al.map((o) => o.y)) - 12, to: Math.max(box.y + bh, ...al.map((o) => o.y + hgt(o))) + 12 });
      }
    }
    for (const y of [box.y, box.y + bh / 2, box.y + bh]) {
      const al = others.filter((o) => [o.y, o.y + hgt(o) / 2, o.y + hgt(o)].some((t) => eq(t, y)));
      if (al.length) {
        lines.push({ dir: 'h', at: y, from: Math.min(box.x, ...al.map((o) => o.x)) - 12, to: Math.max(box.x + box.w, ...al.map((o) => o.x + o.w)) + 12 });
      }
    }
    return lines;
  }

  function overlaps(a, b, pad = 12) {
    return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + hgt(b) + pad && a.y + hgt(a) + pad > b.y;
  }

  /* Al soltar, la nota se desliza suavemente hasta su lugar */
  function settle(el) {
    el.classList.add('settling');
    clearTimeout(el._settleT);
    el._settleT = setTimeout(() => el.classList.remove('settling'), 280);
  }

  /** Sacudida corta: "esto no se puede mover" */
  function shake(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 420);
  }

  /* ---------- Arrastrar (una nota o toda la selección) ---------- */
  const INTERACTIVE = 'button, input, textarea, select, iframe, [contenteditable="true"], .no-drag';

  function startDrag(e, n, el) {
    if (e.button !== 0) return;
    if (e.target.closest(INTERACTIVE)) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) { // Shift/Ctrl + clic: sumar o quitar de la selección
      e.preventDefault();
      toggleSelect(n.id);
      return;
    }
    if (state().locked) return;
    if (n.pinned) { shake(el); return; }
    e.preventDefault();
    if (!selected.has(n.id)) select([n.id]);

    const z = zoom();
    const moving = (selected.size > 1 ? [...selected].map(byId) : [n]).filter((m) => m && !m.pinned && m.board === state().board);
    if (!moving.includes(n)) moving.push(n);
    const origin = new Map(moving.map((m) => [m.id, { x: m.x, y: m.y }]));
    const movingSet = new Set(moving.map((m) => m.id));
    const others = notes().filter((o) => !movingSet.has(o.id));
    const box0 = { x: Math.min(...moving.map((m) => m.x)), y: Math.min(...moving.map((m) => m.y)) };
    box0.w = Math.max(...moving.map((m) => m.x + m.w)) - box0.x;
    box0.h = Math.max(...moving.map((m) => m.y + hgt(m))) - box0.y;
    const sx = e.clientX; const sy = e.clientY;
    const reduced = SP.util.reducedMotion();
    let moved = false; let t = null; let raf = 0;
    let free = { dx: 0, dy: 0 }; let fin = { dx: 0, dy: 0 };
    let lastX = sx; let tilt = 0;
    let dropTarget = null;
    const ghostMode = state().snap;
    const ghostEls = [];

    const paint = () => {
      raf = 0;
      for (const m of moving) {
        const o = origin.get(m.id);
        const v = views.get(m.id);
        if (!v) continue;
        const px = ghostMode ? o.x + free.dx : m.x;
        const py = ghostMode ? o.y + free.dy : m.y;
        v.el.style.transform = `translate(${px}px, ${py}px) rotate(var(--tilt, 0deg))`;
      }
      if (ghostMode) {
        moving.forEach((m, i) => {
          const hit = others.some((o) => overlaps(m, o, 0));
          placeGhost(ghostEls[i], m, hit);
          ghostEls[i].classList.toggle('hidden', !!dropTarget);
        });
        gridEl.style.setProperty('--fx', (box0.x + fin.dx + box0.w / 2) + 'px');
        gridEl.style.setProperty('--fy', (box0.y + fin.dy + box0.h / 2) + 'px');
      }
      drawGuides(dropTarget ? [] : guideLinesFor({ x: box0.x + fin.dx, y: box0.y + fin.dy, w: box0.w, h: box0.h }, others));
      if (!reduced) el.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
    };

    const move = (ev) => {
      const ddx = (ev.clientX - sx) / z; const ddy = (ev.clientY - sy) / z;
      if (!moved) {
        if (Math.hypot(ddx * z, ddy * z) < 4) return;
        moved = true;
        t = tx(moving.length > 1 ? `Mover ${moving.length} notas` : 'Mover nota');
        SP.ui.closeMenu();
        moving.forEach((m) => { const c = views.get(m.id).el.classList; c.remove('settling'); c.add('dragging'); });
        document.body.classList.add('is-dragging');
        if (ghostMode) {
          gridOn();
          moving.forEach((m, i) => { ghostEls[i] = ghostFor(i, m, views.get(m.id).el); });
        }
      }
      // Inclinación tipo papel según la velocidad horizontal
      tilt = clamp(tilt * 0.7 + (ev.clientX - lastX) * 0.12, -5, 5);
      lastX = ev.clientX;

      free = { dx: Math.max(-box0.x, ddx), dy: Math.max(-box0.y, ddy) };
      const g = findGuides({ x: box0.x + free.dx, y: box0.y + free.dy, w: box0.w, h: box0.h }, others);
      const o0 = origin.get(n.id);
      fin = {
        dx: g.dx !== null ? free.dx + g.dx : (state().snap ? snap(o0.x + free.dx) - o0.x : Math.round(free.dx)),
        dy: g.dy !== null ? free.dy + g.dy : (state().snap ? snap(o0.y + free.dy) - o0.y : Math.round(free.dy)),
      };
      fin.dx = Math.max(-box0.x, fin.dx); fin.dy = Math.max(-box0.y, fin.dy);
      for (const m of moving) {
        const o = origin.get(m.id);
        m.x = Math.round(o.x + fin.dx); m.y = Math.round(o.y + fin.dy);
      }

      // ¿Soltando un acceso sobre una carpeta (u otra nota que lo acepte)?
      if (moving.length === 1) {
        const p = toCanvas(ev.clientX, ev.clientY);
        const target = others.slice().sort((a, b) => b.z - a.z).find((o) => {
          const W = widgets[o.type];
          return W && W.accepts && W.accepts(n) && p.x >= o.x && p.x <= o.x + o.w && p.y >= o.y && p.y <= o.y + hgt(o);
        }) || null;
        if (target !== dropTarget) {
          if (dropTarget) views.get(dropTarget.id).el.classList.remove('drop-target');
          dropTarget = target;
          if (dropTarget) views.get(dropTarget.id).el.classList.add('drop-target');
          el.classList.toggle('dropping-in', !!dropTarget);
        }
      }
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const end = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (!moved) return;
      document.body.classList.remove('is-dragging');
      el.style.removeProperty('--tilt');
      guidesOff();
      if (dropTarget) {
        views.get(dropTarget.id).el.classList.remove('drop-target');
        el.classList.remove('dropping-in', 'dragging');
        for (const m of moving) { const o = origin.get(m.id); m.x = o.x; m.y = o.y; }
        widgets[dropTarget.type].accept(dropTarget, n);
        renderBody(dropTarget);
        removeNow(n.id, { into: views.get(dropTarget.id).el });
        SP.store.save();
        t.commit();
        return;
      }
      for (const m of moving) {
        const v = views.get(m.id);
        v.el.classList.remove('dragging');
        if (ghostMode && !reduced) settle(v.el);
        applyGeom(v.el, m);
      }
      el._justDragged = true;
      setTimeout(() => { el._justDragged = false; }, 0);
      updateCanvasSize();
      SP.store.save();
      t.commit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  /* ---------- Redimensionar ---------- */
  function startResize(e, n, el, W) {
    if (e.button !== 0 || state().locked) return;
    e.preventDefault();
    e.stopPropagation();
    if (n.pinned || n.collapsed) { shake(el); return; }
    const z = zoom();
    const t = tx('Cambiar tamaño');
    const sx = e.clientX; const sy = e.clientY; const ow = n.w; const oh = n.h;
    const [minW, minH] = W.min || [120, 80];
    const others = notes().filter((o) => o !== n);
    document.body.classList.add('is-dragging', 'is-resizing');
    el.classList.remove('settling');
    el.classList.add('resizing');
    const ghostMode = state().snap;
    let ghost = null;
    if (ghostMode) { gridOn(); ghost = ghostFor(0, n, el); placeGhost(ghost, n); }
    let fw = ow; let fh = oh; let raf = 0;
    const paint = () => {
      raf = 0;
      el.style.width = (ghostMode ? fw : n.w) + 'px';
      el.style.height = (ghostMode ? fh : n.h) + 'px';
      if (ghost) {
        placeGhost(ghost, n, others.some((o) => overlaps(n, o, 0)));
        gridEl.style.setProperty('--fx', (n.x + n.w / 2) + 'px');
        gridEl.style.setProperty('--fy', (n.y + n.h / 2) + 'px');
      }
      drawGuides(guideLinesFor(n, others).filter((l) => (l.dir === 'v' && Math.abs(l.at - (n.x + n.w)) < 0.5) || (l.dir === 'h' && Math.abs(l.at - (n.y + n.h)) < 0.5)));
    };
    const move = (ev) => {
      fw = Math.max(minW, ow + (ev.clientX - sx) / z);
      fh = Math.max(minH, oh + (ev.clientY - sy) / z);
      const g = findGuides({ x: n.x, y: n.y, w: fw, h: fh }, others, 'rb');
      n.w = Math.max(minW, Math.round(g.dx !== null ? fw + g.dx : snap(fw)));
      n.h = Math.max(minH, Math.round(g.dy !== null ? fh + g.dy : snap(fh)));
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const end = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.body.classList.remove('is-dragging', 'is-resizing');
      el.classList.remove('resizing');
      guidesOff();
      if (ghostMode && !SP.util.reducedMotion()) settle(el);
      applyGeom(el, n);
      updateCanvasSize();
      SP.store.save();
      t.commit();
      const v = views.get(n.id);
      if (v && v.ctx.onResize) setTimeout(v.ctx.onResize, ghostMode ? 280 : 0);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  /* ---------- Selección ---------- */
  function renderSelection() {
    for (const [id, v] of views) v.el.classList.toggle('selected', selected.has(id));
    document.body.classList.toggle('multi-sel', selected.size > 1);
    renderSelBar();
  }
  function select(ids, { add = false } = {}) {
    if (!add) selected.clear();
    ids.forEach((id) => selected.add(id));
    renderSelection();
  }
  function toggleSelect(id) {
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    renderSelection();
  }
  function clearSelection() {
    if (!selected.size) return;
    selected.clear();
    renderSelection();
  }
  const selectedNotes = () => [...selected].map(byId).filter((n) => n && n.board === state().board);

  /* Selección con recuadro: arrastrar sobre una zona vacía del tablero */
  function startMarquee(e) {
    if (e.button !== 0 || e.pointerType === 'touch') return;
    const tgt = e.target;
    if (!(tgt === boardEl || tgt === stage || tgt === canvas || tgt === gridEl)) return;
    const p0 = toCanvas(e.clientX, e.clientY);
    const base = e.shiftKey || e.ctrlKey || e.metaKey ? new Set(selected) : new Set();
    let rect = null; let raf = 0; let last = null;
    const paint = () => {
      raf = 0;
      const p = toCanvas(last.clientX, last.clientY);
      const r = { x: Math.min(p0.x, p.x), y: Math.min(p0.y, p.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y) };
      Object.assign(rect.style, { transform: `translate(${r.x}px, ${r.y}px)`, width: r.w + 'px', height: r.h + 'px' });
      selected.clear();
      base.forEach((id) => selected.add(id));
      notes().forEach((n) => { if (overlaps(r, n, 0)) selected.add(n.id); });
      renderSelection();
    };
    const move = (ev) => {
      last = ev;
      if (!rect) {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 5) return;
        rect = h('div', { class: 'marquee', 'aria-hidden': 'true' });
        canvas.append(rect);
        document.body.classList.add('is-dragging');
      }
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      if (raf) { cancelAnimationFrame(raf); paint(); }
      if (rect) { rect.remove(); document.body.classList.remove('is-dragging'); } else if (!base.size) clearSelection();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }

  /* Barra flotante para la selección múltiple: alinear, distribuir, etc. */
  let selBar = null;
  function renderSelBar() {
    const list = selectedNotes();
    if (list.length < 2 || state().locked) { if (selBar) selBar.classList.remove('show'); return; }
    if (!selBar) {
      const b = (icon, title, fn) => h('button', { type: 'button', class: 'tb-btn', title, 'aria-label': title, html: SP.icon(icon, 17), onclick: fn });
      selBar = h('div', { id: 'selbar', class: 'glass', role: 'toolbar', 'aria-label': 'Selección' },
        h('span', { class: 'sel-count' }),
        h('span', { class: 'tb-sep' }),
        b('alignL', 'Alinear a la izquierda', () => align('l')),
        b('alignCX', 'Centrar en horizontal', () => align('cx')),
        b('alignR', 'Alinear a la derecha', () => align('r')),
        b('alignT', 'Alinear arriba', () => align('t')),
        b('alignCY', 'Centrar en vertical', () => align('cy')),
        b('alignB', 'Alinear abajo', () => align('b')),
        b('distH', 'Repartir en horizontal', () => distribute('x')),
        b('distV', 'Repartir en vertical', () => distribute('y')),
        h('span', { class: 'tb-sep' }),
        b('drop', 'Color', (e) => colorMenu(e.currentTarget, selectedNotes())),
        b('copy', 'Duplicar (Ctrl+D)', () => duplicateMany(selectedNotes())),
        b('trash', 'Eliminar (Supr)', () => removeMany(selectedNotes().map((n) => n.id))),
        b('x', 'Quitar selección (Esc)', clearSelection));
      document.body.append(selBar);
    }
    selBar.querySelector('.sel-count').textContent = list.length + ' notas';
    requestAnimationFrame(() => selBar.classList.add('show'));
  }

  function align(how) {
    const list = selectedNotes().filter((n) => !n.pinned);
    if (list.length < 2) return;
    SP.history.run('Alinear', () => {
      const x0 = Math.min(...list.map((n) => n.x)); const x1 = Math.max(...list.map((n) => n.x + n.w));
      const y0 = Math.min(...list.map((n) => n.y)); const y1 = Math.max(...list.map((n) => n.y + hgt(n)));
      for (const n of list) {
        if (how === 'l') n.x = x0;
        if (how === 'r') n.x = x1 - n.w;
        if (how === 'cx') n.x = Math.round((x0 + x1) / 2 - n.w / 2);
        if (how === 't') n.y = y0;
        if (how === 'b') n.y = y1 - hgt(n);
        if (how === 'cy') n.y = Math.round((y0 + y1) / 2 - hgt(n) / 2);
      }
      animateTo(list);
    });
  }

  function distribute(axis) {
    const list = selectedNotes().filter((n) => !n.pinned);
    if (list.length < 3) { SP.ui.toast('Elegí 3 notas o más para repartir'); return; }
    SP.history.run('Repartir', () => {
      const size = (n) => (axis === 'x' ? n.w : hgt(n));
      list.sort((a, b) => a[axis] - b[axis]);
      const start = list[0][axis];
      const endPos = Math.max(...list.map((n) => n[axis] + size(n)));
      const total = list.reduce((s, n) => s + size(n), 0);
      const gap = (endPos - start - total) / (list.length - 1);
      let cur = start;
      for (const n of list) { n[axis] = Math.round(cur); cur += size(n) + gap; }
      animateTo(list);
    });
  }

  /** Mueve notas a su nueva geometría con una transición suave */
  function animateTo(list) {
    const reduced = SP.util.reducedMotion();
    for (const n of list) {
      const v = views.get(n.id);
      if (!v) continue;
      if (!reduced) settle(v.el);
      applyGeom(v.el, n);
    }
    updateCanvasSize();
    SP.store.save();
  }

  /** Ordena el tablero: acomoda las notas en filas, sin superponerse */
  function arrange() {
    const list = notes().filter((n) => !n.pinned).sort((a, b) => (a.y - b.y) || (a.x - b.x));
    if (!list.length) return;
    const t = tx('Ordenar tablero');
    const maxW = Math.max(600, boardEl.clientWidth / zoom() - 60);
    const gap = GRID;
    let x = 40; let y = 80; let rowH = 0;
    for (const n of list) {
      if (x + n.w > maxW && x > 40) { x = 40; y += rowH + gap; rowH = 0; }
      n.x = snap(x); n.y = snap(y);
      x += n.w + gap; rowH = Math.max(rowH, hgt(n));
    }
    animateTo(list);
    t.commit();
    const entry = t.entry;
    SP.ui.toast('Tablero ordenado', { action: { label: 'Deshacer', fn: () => SP.history.undoEntry(entry) } });
  }

  /* ---------- Teclado ----------
     Flechas: mover (Shift = más, Alt = de a 1px) · Supr: borrar ·
     Ctrl+D: duplicar · Ctrl+A: elegir todo · Esc: soltar selección */
  function handleKey(e) {
    const k = e.key;
    const mod = e.ctrlKey || e.metaKey;
    if (k === 'Escape' && selected.size) {
      clearSelection();
      if (document.activeElement && document.activeElement.classList.contains('note')) document.activeElement.blur();
      return true;
    }
    if (mod && k.toLowerCase() === 'a') { select(notes().map((n) => n.id)); return true; }
    const list = selectedNotes();
    if (!list.length) return false;
    if (k === 'Delete' || k === 'Backspace') {
      if (!state().locked) removeMany(list.map((n) => n.id));
      return true;
    }
    if (mod && k.toLowerCase() === 'd') { if (!state().locked) duplicateMany(list); return true; }
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (dirs[k] && !mod) {
      if (state().locked) return true;
      const step = e.altKey ? 1 : (state().snap ? GRID : 10) * (e.shiftKey ? 5 : 1);
      const [dx, dy] = dirs[k];
      SP.history.run('Mover con teclado', () => {
        for (const n of list) {
          if (n.pinned) continue;
          n.x = Math.max(0, n.x + dx * step);
          n.y = Math.max(0, n.y + dy * step);
          applyGeom(views.get(n.id).el, n);
        }
      }, { merge: 'kbd-move' });
      document.body.classList.add('kbd-nav');
      updateCanvasSize();
      SP.store.save();
      const v = views.get(list[0].id);
      if (v) v.el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    }
    if (k === 'Enter' && document.activeElement && document.activeElement.classList.contains('note')) {
      const f = document.activeElement.querySelector('.note-body input, .note-body textarea, .note-body button, .note-body a, .note-body [tabindex]');
      if (f) f.focus();
      return true;
    }
    return false;
  }

  /* ---------- Menú de la nota ---------- */
  function colorMenu(anchor, list) {
    const set = (c) => SP.history.run('Cambiar color', () => {
      list.forEach((n) => { n.color = c; const v = views.get(n.id); if (v) applyColor(v.el, n); });
      SP.store.save();
    }, { merge: 'color' });
    SP.ui.menu(anchor, [h('div', { class: 'menu-label', text: 'Color' }), swatches(list[0], set)], { align: 'start' });
  }

  function swatches(n, set) {
    return h('div', { class: 'swatches' },
      SP.theme.NOTE_COLORS.map((c) => h('button', {
        type: 'button',
        class: 'swatch c-' + c.id + (n.color === c.id ? ' active' : ''),
        title: c.label, 'aria-label': c.label,
        onclick: (e) => {
          set(c.id);
          e.currentTarget.parentElement.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
          e.currentTarget.classList.add('active');
        },
      })),
      h('label', { class: 'swatch custom' + (n.color && n.color[0] === '#' ? ' active' : ''), title: 'Color personalizado' },
        h('span', { html: SP.icon('drop', 14) }),
        h('input', {
          type: 'color', 'aria-label': 'Color personalizado',
          value: n.color && n.color[0] === '#' ? n.color : '#ffd36e',
          oninput: (e) => set(e.target.value),
        })));
  }

  function openNoteMenu(anchor, n) {
    const W = widgets[n.type];
    const v = views.get(n.id);
    const set = (c) => SP.history.run('Cambiar color', () => { n.color = c; applyColor(v.el, n); SP.store.save(); }, { merge: 'color:' + n.id });

    const extra = W.menu ? W.menu(n, v.ctx) : [];
    const boards = state().boards.filter((b) => b.id !== n.board);
    const items = [
      h('div', { class: 'menu-label', text: 'Color de la nota' }),
      swatches(n, set),
      extra.length ? h('div', { class: 'menu-sep' }) : null,
      extra.map((it) => SP.ui.menuItem(it.icon, it.label, (e) => SP.history.run(it.label, () => it.fn(e)), it)),
      h('div', { class: 'menu-sep' }),
      SP.ui.menuItem('font', 'Fuente: ' + (n.font ? SP.fonts.name(n.font) : 'la del tablero'), () => {
        SP.fonts.pick(anchor, n.font || null, (id) => {
          SP.history.run('Cambiar fuente', () => { n.font = id || null; applyFont(v.el, n); SP.store.save(); });
        }, { inherit: true });
      }, { keepOpen: true }),
      !W.headless ? SP.ui.menuItem('collapse', n.collapsed ? 'Desplegar' : 'Plegar (solo la barra)', () => toggleCollapse(n)) : null,
      SP.ui.menuItem('pinned', n.pinned ? 'Soltar (que se pueda mover)' : 'Fijar en su lugar', () => togglePin(n)),
      SP.ui.menuItem('front', 'Traer al frente', () => bringToFront(n)),
      SP.ui.menuItem('back', 'Enviar atrás', () => SP.history.run('Enviar atrás', () => sendToBack(n))),
      boards.length ? SP.ui.menuItem('layout', 'Mover a otro tablero…', () => {
        SP.ui.menu(anchor, [h('div', { class: 'menu-label', text: 'Mover a' }),
          boards.map((b) => SP.ui.menuItem('chevron', b.name, () => moveToBoard([n], b.id)))]);
      }, { keepOpen: true }) : null,
      SP.ui.menuItem('copy', 'Duplicar', () => duplicateMany([n])),
      SP.ui.menuItem('trash', 'Eliminar', () => removeMany([n.id]), { danger: true }),
    ];
    SP.ui.menu(anchor, items);
  }

  function toggleCollapse(n) {
    SP.history.run(n.collapsed ? 'Desplegar' : 'Plegar', () => {
      n.collapsed = !n.collapsed;
      const v = views.get(n.id);
      if (!SP.util.reducedMotion()) settle(v.el);
      applyGeom(v.el, n); applyFlags(v.el, n);
      updateCanvasSize(); SP.store.save();
    });
  }

  function togglePin(n) {
    SP.history.run(n.pinned ? 'Soltar nota' : 'Fijar nota', () => {
      n.pinned = !n.pinned;
      applyFlags(views.get(n.id).el, n);
      SP.store.save();
    });
    SP.ui.toast(n.pinned ? 'Nota fijada: no se mueve ni cambia de tamaño' : 'La nota se puede mover otra vez');
  }

  /* ---------- Montaje ---------- */
  function mount(n, { animate = false, index = -1 } = {}) {
    const W = widgets[n.type];
    if (!W) return;
    const el = h('div', {
      class: 'note' + (W.headless ? ' headless' : ''),
      dataset: { id: n.id, type: n.type },
      tabindex: '0', role: 'group',
    });
    applyGeom(el, n);
    applyColor(el, n);
    applyFont(el, n);
    applyFlags(el, n);

    const menuBtn = h('button', {
      class: 'note-btn', type: 'button', title: 'Opciones', 'aria-label': 'Opciones de la nota',
      html: SP.icon('dots', 16), onclick: (e) => { e.stopPropagation(); openNoteMenu(menuBtn, n); },
    });

    let titleEl = null;
    if (!W.headless) {
      titleEl = h('span', { class: 'note-title', text: n.title || W.label, title: 'Doble clic para renombrar' });
      titleEl.addEventListener('dblclick', () => renameInline(titleEl, n, W));
      const head = h('div', { class: 'note-head' },
        h('span', { class: 'note-ico', html: SP.icon(W.icon, 14) }),
        titleEl,
        h('span', { class: 'note-pin', title: 'Fijada', html: SP.icon('pinned', 13) }),
        h('div', { class: 'note-actions' }, menuBtn));
      head.addEventListener('pointerdown', (e) => startDrag(e, n, el));
      head.addEventListener('dblclick', (e) => { if (e.target === head) toggleCollapse(n); });
      el.append(head);
    } else {
      el.append(h('div', { class: 'note-actions floating' }, menuBtn));
      el.addEventListener('pointerdown', (e) => startDrag(e, n, el));
    }

    const body = h('div', { class: 'note-body' });
    el.append(body);
    const grip = h('div', { class: 'note-resize', title: 'Redimensionar' });
    grip.addEventListener('pointerdown', (e) => startResize(e, n, el, W));
    el.append(grip);

    // Cualquier interacción la trae al frente y la elige
    el.addEventListener('pointerdown', (e) => {
      bringToFront(n);
      document.body.classList.remove('kbd-nav');
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !selected.has(n.id)) select([n.id]);
    }, true);
    el.addEventListener('focus', () => { if (!selected.has(n.id)) select([n.id]); });
    el.addEventListener('contextmenu', (e) => {
      if (e.target.closest('input, textarea, [contenteditable="true"]') || state().locked) return;
      e.preventDefault();
      openNoteMenu(menuBtn, n);
    });

    const view = { el, body, cleanup: null, ctx: null };
    const ctx = {
      note: n,
      el,
      body,
      save: () => SP.store.save(),
      rerender: () => renderBody(n),
      setTitle: (t) => { n.title = t; if (titleEl) titleEl.textContent = t || W.label; applyFlags(el, n); SP.store.save(); },
      onResize: null,
      history: (label, fn, opts) => SP.history.run(label, fn, opts),
    };
    view.ctx = ctx;
    views.set(n.id, view);
    canvas.append(el);
    renderBody(n);
    if (animate && !SP.util.reducedMotion()) {
      el.classList.add('pop-in');
      setTimeout(() => el.classList.remove('pop-in'), 450);
    } else if (index >= 0 && !SP.util.reducedMotion()) {
      el.style.setProperty('--i', Math.min(index, 20));
      el.classList.add('enter');
      setTimeout(() => el.classList.remove('enter'), 1100);
    }
  }

  function renderBody(n) {
    const v = views.get(n.id);
    const W = widgets[n.type];
    if (!v || !W) return;
    if (typeof v.cleanup === 'function') { try { v.cleanup(); } catch (e) { console.warn(e); } }
    v.body.replaceChildren();
    v.body.className = 'note-body';
    v.body.removeAttribute('tabindex');
    v.ctx.onResize = null;
    try {
      v.cleanup = W.render(v.body, n, v.ctx) || null;
    } catch (err) {
      // Un widget roto no rompe el tablero entero
      console.error('[startpage] error en la nota', n.type, err);
      v.cleanup = null;
      v.body.replaceChildren(h('div', { class: 'note-error' },
        h('strong', { text: 'Esta nota tuvo un problema' }),
        h('small', { text: String((err && err.message) || err) }),
        h('button', { type: 'button', class: 'btn small', text: 'Reintentar', onclick: () => renderBody(n) })));
    }
  }

  function renameInline(titleEl, n, W) {
    titleEl.contentEditable = 'true';
    titleEl.focus();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
    const done = (save) => {
      titleEl.contentEditable = 'false';
      titleEl.removeEventListener('keydown', onKey);
      if (save) {
        const t = titleEl.textContent.trim();
        SP.history.run('Renombrar', () => { n.title = t && t !== W.label ? t : null; });
        SP.store.save();
      }
      titleEl.textContent = n.title || W.label;
      const v = views.get(n.id);
      if (v) applyFlags(v.el, n);
    };
    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      if (e.key === 'Escape') { e.preventDefault(); done(false); }
    };
    titleEl.addEventListener('keydown', onKey);
    titleEl.addEventListener('blur', () => { if (titleEl.isContentEditable) done(true); }, { once: true });
  }

  function unmount(id) {
    const v = views.get(id);
    if (!v) return;
    if (typeof v.cleanup === 'function') { try { v.cleanup(); } catch (e) { /* nada */ } }
    v.el.remove();
    views.delete(id);
    selected.delete(id);
  }

  function unmountAnimated(id, into) {
    const v = views.get(id);
    if (!v) return;
    selected.delete(id);
    views.delete(id); // ya no cuenta como montada (un "deshacer" rápido la vuelve a montar)
    const finish = () => { if (typeof v.cleanup === 'function') { try { v.cleanup(); } catch (e) { /* nada */ } } v.el.remove(); };
    renderSelection();
    if (SP.util.reducedMotion() || v.el.hidden) { finish(); return; }
    if (into) {
      // Se "mete" adentro de la nota destino (carpeta)
      const a = v.el.getBoundingClientRect(); const b = into.getBoundingClientRect();
      v.el.style.setProperty('--into-x', (b.left + b.width / 2 - (a.left + a.width / 2)) / zoom() + 'px');
      v.el.style.setProperty('--into-y', (b.top + b.height / 2 - (a.top + a.height / 2)) / zoom() + 'px');
      v.el.classList.add('suck-in');
      into.classList.add('gulp');
      setTimeout(() => into.classList.remove('gulp'), 500);
    } else v.el.classList.add('pop-out');
    setTimeout(finish, into ? 340 : 190);
  }

  function renderAll({ entrance = false } = {}) {
    for (const id of [...views.keys()]) unmount(id);
    const active = state().board;
    let i = 0;
    allNotes().forEach((n) => mount(n, { index: entrance && n.board === active ? i++ : -1 }));
    updateCanvasSize();
    renderSelection();
  }

  /* --- Ganchos para el historial --- */
  function mountNote(n, animate) { mount(n, { animate }); updateCanvasSize(); }
  function refreshNote(n, keys) {
    const v = views.get(n.id);
    if (!v) { mount(n, { animate: true }); return; }
    applyColor(v.el, n); applyFont(v.el, n); applyFlags(v.el, n);
    if (!SP.util.reducedMotion() && keys.some((k) => ['x', 'y', 'w', 'h', 'collapsed'].includes(k))) settle(v.el);
    applyGeom(v.el, n);
    const t = v.el.querySelector('.note-title');
    if (t) t.textContent = n.title || widgets[n.type].label;
    if (keys.includes('data') || keys.includes('type')) renderBody(n);
    else if (keys.includes('w') || keys.includes('h')) { if (v.ctx.onResize) setTimeout(v.ctx.onResize, 280); }
  }
  function afterHistory(ids) {
    for (const [id, v] of views) {
      const n = byId(id);
      if (n) applyFlags(v.el, n);
    }
    // Si lo restaurado está en otro tablero, ir a verlo
    const first = ids.map(byId).find(Boolean);
    if (first && first.board !== state().board) switchBoard(first.board);
    updateCanvasSize();
    ids.forEach((id) => flash(id));
    renderSelection();
    document.dispatchEvent(new CustomEvent('sp:boards'));
  }

  /** Resalta una nota un instante (al encontrarla o restaurarla) */
  function flash(id) {
    const v = views.get(id);
    if (!v || SP.util.reducedMotion()) return;
    v.el.classList.remove('flash');
    void v.el.offsetWidth;
    v.el.classList.add('flash');
    setTimeout(() => v.el.classList.remove('flash'), 900);
  }

  /** Lleva la vista hasta una nota (de cualquier tablero) */
  function focusNote(id) {
    const n = byId(id);
    if (!n) return;
    if (n.board !== state().board) switchBoard(n.board);
    const v = views.get(id);
    if (!v) return;
    const z = zoom();
    boardEl.scrollTo({
      left: Math.max(0, (n.x + n.w / 2) * z - boardEl.clientWidth / 2),
      top: Math.max(0, (n.y + n.h / 2) * z - boardEl.clientHeight / 2),
      behavior: SP.util.reducedMotion() ? 'auto' : 'smooth',
    });
    select([id]);
    bringToFront(n);
    flash(id);
    v.el.focus({ preventScroll: true });
  }

  /* ---------- Crear / eliminar / duplicar ---------- */
  function findSpot(w, hh) {
    const z = zoom();
    const x0 = boardEl.scrollLeft / z + 24; const y0 = boardEl.scrollTop / z + 80;
    const x1 = (boardEl.scrollLeft + boardEl.clientWidth) / z - w - 24;
    const y1 = (boardEl.scrollTop + boardEl.clientHeight) / z - hh - 24;
    for (let y = y0; y <= y1; y += GRID) {
      for (let x = x0; x <= x1; x += GRID) {
        const r = { x, y, w, h: hh };
        if (!notes().some((n) => overlaps(r, n))) return { x: snap(x), y: snap(y) };
      }
    }
    // Sin lugar libre: en cascada desde el centro
    const k = notes().length % 8;
    return {
      x: snap(Math.max(20, boardEl.scrollLeft / z + (boardEl.clientWidth / z - w) / 2 + k * 24)),
      y: snap(Math.max(70, boardEl.scrollTop / z + (boardEl.clientHeight / z - hh) / 2 + k * 24)),
    };
  }

  function add(type, opts = {}, geom = null) {
    const W = widgets[type];
    if (!W) throw new Error('Tipo de nota desconocido: ' + type);
    const [w, hh] = geom && geom.w ? [geom.w, geom.h] : W.size;
    const pos = geom && geom.x != null ? { x: geom.x, y: geom.y } : findSpot(w, hh);
    const t = tx('Agregar ' + W.label.toLowerCase());
    const n = {
      id: SP.util.uid(),
      type,
      board: state().board,
      x: pos.x, y: pos.y, w, h: hh,
      z: maxZ() + 1,
      color: opts.color || W.color || 'yellow',
      title: opts.title || null,
      data: W.create ? W.create(opts) : {},
    };
    allNotes().push(n);
    if (canvas) {
      mount(n, { animate: !geom });
      updateCanvasSize();
      if (!geom) select([n.id]);
    }
    SP.store.save();
    t.commit();
    return n;
  }

  /** Borra una nota sin aviso (lo usan el historial y las carpetas) */
  function removeNow(id, { into } = {}) {
    const idx = allNotes().findIndex((n) => n.id === id);
    if (idx < 0) return;
    allNotes().splice(idx, 1);
    unmountAnimated(id, into);
    SP.store.save();
  }

  function removeMany(ids) {
    ids = ids.filter((id) => byId(id));
    if (!ids.length) return;
    const t = tx(ids.length > 1 ? `Eliminar ${ids.length} notas` : 'Eliminar nota');
    ids.forEach((id) => removeNow(id));
    t.commit();
    const entry = t.entry;
    SP.ui.toast(ids.length > 1 ? `${ids.length} notas eliminadas` : 'Nota eliminada', {
      action: { label: 'Deshacer', fn: () => SP.history.undoEntry(entry) },
    });
  }
  const remove = (id) => removeMany([id]);

  function duplicateMany(list) {
    if (!list.length) return;
    const t = tx(list.length > 1 ? 'Duplicar notas' : 'Duplicar');
    const copies = list.map((n) => {
      const copy = JSON.parse(JSON.stringify(n));
      copy.id = SP.util.uid();
      copy.x += GRID * 2; copy.y += GRID * 2;
      copy.z = maxZ() + 1;
      copy.pinned = false;
      if (copy.data && copy.data.running) copy.data.running = false;
      allNotes().push(copy);
      mount(copy, { animate: true });
      return copy;
    });
    updateCanvasSize();
    select(copies.map((c) => c.id));
    SP.store.save();
    t.commit();
  }
  const duplicate = (n) => duplicateMany([n]);

  /* ---------- Tableros ---------- */
  function emitBoards() { document.dispatchEvent(new CustomEvent('sp:boards')); }

  function switchBoard(id) {
    if (!state().boards.some((b) => b.id === id) || id === state().board) return;
    const order = state().boards.map((b) => b.id);
    const dir = order.indexOf(id) > order.indexOf(state().board) ? 1 : -1;
    const prev = state().board;
    clearSelection();
    SP.ui.closeMenu();
    const pb = state().boards.find((b) => b.id === prev);
    if (pb) { pb.sx = boardEl.scrollLeft; pb.sy = boardEl.scrollTop; }
    state().board = id;
    const reduced = SP.util.reducedMotion();
    let i = 0;
    for (const [nid, v] of views) {
      const n = byId(nid);
      if (!n) continue;
      const el = v.el;
      el.style.setProperty('--dir', dir);
      if (n.board === prev && !reduced) {
        el.classList.add('board-out');
        setTimeout(() => { el.classList.remove('board-out'); applyFlags(el, n); }, 200);
      } else applyFlags(el, n);
      if (n.board === id && !reduced) {
        el.style.setProperty('--i', Math.min(i++, 14));
        el.classList.add('board-in');
        setTimeout(() => el.classList.remove('board-in'), 750);
      }
    }
    updateCanvasSize();
    const nb = activeBoard();
    boardEl.scrollTo(nb.sx || 0, nb.sy || 0);
    SP.store.save();
    emitBoards();
    document.dispatchEvent(new CustomEvent('sp:zoom', { detail: zoom() }));
  }

  function addBoard(name) {
    const b = { id: SP.util.uid(), name: name || 'Tablero ' + (state().boards.length + 1), zoom: 1 };
    SP.history.run('Nuevo tablero', () => { state().boards.push(b); });
    switchBoard(b.id);
    return b;
  }

  function renameBoard(id, name) {
    const b = state().boards.find((x) => x.id === id);
    if (!b || !name) return;
    SP.history.run('Renombrar tablero', () => { b.name = name; });
    SP.store.save();
    emitBoards();
  }

  async function deleteBoard(id) {
    if (state().boards.length < 2) { SP.ui.toast('Tiene que quedar al menos un tablero'); return; }
    const b = state().boards.find((x) => x.id === id);
    const count = allNotes().filter((n) => n.board === id).length;
    if (count) {
      const ok = await SP.ui.confirm(`¿Borrar "${b.name}"?`, `Se borran sus ${count} notas. Podés deshacerlo con Ctrl+Z.`, 'Borrar tablero');
      if (!ok) return;
    }
    const t = tx('Borrar tablero');
    if (state().board === id) switchBoard(state().boards.find((x) => x.id !== id).id);
    for (const n of allNotes().filter((m) => m.board === id)) {
      allNotes().splice(allNotes().indexOf(n), 1);
      unmount(n.id);
    }
    state().boards = state().boards.filter((x) => x.id !== id);
    SP.store.save();
    t.commit();
    emitBoards();
  }

  function moveBoard(id, delta) {
    const arr = state().boards;
    const i = arr.findIndex((b) => b.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= arr.length) return;
    SP.history.run('Reordenar tableros', () => { [arr[i], arr[j]] = [arr[j], arr[i]]; });
    SP.store.save();
    emitBoards();
  }

  function moveToBoard(list, boardId) {
    SP.history.run('Mover a otro tablero', () => {
      list.forEach((n) => {
        n.z = allNotes().filter((m) => m.board === boardId).reduce((m, x) => Math.max(m, x.z || 0), 0) + 1;
        n.board = boardId;
        const v = views.get(n.id);
        if (!v) return;
        v.el.style.zIndex = n.z;
        if (SP.util.reducedMotion()) applyFlags(v.el, n);
        else { v.el.classList.add('pop-out'); setTimeout(() => { v.el.classList.remove('pop-out'); applyFlags(v.el, n); }, 180); }
      });
    });
    clearSelection();
    updateCanvasSize();
    SP.store.save();
    const b = state().boards.find((x) => x.id === boardId);
    SP.ui.toast(`Movida a "${b.name}"`, { action: { label: 'Ir', fn: () => switchBoard(boardId) } });
  }

  /* ---------- Candado ---------- */
  function setLocked(on, { silent = false } = {}) {
    state().locked = !!on;
    document.documentElement.classList.toggle('locked', !!on);
    const btn = document.getElementById('btn-lock');
    if (btn) {
      btn.innerHTML = SP.icon(on ? 'lock' : 'unlock', 18);
      btn.classList.toggle('active', !!on);
      btn.title = on ? 'Desbloquear posiciones (L)' : 'Bloquear posiciones (L)';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    const addBtn = document.getElementById('btn-add');
    if (addBtn) addBtn.disabled = !!on;
    SP.ui.closeMenu();
    renderSelBar();
    SP.store.save();
    if (!silent) SP.ui.toast(on ? 'Tablero bloqueado: nada se mueve' : 'Tablero desbloqueado');
  }

  /* ---------- Gestos: Ctrl + rueda y pellizco (táctil) para el zoom ---------- */
  function setupGestures() {
    boardEl.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX, e.clientY);
    }, { passive: false });

    const touches = new Map();
    let pinch = null;
    boardEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        const [a, b] = [...touches.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: zoom() };
      }
    });
    boardEl.addEventListener('pointermove', (e) => {
      if (!touches.has(e.pointerId)) return;
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        setZoom(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    });
    const up = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    boardEl.addEventListener('pointerup', up);
    boardEl.addEventListener('pointercancel', up);
  }

  function init() {
    boardEl = document.getElementById('board');
    stage = document.getElementById('stage');
    canvas = document.getElementById('canvas');
    renderAll({ entrance: true });
    const nb = activeBoard();
    if (nb.sx || nb.sy) boardEl.scrollTo(nb.sx || 0, nb.sy || 0);
    boardEl.addEventListener('pointerdown', startMarquee);
    setupGestures();
    window.addEventListener('resize', SP.util.debounce(updateCanvasSize, 150));
    boardEl.addEventListener('scroll', SP.util.debounce(() => {
      const b = activeBoard(); b.sx = boardEl.scrollLeft; b.sy = boardEl.scrollTop; SP.store.save();
    }, 400), { passive: true });
  }

  SP.widgets = widgets;
  SP.board = {
    register, init, renderAll, add, remove, removeMany, removeNow, duplicate, duplicateMany,
    bringToFront, sendToBack, setLocked, byId, views, updateCanvasSize, GRID,
    notes, allNotes, select, clearSelection, selected, selectedNotes, handleKey,
    mountNote, unmountAnimated, refreshNote, afterHistory, focusNote, flash,
    switchBoard, addBoard, renameBoard, deleteBoard, moveBoard, moveToBoard, activeBoard,
    setZoom, zoomBy, zoomFit, zoom, arrange, toggleCollapse, togglePin, findSpot, toCanvas,
    openNoteMenu, renderBody,
  };
})(window.SP);
