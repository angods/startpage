/* ==========================================================================
   Startpage · Tablero
   Monta cada nota en el lienzo, maneja arrastre, redimensión, orden de
   apilado (z-index), colores, menú contextual y el candado.
   Los tipos de nota se registran con SP.board.register(tipo, definición).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, clamp } = SP.util;

  const GRID = 10;
  const widgets = {};
  const views = new Map(); // id -> { el, body, cleanup, ctx }
  let canvas = null;

  const state = () => SP.store.state;
  const notes = () => state().notes;
  const byId = (id) => notes().find((n) => n.id === id);
  const snap = (v) => (state().snap ? Math.round(v / GRID) * GRID : Math.round(v));

  /**
   * Registra un tipo de nota.
   * def = { label, icon, size:[w,h], min:[w,h], color, headless?, create(opts)->data,
   *         render(body, note, ctx) -> cleanup?, menu?(note, ctx) -> [{icon,label,fn}] }
   */
  function register(type, def) { widgets[type] = def; }

  /* ---------- Geometría y color ---------- */
  function applyGeom(el, n) {
    el.style.transform = `translate(${n.x}px, ${n.y}px)`;
    el.style.width = n.w + 'px';
    el.style.height = n.h + 'px';
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

  function updateCanvasSize() {
    if (!canvas) return;
    let w = 0; let hgt = 0;
    for (const n of notes()) { w = Math.max(w, n.x + n.w); hgt = Math.max(hgt, n.y + n.h); }
    canvas.style.width = Math.max(w + 40, innerWidth) + 'px';
    canvas.style.height = Math.max(hgt + 40, innerHeight) + 'px';
  }

  /* ---------- Arrastrar ---------- */
  const INTERACTIVE = 'button, input, textarea, select, iframe, [contenteditable="true"], .no-drag';

  function startDrag(e, n, el) {
    if (e.button !== 0 || state().locked) return;
    if (e.target.closest(INTERACTIVE)) return;
    e.preventDefault();
    const sx = e.clientX; const sy = e.clientY; const ox = n.x; const oy = n.y;
    let moved = false;

    const move = (ev) => {
      const dx = ev.clientX - sx; const dy = ev.clientY - sy;
      if (!moved) {
        if (Math.hypot(dx, dy) < 4) return;
        moved = true;
        el.classList.add('dragging');
        document.body.classList.add('is-dragging');
      }
      n.x = Math.max(0, snap(ox + dx));
      n.y = Math.max(0, snap(oy + dy));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; applyGeom(el, n); });
    };
    let raf = 0;
    const end = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; applyGeom(el, n); }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      if (moved) {
        el.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        el._justDragged = true;
        setTimeout(() => { el._justDragged = false; }, 0);
        updateCanvasSize();
        SP.store.save();
      }
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
    const sx = e.clientX; const sy = e.clientY; const ow = n.w; const oh = n.h;
    const [minW, minH] = W.min || [120, 80];
    document.body.classList.add('is-dragging', 'is-resizing');
    el.classList.add('resizing');
    const move = (ev) => {
      n.w = Math.max(minW, snap(ow + ev.clientX - sx));
      n.h = Math.max(minH, snap(oh + ev.clientY - sy));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; applyGeom(el, n); });
    };
    let raf = 0;
    const end = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; applyGeom(el, n); }
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.body.classList.remove('is-dragging', 'is-resizing');
      el.classList.remove('resizing');
      updateCanvasSize();
      SP.store.save();
      const v = views.get(n.id);
      if (v && v.ctx.onResize) v.ctx.onResize();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  /* ---------- Menú de la nota ---------- */
  function openNoteMenu(anchor, n) {
    const W = widgets[n.type];
    const v = views.get(n.id);

    const swatches = h('div', { class: 'swatches' },
      SP.theme.NOTE_COLORS.map((c) => h('button', {
        type: 'button',
        class: 'swatch c-' + c.id + (n.color === c.id ? ' active' : ''),
        title: c.label, 'aria-label': c.label,
        onclick: (e) => {
          n.color = c.id;
          applyColor(v.el, n);
          SP.store.save();
          e.currentTarget.parentElement.querySelectorAll('.swatch').forEach((s) => s.classList.remove('active'));
          e.currentTarget.classList.add('active');
        },
      })),
      h('label', { class: 'swatch custom' + (n.color && n.color[0] === '#' ? ' active' : ''), title: 'Color personalizado' },
        h('span', { html: SP.icon('drop', 14) }),
        h('input', {
          type: 'color',
          value: n.color && n.color[0] === '#' ? n.color : '#ffd36e',
          oninput: (e) => { n.color = e.target.value; applyColor(v.el, n); SP.store.save(); },
        })));

    const extra = W.menu ? W.menu(n, v.ctx) : [];
    const items = [
      h('div', { class: 'menu-label', text: 'Color de la nota' }),
      swatches,
      extra.length ? h('div', { class: 'menu-sep' }) : null,
      extra.map((it) => SP.ui.menuItem(it.icon, it.label, it.fn, it)),
      h('div', { class: 'menu-sep' }),
      SP.ui.menuItem('font', 'Fuente: ' + (n.font ? SP.fonts.name(n.font) : 'la del tablero'), () => {
        SP.fonts.pick(anchor, n.font || null, (id) => {
          n.font = id || null;
          applyFont(v.el, n);
          SP.store.save();
        }, { inherit: true });
      }, { keepOpen: true }),
      SP.ui.menuItem('front', 'Traer al frente', () => bringToFront(n)),
      SP.ui.menuItem('back', 'Enviar atrás', () => sendToBack(n)),
      SP.ui.menuItem('copy', 'Duplicar', () => duplicate(n)),
      SP.ui.menuItem('trash', 'Eliminar', () => remove(n.id), { danger: true }),
    ];
    SP.ui.menu(anchor, items);
  }

  /* ---------- Montaje ---------- */
  function mount(n, { animate = false } = {}) {
    const W = widgets[n.type];
    if (!W) return;
    const el = h('div', { class: 'note' + (W.headless ? ' headless' : ''), dataset: { id: n.id, type: n.type } });
    applyGeom(el, n);
    applyColor(el, n);
    applyFont(el, n);

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
        h('div', { class: 'note-actions' }, menuBtn));
      head.addEventListener('pointerdown', (e) => startDrag(e, n, el));
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

    // Cualquier interacción la trae al frente
    el.addEventListener('pointerdown', () => bringToFront(n), true);

    const view = { el, body, cleanup: null, ctx: null };
    const ctx = {
      note: n,
      el,
      body,
      save: () => SP.store.save(),
      rerender: () => renderBody(n),
      setTitle: (t) => { n.title = t; if (titleEl) titleEl.textContent = t || W.label; SP.store.save(); },
      onResize: null,
    };
    view.ctx = ctx;
    views.set(n.id, view);
    canvas.append(el);
    renderBody(n);
    if (animate) {
      el.classList.add('pop-in');
      setTimeout(() => el.classList.remove('pop-in'), 450);
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
    v.cleanup = W.render(v.body, n, v.ctx) || null;
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
        n.title = t && t !== W.label ? t : null;
        SP.store.save();
      }
      titleEl.textContent = n.title || W.label;
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
  }

  function renderAll() {
    for (const id of [...views.keys()]) unmount(id);
    notes().forEach((n) => mount(n));
    updateCanvasSize();
  }

  /* ---------- Crear / eliminar / duplicar ---------- */
  function overlaps(a, b, pad = 12) {
    return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
  }

  function findSpot(w, hgt) {
    const board = document.getElementById('board');
    const x0 = board.scrollLeft + 24; const y0 = board.scrollTop + 80;
    const x1 = board.scrollLeft + board.clientWidth - w - 24;
    const y1 = board.scrollTop + board.clientHeight - hgt - 24;
    for (let y = y0; y <= y1; y += 20) {
      for (let x = x0; x <= x1; x += 20) {
        const r = { x, y, w, h: hgt };
        if (!notes().some((n) => overlaps(r, n))) return { x: snap(x), y: snap(y) };
      }
    }
    // Sin lugar libre: en cascada desde el centro
    const k = notes().length % 8;
    return {
      x: snap(Math.max(20, board.scrollLeft + (board.clientWidth - w) / 2 + k * 24)),
      y: snap(Math.max(70, board.scrollTop + (board.clientHeight - hgt) / 2 + k * 24)),
    };
  }

  function add(type, opts = {}, geom = null) {
    const W = widgets[type];
    if (!W) throw new Error('Tipo de nota desconocido: ' + type);
    const [w, hgt] = geom && geom.w ? [geom.w, geom.h] : W.size;
    const pos = geom && geom.x != null ? { x: geom.x, y: geom.y } : findSpot(w, hgt);
    const n = {
      id: SP.util.uid(),
      type,
      x: pos.x, y: pos.y, w, h: hgt,
      z: maxZ() + 1,
      color: opts.color || W.color || 'yellow',
      title: opts.title || null,
      data: W.create ? W.create(opts) : {},
    };
    notes().push(n);
    if (canvas) { mount(n, { animate: !geom }); updateCanvasSize(); }
    SP.store.save();
    return n;
  }

  function remove(id) {
    const idx = notes().findIndex((n) => n.id === id);
    if (idx < 0) return;
    const [n] = notes().splice(idx, 1);
    const v = views.get(id);
    if (v) {
      v.el.classList.add('pop-out');
      setTimeout(() => unmount(id), 180);
    }
    SP.store.save();
    SP.ui.toast('Nota eliminada', {
      action: {
        label: 'Deshacer',
        fn: () => {
          notes().splice(Math.min(idx, notes().length), 0, n);
          mount(n, { animate: true });
          updateCanvasSize();
          SP.store.save();
        },
      },
    });
  }

  function duplicate(n) {
    const copy = JSON.parse(JSON.stringify(n));
    copy.id = SP.util.uid();
    copy.x += 30; copy.y += 30;
    copy.z = maxZ() + 1;
    if (copy.data && copy.data.running) copy.data.running = false;
    notes().push(copy);
    mount(copy, { animate: true });
    updateCanvasSize();
    SP.store.save();
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
    const add = document.getElementById('btn-add');
    if (add) add.disabled = !!on;
    SP.ui.closeMenu();
    SP.store.save();
    if (!silent) SP.ui.toast(on ? 'Tablero bloqueado: nada se mueve' : 'Tablero desbloqueado');
  }

  function init() {
    canvas = document.getElementById('canvas');
    renderAll();
    window.addEventListener('resize', SP.util.debounce(updateCanvasSize, 150));
  }

  SP.widgets = widgets;
  SP.board = {
    register, init, renderAll, add, remove, duplicate, bringToFront, sendToBack,
    setLocked, byId, views, updateCanvasSize, GRID,
  };
})(window.SP);
