/* ==========================================================================
   Startpage · Panel de ajustes
   Apariencia (tema, paleta, acento), fondo (aurora / video), tablero y datos.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  let panel = null;

  const S = () => SP.store.state;

  function segmented(options, value, onChange) {
    return h('div', { class: 'seg' }, options.map((o) => h('button', {
      type: 'button', class: 'seg-btn' + (o.value === value ? ' active' : ''),
      onclick: () => onChange(o.value),
    }, o.icon ? h('span', { html: SP.icon(o.icon, 15) }) : null, o.label)));
  }

  function toggleRow(label, checked, onChange, hint) {
    const input = h('input', { type: 'checkbox', class: 'switch-input' });
    input.checked = !!checked;
    input.addEventListener('change', () => onChange(input.checked));
    return h('label', { class: 'row toggle' },
      h('span', { class: 'row-text' }, h('span', { text: label }), hint ? h('small', { text: hint }) : null),
      input, h('span', { class: 'switch', 'aria-hidden': 'true' }));
  }

  function slider(label, value, min, max, unit, onInput) {
    const out = h('span', { class: 'slider-val', text: value + unit });
    const input = h('input', { type: 'range', min, max, value, class: 'slider' });
    input.addEventListener('input', () => { out.textContent = input.value + unit; onInput(+input.value); });
    return h('label', { class: 'row slider-row' }, h('span', { class: 'row-text', text: label }), input, out);
  }

  function section(title, ...kids) {
    return h('section', { class: 'set-section' }, h('h4', { text: title }), ...kids);
  }

  function slotIcon(info) {
    if (info.src === 'file') return '🎞️';
    const k = info.kind && info.kind !== 'auto' ? info.kind : SP.background.detectKind(info.url);
    return { youtube: '▶️', vimeo: '▶️', page: '🌐', video: '🎞️' }[k] || '🔗';
  }

  function fontButton(label, value, onPick) {
    const btn = h('button', { type: 'button', class: 'font-btn' },
      h('span', { class: 'font-btn-name', style: { fontFamily: SP.fonts.stack(value) }, text: SP.fonts.name(value) }),
      h('span', { html: SP.icon('chevron', 14) }));
    btn.addEventListener('click', () => SP.fonts.pick(btn, value, (id) => { onPick(id); render(); }));
    return h('div', { class: 'row' }, h('span', { class: 'row-text', text: label }), btn);
  }

  function videoSlot(slot, label) {
    const info = S().bg.videos[slot];
    const file = h('input', { type: 'file', accept: 'video/mp4,video/webm,video/*', hidden: true });
    file.addEventListener('change', async () => {
      if (file.files[0]) {
        SP.ui.toast('Guardando video…');
        await SP.background.setFile(slot, file.files[0]);
        render();
      }
    });
    return h('div', { class: 'slot' },
      h('div', { class: 'slot-head' },
        h('span', { class: 'slot-label', text: label }),
        h('span', { class: 'slot-name', text: info ? slotIcon(info) + ' ' + (info.name || info.url) : 'Sin fondo' })),
      h('div', { class: 'slot-actions' },
        h('button', { type: 'button', class: 'btn small', onclick: () => file.click() }, h('span', { html: SP.icon('upload', 14) }), 'Subir MP4'),
        h('button', {
          type: 'button', class: 'btn small ghost',
          onclick: async () => {
            const r = await SP.ui.modal({
              title: 'Fondo desde un enlace',
              fields: [{
                name: 'url', label: 'Enlace o ruta', required: true,
                placeholder: 'youtube.com/watch?v=…  ·  …/video.mp4  ·  assets/videos/lluvia.mp4',
                value: info && info.src === 'url' ? info.url : '',
                hint: 'Sirve un MP4/WebM, un video de YouTube o Vimeo, o una página web.',
              }, {
                name: 'kind', label: 'Tipo', type: 'select', value: (info && info.kind) || 'auto',
                options: Object.entries(SP.background.KINDS).map(([value, label]) => ({ value, label })),
              }],
            });
            if (r && r.url.trim()) { await SP.background.setUrl(slot, r.url, r.kind); render(); }
          },
        }, 'Enlace (YouTube, web…)'),
        info ? h('button', {
          type: 'button', class: 'btn small ghost danger-text',
          onclick: async () => { await SP.background.clearSlot(slot); render(); },
        }, 'Quitar') : null),
      file);
  }

  function render() {
    if (!panel) return;
    const s = S();
    const pals = SP.theme.PALETTES;
    const scrollTop = panel.querySelector('.set-scroll') ? panel.querySelector('.set-scroll').scrollTop : 0;

    const palGrid = h('div', { class: 'pal-grid' }, Object.entries(pals).map(([id, p]) => {
      const v = p[s.theme === 'light' ? 'light' : 'dark'];
      return h('button', {
        type: 'button', class: 'pal' + (s.palette === id ? ' active' : ''), title: p.name,
        onclick: () => { s.palette = id; s.accent = null; SP.store.save(); SP.theme.apply(); render(); },
      },
      h('span', {
        class: 'pal-prev',
        style: { background: `radial-gradient(circle at 25% 30%, ${v.blobs[0]}, transparent 60%), radial-gradient(circle at 75% 70%, ${v.blobs[1]}, transparent 60%), radial-gradient(circle at 70% 20%, ${v.blobs[2]}, transparent 55%), ${v.base}` },
      }, h('span', { class: 'pal-dot', style: { background: v.accent } })),
      h('span', { class: 'pal-name', text: p.name }));
    }));

    const accentInput = h('input', { type: 'color', value: s.accent || SP.theme.current().accent, class: 'color-input' });
    accentInput.addEventListener('input', () => { s.accent = accentInput.value; SP.store.save(); SP.theme.apply(); });

    const content = h('div', { class: 'set-scroll' },
      section('Apariencia',
        segmented([{ value: 'light', label: 'Claro', icon: 'sun' }, { value: 'dark', label: 'Oscuro', icon: 'moon' }], s.theme, (v) => {
          if (v !== s.theme) SP.theme.toggle();
          render();
        }),
        h('div', { class: 'set-label', text: 'Paleta' }),
        palGrid,
        h('div', { class: 'row' },
          h('span', { class: 'row-text' }, h('span', { text: 'Color de acento' }), h('small', { text: s.accent ? 'Personalizado' : 'El de la paleta' })),
          s.accent ? h('button', { type: 'button', class: 'btn small ghost', text: 'Restablecer', onclick: () => { s.accent = null; SP.store.save(); SP.theme.apply(); render(); } }) : null,
          accentInput),
        h('div', { class: 'set-label', text: 'Brillo (glossy)' }),
        segmented([
          { value: 0, label: 'Mate' }, { value: 30, label: 'Suave' }, { value: 65, label: 'Glossy' }, { value: 100, label: 'Liquid' },
        ], [0, 30, 65, 100].includes(s.gloss) ? s.gloss : -1, (v) => { s.gloss = v; SP.store.save(); SP.theme.applyLook(); render(); }),
        slider('Brillo', s.gloss, 0, 100, '%', (v) => { s.gloss = v; SP.store.save(); SP.theme.applyLook(); }),
        slider('Opacidad notas', s.opacity, 55, 100, '%', (v) => { s.opacity = v; SP.store.save(); SP.theme.applyLook(); })),

      section('Fuentes',
        fontButton('Texto general', s.fonts.ui, (id) => { s.fonts.ui = id; SP.store.save(); SP.theme.applyLook(); }),
        fontButton('Títulos y números', s.fonts.display, (id) => { s.fonts.display = id; SP.store.save(); SP.theme.applyLook(); }),
        h('p', { class: 'set-hint', text: 'Cada nota puede tener su propia fuente desde su menú ⋯ → Fuente.' })),

      section('Fondo',
        segmented([{ value: 'default', label: 'Aurora animada', icon: 'drop' }, { value: 'video', label: 'Video', icon: 'video' }], s.bg.mode, (v) => {
          s.bg.mode = v; SP.store.save(); SP.background.refresh(); render();
          if (v === 'video' && !s.bg.videos.dark && !s.bg.videos.light) SP.ui.toast('Subí un MP4 o soltalo sobre la página');
        }),
        s.bg.mode === 'video' ? h('div', { class: 'slots' },
          s.bg.sameForBoth
            ? videoSlot('dark', 'Video de fondo')
            : [videoSlot('dark', 'Tema oscuro'), videoSlot('light', 'Tema claro')],
          toggleRow('Un video distinto para claro y oscuro', !s.bg.sameForBoth, (on) => {
            s.bg.sameForBoth = !on; SP.store.save(); SP.background.refresh(); render();
          }),
        ) : null,
        slider('Velo del tema', s.bg.overlay, 0, 80, '%', (v) => { s.bg.overlay = v; SP.store.save(); SP.background.refresh(); }),
        s.bg.mode === 'video' ? slider('Desenfoque del video', s.bg.blur, 0, 24, 'px', (v) => { s.bg.blur = v; SP.store.save(); SP.background.refresh(); }) : null,
        h('p', { class: 'set-hint', text: 'El tema oscuro oscurece el video y el claro lo aclara; el velo controla cuánto.' })),

      section('Tablero',
        toggleRow('Ajustar a la cuadrícula', s.snap, (on) => { s.snap = on; SP.store.save(); }, 'Alinea las notas al moverlas'),
        toggleRow('Bloquear posiciones', s.locked, (on) => { SP.board.setLocked(on); }, 'También con el candado de arriba'),
        toggleRow('Modo ligero', s.lite, (on) => { s.lite = on; SP.store.save(); SP.theme.applyLook(); }, 'Sin desenfoques ni animaciones: ideal para PCs modestas')),

      section('Tus datos',
        h('p', { class: 'set-hint', text: 'Todo se guarda automáticamente en este navegador. Exportá una copia para pasarla a otra computadora.' }),
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn small', onclick: exportData }, h('span', { html: SP.icon('download', 14) }), 'Exportar'),
          h('button', { type: 'button', class: 'btn small', onclick: importData }, h('span', { html: SP.icon('upload', 14) }), 'Importar'),
          h('button', { type: 'button', class: 'btn small', onclick: moveData }, h('span', { html: SP.icon('globe', 14) }), 'Llevar a otra dirección'),
          h('button', { type: 'button', class: 'btn small ghost danger-text', onclick: resetAll, text: 'Restablecer todo' }))),

      h('div', { class: 'set-foot' },
        h('span', null, h('kbd', { text: 'N' }), ' nueva nota'),
        h('span', null, h('kbd', { text: 'L' }), ' candado'),
        h('span', null, h('kbd', { text: 'T' }), ' tema'),
        h('span', null, h('kbd', { text: 'Ctrl' }), '+', h('kbd', { text: 'V' }), ' pegar enlace')));

    panel.querySelector('.set-body').replaceChildren(content);
    content.scrollTop = scrollTop;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(S(), null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `startpage-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    SP.ui.toast('Copia exportada (los videos subidos no se incluyen)');
  }

  async function moveData() {
    const r = await SP.ui.modal({
      title: 'Llevar mis notas a otra dirección',
      message: 'Cada dirección (archivo local, GitHub Pages) guarda sus notas por separado. Esto abre la otra dirección con una copia de todo (menos los videos subidos).',
      submitText: 'Abrir y copiar',
      fields: [{ name: 'url', label: 'Dirección', value: '', placeholder: 'https://usuario.github.io/startpage/', required: true }],
    });
    if (r && r.url.trim()) SP.migrate.openAt(SP.util.normalizeUrl(r.url));
  }

  function importData() {
    const input = h('input', { type: 'file', accept: 'application/json,.json' });
    input.addEventListener('change', async () => {
      try {
        const data = JSON.parse(await input.files[0].text());
        if (!data || data.v !== 1 || !Array.isArray(data.notes)) throw new Error('formato');
        SP.store.replace(data);
        SP.theme.apply(); SP.board.renderAll(); SP.board.setLocked(S().locked, { silent: true }); SP.background.refresh();
        render();
        SP.ui.toast('Datos importados');
      } catch (e) { SP.ui.toast('Ese archivo no es una copia válida'); }
    });
    input.click();
  }

  async function resetAll() {
    const ok = await SP.ui.confirm('¿Restablecer todo?', 'Se borran tus notas, ajustes y videos guardados. No se puede deshacer.', 'Borrar todo');
    if (!ok) return;
    SP.store.reset();
    try { await SP.idb.clear(); } catch (e) { /* nada */ }
    location.reload();
  }

  function open() {
    if (panel) { close(); return; }
    SP.ui.closeMenu();
    panel = h('aside', { class: 'settings glass', 'aria-label': 'Ajustes' },
      h('header', { class: 'set-head' },
        h('h3', { text: 'Ajustes' }),
        h('button', { type: 'button', class: 'note-btn', 'aria-label': 'Cerrar', html: SP.icon('x', 18), onclick: close })),
      h('div', { class: 'set-body' }));
    document.body.append(panel);
    render();
    requestAnimationFrame(() => panel.classList.add('show'));
    document.getElementById('btn-settings').classList.add('active');
    document.addEventListener('keydown', onKey);
    setTimeout(() => document.addEventListener('pointerdown', onOutside, true));
  }
  function onKey(e) { if (e.key === 'Escape' && !document.querySelector('.modal-wrap')) close(); }
  function onOutside(e) {
    if (!panel) return;
    if (panel.contains(e.target) || e.target.closest('#btn-settings, .modal-wrap, .toast, .popover')) return;
    close();
  }
  function close() {
    if (!panel) return;
    const p = panel; panel = null;
    p.classList.remove('show');
    setTimeout(() => p.remove(), 250);
    document.getElementById('btn-settings').classList.remove('active');
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onOutside, true);
  }

  document.addEventListener('sp:theme', () => render());

  SP.settings = { open, close, render };
})(window.SP);
