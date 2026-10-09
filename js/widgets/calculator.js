/* ==========================================================================
   Startpage · Calculadora con skins
   Skins: Cristal, iOS, Retro (LCD), Neón, Pastel (color de la nota), Papel.
   Teclado: números, + − * /, Enter o =, Backspace, Escape, %, coma o punto.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  const SKINS = {
    glass: 'Cristal',
    ios: 'iOS oscuro',
    retro: 'Retro LCD',
    neon: 'Neón',
    pastel: 'Pastel',
    paper: 'Papel',
  };
  const OPS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  const isOp = (t) => t in OPS;

  function compute(tokens) {
    const tk = tokens.slice();
    while (tk.length && isOp(tk[tk.length - 1])) tk.pop();
    if (!tk.length) return null;
    const nums = []; const ops = [];
    for (const t of tk) { if (isOp(t)) ops.push(t); else nums.push(parseFloat(t) || 0); }
    // Primero × y ÷
    const n2 = [nums[0]]; const o2 = [];
    for (let i = 0; i < ops.length; i++) {
      const b = nums[i + 1];
      if (ops[i] === '*') n2[n2.length - 1] *= b;
      else if (ops[i] === '/') { if (b === 0) return NaN; n2[n2.length - 1] /= b; } else { o2.push(ops[i]); n2.push(b); }
    }
    let r = n2[0];
    for (let i = 0; i < o2.length; i++) r = o2[i] === '+' ? r + n2[i + 1] : r - n2[i + 1];
    return Number(r.toPrecision(12));
  }

  function fmtNum(str) {
    if (str === '' || str == null) return '';
    const neg = str[0] === '-';
    const s = neg ? str.slice(1) : str;
    const [i, dec] = s.split('.');
    const int = (i || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + int + (dec !== undefined ? ',' + dec : '');
  }
  function fmtResult(n) {
    if (n == null) return '';
    if (!Number.isFinite(n)) return 'Error';
    if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(5).replace('.', ',');
    return fmtNum(String(n));
  }
  const fmtExpr = (tokens) => tokens.map((t) => (isOp(t) ? ` ${OPS[t]} ` : fmtNum(t))).join('');

  SP.board.register('calc', {
    label: 'Calculadora',
    icon: 'calc',
    size: [250, 360],
    min: [190, 260],
    color: 'graphite',
    create: (o) => ({ skin: o.skin || 'glass', tokens: [], prev: '', done: false }),
    render(body, n, ctx) {
      const d = n.data;
      if (!Array.isArray(d.tokens)) d.tokens = [];
      ctx.el.dataset.skin = d.skin;
      body.classList.add('calc', 'skin-' + d.skin);
      body.tabIndex = 0;

      const prevEl = h('div', { class: 'calc-prev' });
      const mainEl = h('div', { class: 'calc-main' });
      const screen = h('div', { class: 'calc-screen' }, prevEl, mainEl);

      const last = () => d.tokens[d.tokens.length - 1];
      const lastIsNum = () => d.tokens.length && !isOp(last());

      function press(k) {
        const t = d.tokens;
        if (/^\d$/.test(k)) {
          if (d.done) { t.length = 0; d.done = false; }
          if (lastIsNum()) {
            const cur = last();
            if (cur.replace(/[-.]/g, '').length >= 15) return;
            t[t.length - 1] = cur === '0' ? k : cur === '-0' ? '-' + k : cur + k;
          } else t.push(k);
        } else if (k === '.') {
          if (d.done) { t.length = 0; d.done = false; }
          if (lastIsNum()) { if (!last().includes('.')) t[t.length - 1] += '.'; } else t.push('0.');
        } else if (isOp(k)) {
          d.done = false;
          if (!t.length) t.push('0');
          if (isOp(last())) t[t.length - 1] = k; else t.push(k);
        } else if (k === 'back') {
          if (d.done) { t.length = 0; d.done = false; d.prev = ''; } else if (lastIsNum()) {
            const s = last().slice(0, -1);
            if (s === '' || s === '-') t.pop(); else t[t.length - 1] = s;
          } else t.pop();
        } else if (k === 'clear') {
          t.length = 0; d.prev = ''; d.done = false;
        } else if (k === 'neg') {
          if (lastIsNum()) { const c = last(); t[t.length - 1] = c[0] === '-' ? c.slice(1) : '-' + c; d.done = false; }
        } else if (k === '%') {
          if (lastIsNum()) { t[t.length - 1] = String(Number((parseFloat(last()) / 100).toPrecision(12))); d.done = false; }
        } else if (k === '=') {
          const r = compute(t);
          if (r == null) return;
          d.prev = fmtExpr(t.filter((x, i) => !(i === t.length - 1 && isOp(x)))) + ' =';
          t.length = 0;
          if (Number.isFinite(r)) t.push(String(r));
          d.done = true;
          if (!Number.isFinite(r)) { paint('Error'); ctx.save(); return; }
        }
        ctx.save();
        paint();
      }

      function paint(forced) {
        const text = forced || (d.tokens.length ? fmtExpr(d.tokens) : '0');
        mainEl.textContent = text;
        const len = text.length;
        mainEl.dataset.size = len > 18 ? 'xs' : len > 13 ? 's' : len > 9 ? 'm' : 'l';
        if (d.done || !d.tokens.some(isOp)) prevEl.textContent = d.prev || ' ';
        else {
          const r = compute(d.tokens);
          prevEl.textContent = r == null ? ' ' : '= ' + fmtResult(r);
        }
        acBtn.textContent = d.tokens.length || d.prev ? 'C' : 'AC';
      }

      const key = (label, k, cls = '') => h('button', {
        type: 'button', class: 'calc-key ' + cls, dataset: { k },
        onclick: (e) => { press(k); e.currentTarget.blur(); body.focus({ preventScroll: true }); },
      }, label);
      const acBtn = key('AC', 'clear', 'fn');
      const keys = h('div', { class: 'calc-keys' },
        acBtn, key(h('span', { html: SP.icon('backspace', 18) }), 'back', 'fn'), key('%', '%', 'fn'), key('÷', '/', 'op'),
        key('7', '7'), key('8', '8'), key('9', '9'), key('×', '*', 'op'),
        key('4', '4'), key('5', '5'), key('6', '6'), key('−', '-', 'op'),
        key('1', '1'), key('2', '2'), key('3', '3'), key('+', '+', 'op'),
        key('±', 'neg'), key('0', '0'), key(',', '.'), key('=', '=', 'eq'));

      body.addEventListener('keydown', (e) => {
        const map = { Enter: '=', '=': '=', Backspace: 'back', Delete: 'clear', Escape: 'clear', ',': '.', '.': '.', '%': '%', '+': '+', '-': '-', '*': '*', '/': '/', x: '*', X: '*' };
        const k = /^\d$/.test(e.key) ? e.key : map[e.key];
        if (!k) return;
        e.preventDefault();
        press(k);
        const b = keys.querySelector(`[data-k="${CSS.escape(k)}"]`);
        if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 120); }
      });

      body.append(screen, keys);
      paint();
      return () => { delete ctx.el.dataset.skin; };
    },
    menu(n, ctx) {
      return Object.entries(SKINS).map(([id, label]) => ({
        icon: n.data.skin === id ? 'check' : 'sparkle',
        label: 'Skin: ' + label,
        active: n.data.skin === id,
        fn: () => { n.data.skin = id; ctx.save(); ctx.rerender(); },
      }));
    },
  });

  SP.calc = { compute, SKINS };
})(window.SP);
