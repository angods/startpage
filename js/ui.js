/* ==========================================================================
   Startpage · UI genérica: avisos (toast), menús flotantes y diálogos
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  /* ---------- Toast ---------- */
  function toast(msg, opts = {}) {
    if (typeof opts === 'number') opts = { ms: opts };
    const ms = opts.ms || (opts.action ? 5000 : 2600);
    const box = document.getElementById('toasts');
    const t = h('div', { class: 'toast glass' }, h('span', { text: msg }));
    const hide = () => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    };
    if (opts.action) {
      t.append(h('button', {
        class: 'toast-action', type: 'button', text: opts.action.label,
        onclick: () => { opts.action.fn(); hide(); },
      }));
    }
    box.append(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(hide, ms);
  }

  /* ---------- Menú flotante anclado a un botón ---------- */
  let openMenu = null;
  function closeMenu() {
    if (openMenu) { openMenu.close(); openMenu = null; }
  }
  function menu(anchor, content, { align = 'end' } = {}) {
    closeMenu();
    const pop = h('div', { class: 'popover glass', role: 'menu' }, content);
    document.body.append(pop);
    const r = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    let left = align === 'end' ? r.right - pr.width : r.left;
    let top = r.bottom + 8;
    if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 8);
    left = SP.util.clamp(left, 8, innerWidth - pr.width - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    requestAnimationFrame(() => pop.classList.add('show'));

    const onDown = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) closeMenu(); };
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    setTimeout(() => {
      document.addEventListener('pointerdown', onDown, true);
      document.addEventListener('keydown', onKey);
    });
    const handle = {
      el: pop,
      close() {
        document.removeEventListener('pointerdown', onDown, true);
        document.removeEventListener('keydown', onKey);
        pop.remove();
      },
    };
    openMenu = handle;
    return handle;
  }

  function menuItem(icon, label, onClick, opts = {}) {
    return h('button', {
      class: 'menu-item' + (opts.danger ? ' danger' : '') + (opts.active ? ' active' : ''),
      type: 'button',
      onclick: (e) => { e.stopPropagation(); if (!opts.keepOpen) closeMenu(); onClick(e); },
    }, h('span', { class: 'mi-ico', html: SP.icon(icon, 16) }), h('span', { text: label }));
  }

  /* ---------- Diálogo modal con campos ---------- */
  function modal({ title, fields = [], submitText = 'Guardar', cancelText = 'Cancelar', danger = false, message }) {
    return new Promise((resolve) => {
      const inputs = {};
      const fieldEls = fields.map((f) => {
        let input;
        if (f.type === 'select') {
          input = h('select', { name: f.name }, f.options.map((o) => h('option', { value: o.value, text: o.label })));
          input.value = f.value ?? f.options[0].value;
        } else {
          input = h('input', {
            name: f.name, type: f.type || 'text', placeholder: f.placeholder || '',
            value: f.value ?? '', autocomplete: 'off', spellcheck: 'false',
            min: f.min, max: f.max, step: f.step,
          });
          if (f.required) input.required = true;
        }
        inputs[f.name] = input;
        return h('label', { class: 'field' }, h('span', { class: 'field-label', text: f.label }), input,
          f.hint ? h('small', { class: 'field-hint', text: f.hint }) : null);
      });

      const wrap = h('div', { class: 'modal-wrap' });
      const close = (val) => {
        wrap.classList.remove('show');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => wrap.remove(), 180);
        resolve(val);
      };
      const onKey = (e) => { if (e.key === 'Escape') close(null); };
      const form = h('form', {
        class: 'modal glass',
        onsubmit: (e) => {
          e.preventDefault();
          const vals = {};
          for (const [k, el] of Object.entries(inputs)) vals[k] = el.value;
          close(fields.length ? vals : true);
        },
      },
      h('h3', { class: 'modal-title', text: title }),
      message ? h('p', { class: 'modal-msg', text: message }) : null,
      fieldEls,
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn ghost', text: cancelText, onclick: () => close(null) }),
        h('button', { type: 'submit', class: 'btn ' + (danger ? 'danger' : 'primary'), text: submitText })));

      wrap.append(form);
      wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(null); });
      document.addEventListener('keydown', onKey);
      document.body.append(wrap);
      requestAnimationFrame(() => {
        wrap.classList.add('show');
        const first = form.querySelector('input,select');
        if (first) { first.focus(); if (first.select) first.select(); }
        else form.querySelector('button[type=submit]').focus();
      });
    });
  }

  function confirm(title, message, submitText = 'Confirmar') {
    return modal({ title, message, submitText, danger: true });
  }

  SP.ui = { toast, menu, menuItem, closeMenu, modal, confirm };
})(window.SP);
