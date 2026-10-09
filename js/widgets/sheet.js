/* ==========================================================================
   Startpage · Mini planilla (tipo Excel)
   - Celdas editables, fila de totales (Σ) automática.
   - Fórmulas: =A1+B2*3, =SUMA(A1:A5), =PROMEDIO(...), MIN, MAX, CONTAR,
     REDONDEAR(x; d), ABS. También en inglés (SUM, AVERAGE, COUNT, ROUND).
   - Sin eval(): parser propio, con detección de referencias circulares.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, fmtNumber } = SP.util;

  const MAX_COLS = 12;
  const MAX_ROWS = 60;
  const colName = (i) => String.fromCharCode(65 + i);
  const parseRef = (ref) => {
    const m = /^([A-Z])(\d+)$/.exec(ref);
    return m ? { c: m[1].charCodeAt(0) - 65, r: parseInt(m[2], 10) - 1 } : null;
  };

  /** Convierte texto a número aceptando "1.234,5", "1,5", "1234.5", "$ 300", "15%" */
  function parseNum(raw) {
    let s = String(raw).trim();
    const pct = /%$/.test(s);
    s = s.replace(/[\s$€£%]/g, '');
    if (!s) return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
    else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
    if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
    const n = parseFloat(s);
    return pct ? n / 100 : n;
  }

  const Err = (code) => ({ err: code });
  const isErr = (v) => v && typeof v === 'object' && 'err' in v;

  function tokenize(src) {
    const toks = [];
    const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]\d+)(?![A-Za-z(])|([A-Za-z_][A-Za-z_]*)|(\S))/g;
    let m;
    while ((m = re.exec(src)) && m[0].length) {
      if (m[1]) toks.push({ t: 'num', n: parseFloat(m[1]) });
      else if (m[2]) toks.push({ t: 'ref', v: m[2].toUpperCase() });
      else if (m[3]) toks.push({ t: 'fn', v: m[3].toUpperCase() });
      else if (m[4]) toks.push({ t: 'op', v: m[4] });
      if (re.lastIndex >= src.length) break;
    }
    return toks;
  }

  const FUNCS = {
    SUM: (xs) => xs.reduce((a, b) => a + b, 0),
    AVERAGE: (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Err('#DIV/0')),
    MIN: (xs) => (xs.length ? Math.min(...xs) : 0),
    MAX: (xs) => (xs.length ? Math.max(...xs) : 0),
    COUNT: (xs) => xs.length,
    ROUND: (xs) => { const f = Math.pow(10, xs[1] || 0); return Math.round(xs[0] * f) / f; },
    ABS: (xs) => Math.abs(xs[0] || 0),
  };
  const ALIASES = { SUMA: 'SUM', PROMEDIO: 'AVERAGE', AVG: 'AVERAGE', CONTAR: 'COUNT', REDONDEAR: 'ROUND' };

  /** Motor de cálculo con caché por pasada */
  function makeEngine(data) {
    const cache = new Map();
    const stack = new Set();

    function num(v) {
      if (v == null || v === '') return 0;
      if (typeof v === 'number') return v;
      if (isErr(v)) throw v;
      const n = parseNum(v);
      if (n == null) throw Err('#VALOR');
      return n;
    }

    function valueOf(ref) {
      if (cache.has(ref)) return cache.get(ref);
      if (stack.has(ref)) throw Err('#CIRC');
      const raw = data.cells[ref];
      let v;
      if (raw == null || raw === '') v = null;
      else if (raw[0] === '=') {
        stack.add(ref);
        try { v = evalFormula(raw.slice(1)); } catch (e) { v = isErr(e) ? e : Err('#ERR'); }
        stack.delete(ref);
      } else {
        const n = parseNum(raw);
        v = n == null ? raw : n;
      }
      cache.set(ref, v);
      return v;
    }

    function rangeVals(a, b) {
      const A = parseRef(a); const B = parseRef(b);
      if (!A || !B) throw Err('#REF');
      const out = [];
      for (let r = Math.min(A.r, B.r); r <= Math.max(A.r, B.r); r++) {
        for (let c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++) out.push(valueOf(colName(c) + (r + 1)));
      }
      return out;
    }

    function evalFormula(src) {
      const toks = tokenize(src);
      let i = 0;
      const peek = () => toks[i];
      const next = () => toks[i++];
      const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
      const expect = (v) => { if (!isOp(v)) throw Err('#ERR'); i++; };

      function expr() {
        let v = term();
        while (isOp('+') || isOp('-')) {
          const op = next().v; const r = term();
          v = op === '+' ? num(v) + num(r) : num(v) - num(r);
        }
        return v;
      }
      function term() {
        let v = unary();
        while (isOp('*') || isOp('/')) {
          const op = next().v; const r = unary();
          if (op === '/') { if (num(r) === 0) throw Err('#DIV/0'); v = num(v) / num(r); } else v = num(v) * num(r);
        }
        return v;
      }
      function unary() {
        if (isOp('-')) { next(); return -num(unary()); }
        if (isOp('+')) { next(); return unary(); }
        const b = primary();
        if (isOp('^')) { next(); return Math.pow(num(b), num(unary())); }
        if (isOp('%')) { next(); return num(b) / 100; }
        return b;
      }
      function primary() {
        const t = next();
        if (!t) throw Err('#ERR');
        if (t.t === 'num') return t.n;
        if (t.t === 'ref') { const v = valueOf(t.v); if (isErr(v)) throw v; return v; }
        if (t.t === 'fn') {
          const name = ALIASES[t.v] || t.v;
          const fn = FUNCS[name];
          if (!fn) throw Err('#NOMBRE');
          expect('(');
          const args = [];
          if (!isOp(')')) {
            do { args.push(arg()); } while ((isOp(',') || isOp(';')) && next());
          }
          expect(')');
          const flat = [];
          for (const a of args) {
            if (a && a.range) {
              for (const v of a.range) {
                if (isErr(v)) throw v;
                if (typeof v === 'number') flat.push(v);
              }
            } else flat.push(num(a));
          }
          const res = fn(flat);
          if (isErr(res)) throw res;
          return res;
        }
        if (t.t === 'op' && t.v === '(') { const v = expr(); expect(')'); return v; }
        throw Err('#ERR');
      }
      function arg() {
        const t = peek(); const t2 = toks[i + 1];
        if (t && t.t === 'ref' && t2 && t2.t === 'op' && t2.v === ':') {
          next(); next();
          const b = next();
          if (!b || b.t !== 'ref') throw Err('#REF');
          return { range: rangeVals(t.v, b.v) };
        }
        return expr();
      }

      if (!toks.length) throw Err('#ERR');
      const v = expr();
      if (i < toks.length) throw Err('#ERR');
      return v;
    }

    return { valueOf };
  }

  function display(v) {
    if (v == null) return '';
    if (isErr(v)) return v.err;
    if (typeof v === 'number') return Number.isFinite(v) ? fmtNumber(v) : '#NUM';
    return String(v);
  }

  /* ---------- Widget ---------- */
  SP.board.register('sheet', {
    label: 'Planilla',
    icon: 'table',
    size: [400, 270],
    min: [240, 160],
    color: 'mint',
    create: (o) => ({ rows: o.rows || 6, cols: o.cols || 3, cells: o.cells || {}, totals: o.totals !== false }),
    render(body, n, ctx) {
      const d = n.data;
      let active = null; // ref de la celda con foco
      const inputs = {};

      const fx = h('input', { class: 'sheet-fx-input', placeholder: 'Escribí un valor o =SUMA(B1:B5)', spellcheck: 'false' });
      const fxRef = h('span', { class: 'sheet-fx-ref', text: '—' });

      const table = h('table', { class: 'sheet-table' });
      const scroll = h('div', { class: 'sheet-scroll no-drag' }, table);

      function recompute() {
        const eng = makeEngine(d);
        for (const [ref, inp] of Object.entries(inputs)) {
          const v = eng.valueOf(ref);
          inp.parentElement.classList.toggle('num', typeof v === 'number');
          inp.parentElement.classList.toggle('err', isErr(v));
          inp.parentElement.classList.toggle('formula', (d.cells[ref] || '')[0] === '=');
          if (ref !== active) inp.value = display(v);
        }
        if (d.totals) {
          table.querySelectorAll('tfoot td').forEach((td, c) => {
            let sum = 0; let any = false;
            for (let r = 0; r < d.rows; r++) {
              const v = eng.valueOf(colName(c) + (r + 1));
              if (typeof v === 'number' && Number.isFinite(v)) { sum += v; any = true; }
            }
            td.textContent = any ? fmtNumber(sum) : (c === 0 ? 'Total' : '');
            td.classList.toggle('num', any);
          });
        }
      }

      function focusCell(c, r) {
        const inp = inputs[colName(c) + (r + 1)];
        if (inp) inp.focus();
      }

      function build() {
        for (const k of Object.keys(inputs)) delete inputs[k];
        const thead = h('thead', null, h('tr', null, h('th', { class: 'corner' }),
          Array.from({ length: d.cols }, (_, c) => h('th', { text: colName(c) }))));
        const tbody = h('tbody');
        for (let r = 0; r < d.rows; r++) {
          const tr = h('tr', null, h('th', { text: String(r + 1) }));
          for (let c = 0; c < d.cols; c++) {
            const ref = colName(c) + (r + 1);
            const inp = h('input', { class: 'cell', spellcheck: 'false', autocomplete: 'off', dataset: { ref } });
            inputs[ref] = inp;
            inp.addEventListener('focus', () => {
              active = ref;
              inp.value = d.cells[ref] || '';
              fxRef.textContent = ref;
              fx.value = inp.value;
              inp.select();
            });
            inp.addEventListener('blur', () => {
              if (active === ref) active = null;
              recompute();
            });
            inp.addEventListener('input', () => {
              if (inp.value === '') delete d.cells[ref]; else d.cells[ref] = inp.value;
              fx.value = inp.value;
              ctx.save();
              recompute();
            });
            inp.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (r + 1 < d.rows) focusCell(c, r + 1); else if (e.key === 'Enter') inp.blur();
              }
              else if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(c, Math.max(0, r - 1)); }
              else if (e.key === 'Escape') inp.blur();
            });
            tr.append(h('td', null, inp));
          }
          tbody.append(tr);
        }
        table.replaceChildren(thead, tbody);
        if (d.totals) {
          table.append(h('tfoot', null, h('tr', null, h('th', { text: 'Σ', title: 'Totales por columna' }),
            Array.from({ length: d.cols }, () => h('td')))));
        }
        recompute();
      }

      fx.addEventListener('input', () => {
        if (!active) return;
        if (fx.value === '') delete d.cells[active]; else d.cells[active] = fx.value;
        inputs[active].value = fx.value;
        ctx.save();
        recompute();
      });
      fx.addEventListener('keydown', (e) => { if (e.key === 'Enter' && active) inputs[active].focus(); });
      // Mantener la celda activa al hacer clic en la barra de fórmula
      fx.addEventListener('pointerdown', () => {
        const keep = active;
        setTimeout(() => { active = keep; }, 0);
      });
      fx.addEventListener('blur', () => {
        setTimeout(() => {
          if (!active || document.activeElement !== inputs[active]) { active = null; recompute(); }
        }, 0);
      });

      const btn = (icon, label, fn, cls = '') => h('button', { class: 'sheet-btn ' + cls, type: 'button', title: label, 'aria-label': label, onclick: fn }, icon);
      const bar = h('div', { class: 'sheet-bar' },
        btn('+ Fila', 'Agregar fila', () => { if (d.rows < MAX_ROWS) { d.rows++; ctx.save(); build(); } }),
        btn('− Fila', 'Quitar última fila', () => {
          if (d.rows <= 1) return;
          for (let c = 0; c < d.cols; c++) delete d.cells[colName(c) + d.rows];
          d.rows--; ctx.save(); build();
        }),
        btn('+ Col', 'Agregar columna', () => { if (d.cols < MAX_COLS) { d.cols++; ctx.save(); build(); } }),
        btn('− Col', 'Quitar última columna', () => {
          if (d.cols <= 1) return;
          for (let r = 1; r <= d.rows; r++) delete d.cells[colName(d.cols - 1) + r];
          d.cols--; ctx.save(); build();
        }),
        h('span', { class: 'spacer' }),
        btn('Σ', d.totals ? 'Ocultar totales' : 'Mostrar totales', (e) => {
          d.totals = !d.totals; ctx.save(); build();
          e.currentTarget.classList.toggle('on', d.totals);
        }, d.totals ? 'on' : ''));

      body.classList.add('sheet');
      body.append(h('div', { class: 'sheet-fx' }, fxRef, h('span', { class: 'sheet-fx-label', text: 'fx' }), fx), scroll, bar);
      build();
    },
  });

  SP.sheet = { parseNum, makeEngine, display };
})(window.SP);
