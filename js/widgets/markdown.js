/* ==========================================================================
   Startpage · Nota Markdown
   Parser mínimo y seguro (escapa todo el HTML): títulos, negrita, cursiva,
   tachado, código, citas, listas, tareas [ ] clickeables, enlaces y líneas.
   Doble clic para editar; Esc o clic afuera para ver el resultado.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, escapeHtml: esc } = SP.util;

  function inline(s) {
    // Se trabaja sobre texto ya escapado
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
      .replace(/(^|[\s(])_([^_\s][^_]*)_/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => '<code>' + codes[i] + '</code>');
  }

  /** Markdown → HTML. Cada tarea lleva data-line para poder marcarla */
  function render(md) {
    const lines = esc(md).split('\n');
    const out = [];
    let list = null; // 'ul' | 'ol'
    let inCode = false; let code = [];
    const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
    lines.forEach((line, i) => {
      if (/^```/.test(line)) {
        if (inCode) { out.push('<pre><code>' + code.join('\n') + '</code></pre>'); code = []; inCode = false; } else { closeList(); inCode = true; }
        return;
      }
      if (inCode) { code.push(line); return; }
      let m;
      if ((m = /^(#{1,4})\s+(.*)$/.exec(line))) { closeList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); return; }
      if (/^\s*(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) { closeList(); out.push('<hr>'); return; }
      if ((m = /^&gt;\s?(.*)$/.exec(line))) { closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); return; }
      if ((m = /^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/.exec(line))) {
        if (list !== 'ul') { closeList(); out.push('<ul class="md-tasks">'); list = 'ul'; }
        const done = m[1] !== ' ';
        out.push(`<li class="md-task${done ? ' done' : ''}"><button type="button" class="md-check" data-line="${i}" aria-pressed="${done}" aria-label="Marcar tarea"></button><span>${inline(m[2])}</span></li>`);
        return;
      }
      if ((m = /^\s*[-*+]\s+(.*)$/.exec(line))) {
        if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
        out.push(`<li>${inline(m[1])}</li>`); return;
      }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) {
        if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
        out.push(`<li>${inline(m[1])}</li>`); return;
      }
      closeList();
      if (!line.trim()) { out.push('<div class="md-gap"></div>'); return; }
      out.push(`<p>${inline(line)}</p>`);
    });
    if (inCode) out.push('<pre><code>' + code.join('\n') + '</code></pre>');
    closeList();
    return out.join('');
  }

  const SAMPLE = '# Ideas\n\n**Negrita**, _cursiva_, ~~tachado~~ y `código`.\n\n- [x] Probar Markdown\n- [ ] Hacer clic en las casillas\n\n> Doble clic para editar.';

  SP.board.register('markdown', {
    label: 'Markdown',
    icon: 'markdown',
    size: [300, 280],
    min: [160, 110],
    color: 'sand',
    create: (o) => ({ md: o.md != null ? o.md : SAMPLE }),
    text: (n) => n.data.md,
    render(body, n, ctx) {
      body.classList.add('md-body');
      const view = h('div', { class: 'md-view', tabindex: '0', title: 'Doble clic para editar' });
      const paint = () => { view.innerHTML = n.data.md.trim() ? render(n.data.md) : '<p class="md-empty">Doble clic para escribir…</p>'; };
      paint();
      view.addEventListener('click', (e) => {
        const b = e.target.closest('.md-check');
        if (!b) return;
        const i = +b.dataset.line;
        const lines = n.data.md.split('\n');
        lines[i] = lines[i].replace(/\[( |x|X)\]/, (_, c) => (c === ' ' ? '[x]' : '[ ]'));
        ctx.history('Marcar tarea', () => { n.data.md = lines.join('\n'); });
        ctx.save(); paint();
        if (!/\[ \]/.test(n.data.md) && /\[x\]/i.test(n.data.md)) SP.ui.confetti(ctx.el);
      });
      const edit = () => {
        if (SP.store.state.locked) return;
        const ta = h('textarea', { class: 'note-text md-edit', spellcheck: 'true', placeholder: '# Título\n- lista\n- [ ] tarea' });
        ta.value = n.data.md;
        ta.addEventListener('input', () => { n.data.md = ta.value; ctx.save(); });
        const finish = () => { body.replaceChildren(view); paint(); };
        ta.addEventListener('blur', finish);
        ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); ta.blur(); } });
        body.replaceChildren(ta);
        ta.focus();
      };
      view.addEventListener('dblclick', (e) => { if (!e.target.closest('a, .md-check')) edit(); });
      view.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); edit(); } });
      ctx.editMd = edit;
      body.append(view);
    },
    menu(n, ctx) {
      return [{ icon: 'edit', label: 'Editar', fn: () => setTimeout(() => ctx.editMd && ctx.editMd(), 30) }];
    },
  });

  SP.markdown = { render };
})(window.SP);
