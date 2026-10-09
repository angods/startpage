/* ==========================================================================
   Startpage · Deshacer / rehacer
   Cada acción guarda una "foto" de las notas antes y después. Al deshacer
   solo se restauran los campos que esa acción cambió: si después escribiste
   en una nota, ese texto no se pierde.
     const tx = SP.history.begin('Mover');  … cambios …  tx.commit();
   ========================================================================== */
(function (SP) {
  'use strict';

  const LIMIT = 120;
  const undoStack = [];
  const redoStack = [];
  let open = null; // transacción en curso (las anidadas se suman a esta)

  const S = () => SP.store.state;

  function snapshot() {
    const m = new Map();
    for (const n of S().notes) m.set(n.id, JSON.stringify(n));
    m.set('__boards', JSON.stringify({ boards: S().boards, board: S().board }));
    return m;
  }

  function diff(before, after) {
    const changes = [];
    const ids = new Set([...before.keys(), ...after.keys()]);
    for (const id of ids) {
      const b = before.get(id); const a = after.get(id);
      if (b !== a) changes.push({ id, before: b ?? null, after: a ?? null });
    }
    return changes;
  }

  /**
   * Abre una transacción. opts.merge: las acciones seguidas con la misma
   * clave (p. ej. mover con flechas o arrastrar el selector de color) se
   * juntan en un solo paso de deshacer.
   */
  function begin(label, opts = {}) {
    // Seguridad: una transacción que quedó abierta (p. ej. un diálogo
    // abandonado) se cierra sola para no trabar el historial
    if (open && Date.now() - open.started > 120000) { open.depth = 1; open.commit(); }
    if (open) { open.depth++; return open; }
    const last = undoStack[undoStack.length - 1];
    const merging = opts.merge && last && last.merge === opts.merge && Date.now() - last.at < 1500 && !redoStack.length;
    const tx = {
      label, depth: 1, before: merging ? last.beforeSnap : snapshot(), entry: null, started: Date.now(),
      commit() {
        if (--tx.depth > 0) return;
        open = null;
        const changes = diff(tx.before, snapshot());
        if (merging) undoStack.pop();
        if (!changes.length) { emit(); return; }
        if (undoStack.length) delete undoStack[undoStack.length - 1].beforeSnap; // solo la última la guarda
        tx.entry = { label, changes, merge: opts.merge || null, at: Date.now(), beforeSnap: opts.merge ? tx.before : null };
        undoStack.push(tx.entry);
        if (undoStack.length > LIMIT) undoStack.shift();
        redoStack.length = 0;
        emit();
      },
      cancel() { if (--tx.depth <= 0) open = null; },
    };
    open = tx;
    return tx;
  }

  /** Atajo: ejecuta fn dentro de una transacción (si fn es async, espera) */
  function run(label, fn, opts) {
    const tx = begin(label, opts);
    let r;
    try { r = fn(); } catch (e) { tx.commit(); throw e; }
    if (r && typeof r.then === 'function') return r.finally(() => tx.commit());
    tx.commit();
    return r;
  }

  /** Deshace solo si `entry` sigue siendo lo último (botón "Deshacer" de los avisos) */
  function undoEntry(entry) {
    if (entry && undoStack[undoStack.length - 1] === entry) undo();
    else SP.ui.toast('Usá Ctrl+Z para deshacer');
  }

  /* Campos de primer nivel que difieren entre dos versiones de una nota */
  function changedKeys(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  }

  /** Aplica una entrada en un sentido ('before' = deshacer, 'after' = rehacer) */
  function apply(entry, dir) {
    const other = dir === 'before' ? 'after' : 'before';
    const notes = S().notes;
    const touched = [];
    for (const ch of entry.changes) {
      const target = ch[dir] ? JSON.parse(ch[dir]) : null;
      const from = ch[other] ? JSON.parse(ch[other]) : null;
      if (ch.id === '__boards') {
        // Tableros: se restauran completos, pero sin mover de tablero
        // si el que estaba visible sigue existiendo
        S().boards = target.boards;
        if (!S().boards.some((b) => b.id === S().board)) S().board = target.board;
        continue;
      }
      const idx = notes.findIndex((n) => n.id === ch.id);
      if (!target) { // la nota no existía: se quita
        if (idx >= 0) { notes.splice(idx, 1); SP.board.unmountAnimated(ch.id); }
        continue;
      }
      if (idx < 0) { // la nota no existe ahora: vuelve
        notes.push(target);
        SP.board.mountNote(target, true);
        touched.push(target.id);
        continue;
      }
      const cur = notes[idx];
      const keys = from ? changedKeys(from, target) : Object.keys(target);
      for (const k of keys) {
        if (k in target) cur[k] = JSON.parse(JSON.stringify(target[k]));
        else delete cur[k];
      }
      SP.board.refreshNote(cur, keys);
      touched.push(cur.id);
    }
    SP.board.afterHistory(touched);
    SP.store.save();
  }

  function undo() {
    const e = undoStack.pop();
    if (!e) { SP.ui.toast('Nada para deshacer'); return; }
    apply(e, 'before');
    redoStack.push(e);
    SP.ui.toast('Deshecho: ' + e.label, { ms: 1600 });
    emit();
  }

  function redo() {
    const e = redoStack.pop();
    if (!e) { SP.ui.toast('Nada para rehacer'); return; }
    apply(e, 'after');
    undoStack.push(e);
    SP.ui.toast('Rehecho: ' + e.label, { ms: 1600 });
    emit();
  }

  function clear() { undoStack.length = 0; redoStack.length = 0; emit(); }

  function emit() {
    document.dispatchEvent(new CustomEvent('sp:history', { detail: { undo: undoStack.length, redo: redoStack.length } }));
  }

  SP.history = {
    begin, run, undo, redo, clear, undoEntry,
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
  };
})(window.SP);
