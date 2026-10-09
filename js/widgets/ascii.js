/* ==========================================================================
   Startpage · ASCII art
   Para que el ASCII se vea bien hacen falta tres cosas:
   1) una fuente monoespaciada de verdad, sin ligaduras ni interletrado;
   2) que no se corten ni se ajusten las líneas (white-space: pre);
   3) que el tamaño de letra se calcule para que el dibujo entre justo en la
      nota (se mide a 100px y se escala), así se ve entero en cualquier tamaño.
   Además trae galería, editor, texto → letras grandes, imagen → ASCII y
   efectos (monitor verde, ámbar, neón, arcoíris…).
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  /* ---------- Galería ---------- */
  const trim = (s) => s.replace(/^\n+|\s+$/g, '');
  const PRESETS = {
    cat: { name: 'Gato', art: trim(String.raw`
    /\_____/\
   /  o   o  \
  ( ==  ^  == )
   )         (
  (           )
 ( (  )   (  ) )
(__(__)___(__)__)
`) },
    bunny: { name: 'Conejo', art: trim(String.raw`
 (\(\
 ( -.-)
 o_(")(")
`) },
    coffee: { name: 'Café', art: trim(String.raw`
       ) )  (
      ( (  ) )
     .________.
     |        |]
     \        /
      '------'
`) },
    rocket: { name: 'Cohete', art: trim(String.raw`
       /\
      /  \
     |    |
     | () |
     |    |
    /|    |\
   / |    | \
  |__|____|__|
     /_||_\
      /\/\
`) },
    mountains: { name: 'Montañas', art: trim(String.raw`
          /\
         /**\        /\
        /****\  /\  /  \
       /      \/  \/    \
      /  /\    \   \     \
     /  /  \    \   \     \
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
`) },
    cactus: { name: 'Cactus', art: trim(String.raw`
        _  _
       | || |
    _  | || |
   | |_| || |  _
   |___  || |_| |
       | ||  ___|
       | || |
   ~~~~~~~~~~~~~~~~
`) },
    computer: { name: 'Compu', art: trim(String.raw`
  .----------------.
  |  .----------.  |
  |  |  >_      |  |
  |  |          |  |
  |  '----------'  |
  '-------..-------'
     ____||____
    [__________]
`) },
    heart: { name: 'Corazón', art: trim(String.raw`
   .:::.   .:::.
  :::::::.:::::::
  :::::::::::::::
  ':::::::::::::'
    ':::::::::'
      ':::::'
        ':'
`) },
    flower: { name: 'Maceta', art: trim(String.raw`
       .-.
     _(   )_
    (_  o  _)
      (_ _)
        |  .-.
        | /  /
     .--|/--'
     \      /
      \____/
`) },
    box: { name: 'Cartel', art: trim(String.raw`
╭──────────────────────╮
│                      │
│   Que tengas un      │
│   lindo día  :)      │
│                      │
╰──────────────────────╯
`) },
  };

  /* ---------- Letras grandes: fuente de 5×5 ----------
     Cada glifo son 5 filas; '#' = pixel encendido. */
  const G = {
    A: [' ### ', '#   #', '#####', '#   #', '#   #'], B: ['#### ', '#   #', '#### ', '#   #', '#### '],
    C: [' ####', '#    ', '#    ', '#    ', ' ####'], D: ['#### ', '#   #', '#   #', '#   #', '#### '],
    E: ['#####', '#    ', '#### ', '#    ', '#####'], F: ['#####', '#    ', '#### ', '#    ', '#    '],
    G: [' ####', '#    ', '# ###', '#   #', ' ####'], H: ['#   #', '#   #', '#####', '#   #', '#   #'],
    I: ['###', ' # ', ' # ', ' # ', '###'], J: ['  ###', '   # ', '   # ', '#  # ', ' ##  '],
    K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'], L: ['#    ', '#    ', '#    ', '#    ', '#####'],
    M: ['#   #', '## ##', '# # #', '#   #', '#   #'], N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
    O: [' ### ', '#   #', '#   #', '#   #', ' ### '], P: ['#### ', '#   #', '#### ', '#    ', '#    '],
    Q: [' ### ', '#   #', '# # #', '#  # ', ' ## #'], R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
    S: [' ####', '#    ', ' ### ', '    #', '#### '], T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
    U: ['#   #', '#   #', '#   #', '#   #', ' ### '], V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
    W: ['#   #', '#   #', '# # #', '## ##', '#   #'], X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
    Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '], Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
    0: [' ### ', '#  ##', '# # #', '##  #', ' ### '], 1: [' # ', '## ', ' # ', ' # ', '###'],
    2: ['#### ', '    #', ' ### ', '#    ', '#####'], 3: ['#### ', '    #', ' ### ', '    #', '#### '],
    4: ['#   #', '#   #', '#####', '    #', '    #'], 5: ['#####', '#    ', '#### ', '    #', '#### '],
    6: [' ### ', '#    ', '#### ', '#   #', ' ### '], 7: ['#####', '    #', '   # ', '  #  ', '  #  '],
    8: [' ### ', '#   #', ' ### ', '#   #', ' ### '], 9: [' ### ', '#   #', ' ####', '    #', ' ### '],
    ' ': ['   ', '   ', '   ', '   ', '   '], '!': ['#', '#', '#', ' ', '#'], '¡': ['#', ' ', '#', '#', '#'],
    '?': ['### ', '   #', ' ## ', '    ', ' #  '], '.': [' ', ' ', ' ', ' ', '#'], ',': ['  ', '  ', '  ', ' #', '# '],
    ':': [' ', '#', ' ', '#', ' '], '-': ['   ', '   ', '###', '   ', '   '], '+': ['   ', ' # ', '###', ' # ', '   '],
    "'": ['#', '#', ' ', ' ', ' '], '/': ['    #', '   # ', '  #  ', ' #   ', '#    '], '(': [' #', '# ', '# ', '# ', ' #'],
    ')': ['# ', ' #', ' #', ' #', '# '], '=': ['   ', '###', '   ', '###', '   '], '_': ['    ', '    ', '    ', '    ', '####'],
    '*': ['     ', '# # #', ' ### ', '# # #', '     '], '♥': [' # # ', '#####', '#####', ' ### ', '  #  '],
  };

  const BANNER_STYLES = {
    block: 'Bloques',
    shadow: 'Bloques con sombra',
    half: 'Compacto',
    letters: 'Con su propia letra',
    hash: 'Numerales #',
  };

  /** Convierte texto a un mapa de pixeles por línea */
  function pixelRows(text) {
    const clean = text.toUpperCase().replace(/<3/g, '♥').normalize('NFD').replace(/[̀-ͯ]/g, '');
    return clean.split('\n').map((line) => {
      const rows = ['', '', '', '', ''];
      const owner = ['', '', '', '', ''];
      [...line].forEach((ch, i) => {
        const g = G[ch] || G['?'];
        for (let r = 0; r < 5; r++) {
          rows[r] += (i ? ' ' : '') + g[r];
          owner[r] += (i ? ' ' : '') + ch.repeat(g[r].length);
        }
      });
      return { rows, owner };
    });
  }

  function banner(text, style = 'block') {
    const blocks = pixelRows(text || ' ').map(({ rows, owner }) => {
      const on = (r, c) => r >= 0 && c >= 0 && r < 5 && rows[r][c] === '#';
      const w = Math.max(...rows.map((r) => r.length));
      const out = [];
      if (style === 'half') {
        for (let r = 0; r < 6; r += 2) {
          let s = '';
          for (let c = 0; c < w; c++) {
            const t = on(r, c); const b = on(r + 1, c);
            s += t && b ? '█' : t ? '▀' : b ? '▄' : ' ';
          }
          out.push(s);
        }
      } else if (style === 'shadow') {
        for (let r = 0; r < 6; r++) {
          let s = '';
          for (let c = 0; c <= w; c++) s += on(r, c) ? '██' : on(r - 1, c - 1) ? '░░' : '  ';
          out.push(s);
        }
      } else {
        for (let r = 0; r < 5; r++) {
          let s = '';
          for (let c = 0; c < w; c++) {
            if (!on(r, c)) { s += style === 'letters' ? ' ' : '  '; continue; }
            s += style === 'block' ? '██' : style === 'hash' ? '##' : owner[r][c];
          }
          out.push(s);
        }
      }
      return out.map((l) => l.replace(/\s+$/, '')).join('\n');
    });
    return blocks.join('\n\n');
  }

  /* ---------- Imagen → ASCII ---------- */
  const RAMPS = {
    chars: ' .:-=+*#%@',
    blocks: ' ░▒▓█',
  };

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * img → texto. opts: { cols, mode: chars|blocks|braille, invert, contrast }
   * invert=false: lo oscuro de la imagen se dibuja con caracteres "llenos"
   * (ideal para tinta oscura sobre nota clara).
   */
  function imageToAscii(img, { cols = 70, mode = 'chars', invert = false, contrast = 1 } = {}) {
    const ratio = img.naturalHeight / img.naturalWidth;
    const braille = mode === 'braille';
    const pw = braille ? cols * 2 : cols;
    // Las letras son ~2 veces más altas que anchas
    const ph = braille ? Math.max(4, Math.round(pw * ratio / 4) * 4) : Math.max(1, Math.round(cols * ratio * 0.5));
    const cv = document.createElement('canvas');
    cv.width = pw; cv.height = ph;
    const c2 = cv.getContext('2d', { willReadFrequently: true });
    c2.fillStyle = '#fff'; c2.fillRect(0, 0, pw, ph); // transparencias = fondo blanco
    c2.drawImage(img, 0, 0, pw, ph);
    const px = c2.getImageData(0, 0, pw, ph).data;
    const lum = new Float32Array(pw * ph);
    for (let i = 0; i < pw * ph; i++) {
      let L = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
      L = Math.min(1, Math.max(0, (L - 0.5) * contrast + 0.5));
      lum[i] = invert ? 1 - L : L;
    }
    const lines = [];
    if (braille) {
      // Difusión de error (Floyd–Steinberg) para que se vean los grises
      for (let y = 0; y < ph; y++) {
        for (let x = 0; x < pw; x++) {
          const i = y * pw + x; const old = lum[i]; const nw = old < 0.5 ? 0 : 1; const err = old - nw;
          lum[i] = nw;
          if (x + 1 < pw) lum[i + 1] += err * 7 / 16;
          if (y + 1 < ph) {
            if (x > 0) lum[i + pw - 1] += err * 3 / 16;
            lum[i + pw] += err * 5 / 16;
            if (x + 1 < pw) lum[i + pw + 1] += err / 16;
          }
        }
      }
      const BITS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
      for (let y = 0; y < ph; y += 4) {
        let s = '';
        for (let x = 0; x < pw; x += 2) {
          let code = 0;
          for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) if (lum[(y + dy) * pw + x + dx] < 0.5) code |= BITS[dy][dx];
          s += String.fromCharCode(0x2800 + code);
        }
        lines.push(s);
      }
    } else {
      const ramp = RAMPS[mode] || RAMPS.chars;
      for (let y = 0; y < ph; y++) {
        let s = '';
        for (let x = 0; x < pw; x++) s += ramp[Math.min(ramp.length - 1, Math.floor((1 - lum[y * pw + x]) * ramp.length))];
        lines.push(s.replace(/\s+$/, ''));
      }
    }
    return lines.join('\n').replace(/^\n+|\s+$/g, '');
  }

  /* ---------- Efectos ---------- */
  const FX = {
    ink: 'Tinta de la nota',
    crt: 'Monitor verde (CRT)',
    amber: 'Monitor ámbar',
    neon: 'Neón',
    rainbow: 'Arcoíris',
    ice: 'Hielo',
  };
  const DARK_FX = new Set(['crt', 'amber', 'neon']);

  /* ---------- Medir y ajustar el tamaño de letra ---------- */
  const MONO_DEFAULT = 'jetbrains';
  function monoStack(n) {
    const f = n.font && SP.fonts.FONTS[n.font];
    if (f && f.cat === 'mono') return SP.fonts.stack(n.font);
    return SP.fonts.stack(MONO_DEFAULT) + ', "Cascadia Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace';
  }

  /** Escala `pre` para que entre en `box` (medido sin transformaciones) */
  function fitInto(pre, box, { max = 64, min = 3 } = {}) {
    pre.style.fontSize = '100px';
    const w = pre.offsetWidth; const hh = pre.offsetHeight;
    const aw = box.clientWidth - 4; const ah = box.clientHeight - 4;
    if (!w || !hh || aw <= 0 || ah <= 0) return;
    const fs = Math.max(min, Math.min(max, Math.floor(100 * Math.min(aw / w, ah / hh) * 10) / 10));
    pre.style.fontSize = fs + 'px';
  }

  /* ---------- Modales de herramientas ---------- */
  function previewPre(text, n) {
    const pre = h('pre', { class: 'ascii-pre', style: { fontFamily: monoStack(n) } });
    pre.textContent = text;
    return pre;
  }

  async function galleryDialog(n) {
    let chosen = null;
    let closeFn = null;
    const grid = h('div', { class: 'ascii-gallery' }, Object.entries(PRESETS).map(([id, p]) => {
      const box = h('span', { class: 'ascii-thumb-box' }, previewPre(p.art, n));
      const b = h('button', {
        type: 'button', class: 'ascii-thumb', title: p.name,
        onclick: () => { chosen = p.art; closeFn(true); },
      }, box, h('span', { class: 'ascii-thumb-name', text: p.name }));
      return b;
    }));
    const p = SP.ui.modal({ title: 'Galería ASCII', content: grid, submitText: 'Cerrar', noCancel: true, wide: true, bind: (c) => { closeFn = c; } });
    requestAnimationFrame(() => grid.querySelectorAll('.ascii-thumb-box').forEach((box) => fitInto(box.firstChild, box, { max: 14 })));
    await p;
    return chosen;
  }

  async function bannerDialog(n) {
    const input = h('textarea', { class: 'set-input', rows: 2, placeholder: 'Escribí algo corto', spellcheck: 'false' });
    input.value = n.title || 'Hola';
    const sel = h('select', { class: 'set-input' }, Object.entries(BANNER_STYLES).map(([v, l]) => h('option', { value: v, text: l })));
    const box = h('div', { class: 'ascii-preview' });
    const pre = previewPre('', n);
    box.append(pre);
    const upd = () => { pre.textContent = banner(input.value || ' ', sel.value); fitInto(pre, box, { max: 20 }); };
    input.addEventListener('input', upd);
    sel.addEventListener('change', upd);
    const content = h('div', { class: 'ascii-tool' },
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Texto (Enter = otra línea · Ctrl+Enter = usar)' }), input),
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Estilo' }), sel),
      box,
      h('small', { class: 'field-hint', text: 'Letras A–Z, números y signos básicos. "<3" dibuja un corazón.' }));
    const p = SP.ui.modal({ title: 'Texto a letras grandes', content, submitText: 'Usar', wide: true });
    requestAnimationFrame(upd);
    return (await p) ? banner(input.value || ' ', sel.value) : null;
  }

  async function imageDialog(n, ctx) {
    let img = null;
    const file = h('input', { type: 'file', accept: 'image/*', class: 'set-input' });
    const cols = h('input', { type: 'range', min: 20, max: 160, value: 70, class: 'slider' });
    const contrast = h('input', { type: 'range', min: 50, max: 250, value: 110, class: 'slider' });
    const mode = h('select', { class: 'set-input' },
      h('option', { value: 'chars', text: 'Caracteres  .:-=+*#%@' }),
      h('option', { value: 'blocks', text: 'Bloques  ░▒▓█' }),
      h('option', { value: 'braille', text: 'Braille (más definición)' }));
    // Si la tinta es clara (nota oscura), lo brillante se dibuja "lleno"
    const ink = getComputedStyle(ctx.el).getPropertyValue('--note-ink').trim();
    const inkLight = /^#/.test(ink) && SP.util.luminance(ink) > 0.5;
    const invert = h('input', { type: 'checkbox' });
    invert.checked = inkLight;
    const box = h('div', { class: 'ascii-preview' }, h('p', { class: 'set-hint', text: 'Elegí una imagen para ver cómo queda.' }));
    const pre = previewPre('', n);
    const out = () => (img ? imageToAscii(img, { cols: +cols.value, mode: mode.value, invert: invert.checked, contrast: contrast.value / 100 }) : '');
    const upd = () => { if (!img) return; pre.textContent = out(); box.replaceChildren(pre); fitInto(pre, box, { max: 16, min: 1 }); };
    file.addEventListener('change', async () => {
      if (!file.files[0]) return;
      try { img = await loadImage(file.files[0]); upd(); } catch (e) { SP.ui.toast('No se pudo abrir esa imagen'); }
    });
    [cols, contrast, mode, invert].forEach((el) => el.addEventListener('input', upd));
    const row = (label, el) => h('label', { class: 'row slider-row' }, h('span', { class: 'row-text', text: label }), el);
    const content = h('div', { class: 'ascii-tool' },
      file,
      row('Ancho (letras)', cols), row('Contraste', contrast),
      h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'Estilo' }), mode),
      h('label', { class: 'pomo-check' }, invert, h('span', { text: 'Invertir (para notas oscuras)' })),
      box);
    const ok = await SP.ui.modal({ title: 'Imagen a ASCII', content, submitText: 'Usar', wide: true });
    return ok && img ? out() : null;
  }

  /* ---------- Nota ---------- */
  SP.board.register('ascii', {
    label: 'ASCII',
    icon: 'ascii',
    size: [300, 240],
    min: [120, 90],
    color: 'graphite',
    create: (o) => ({
      art: o.art != null ? o.art : (PRESETS[o.preset] || PRESETS.cat).art,
      fx: o.fx || 'ink',
      fit: true,
      size: 14,
    }),
    text: (n) => n.data.art,
    render(body, n, ctx) {
      const d = n.data;
      SP.fonts.load(MONO_DEFAULT);
      body.classList.add('ascii-body');
      if (DARK_FX.has(d.fx)) ctx.el.dataset.skin = 'ascii-' + d.fx; else delete ctx.el.dataset.skin;

      const stageEl = h('div', { class: 'ascii-stage' + (d.fit ? ' fit' : ' fixed') });
      const pre = h('pre', {
        class: 'ascii-pre fx-' + d.fx, role: 'img', 'aria-label': 'Dibujo ASCII' + (n.title ? ': ' + n.title : ''),
        title: 'Doble clic para editar',
        style: { fontFamily: monoStack(n) },
      });
      pre.textContent = d.art || '';
      stageEl.append(pre);
      body.append(stageEl);

      const fit = () => {
        if (!pre.isConnected) return;
        if (d.fit) fitInto(pre, stageEl);
        else pre.style.fontSize = d.size + 'px';
      };
      const ro = new ResizeObserver(() => fit());
      ro.observe(stageEl);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      const onFonts = () => fit();
      if (document.fonts) document.fonts.addEventListener('loadingdone', onFonts);
      ctx.onResize = fit;

      // Edición en el lugar
      const edit = () => {
        if (SP.store.state.locked) return;
        const ta = h('textarea', {
          class: 'ascii-edit', wrap: 'off', spellcheck: 'false', 'aria-label': 'Editar ASCII',
          style: { fontFamily: monoStack(n) },
        });
        ta.value = d.art;
        const done = h('button', { type: 'button', class: 'ascii-done btn small primary', text: 'Listo' });
        const finish = (save) => {
          if (save && ta.value !== d.art) ctx.history('Editar ASCII', () => { d.art = ta.value.replace(/\s+$/, ''); });
          ctx.save();
          ctx.rerender();
        };
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') { // Tab inserta espacios en vez de salir
            e.preventDefault();
            const s = ta.selectionStart;
            ta.setRangeText('  ', s, ta.selectionEnd, 'end');
          } else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finish(true); }
        });
        done.addEventListener('click', () => finish(true));
        ta.addEventListener('blur', (e) => { if (e.relatedTarget !== done) finish(true); });
        body.replaceChildren(ta, done);
        ta.focus();
      };
      pre.addEventListener('dblclick', edit);
      ctx.editAscii = edit;

      return () => {
        ro.disconnect();
        if (document.fonts) document.fonts.removeEventListener('loadingdone', onFonts);
        delete ctx.el.dataset.skin;
      };
    },
    menu(n, ctx) {
      const d = n.data;
      const set = (art) => { if (art != null) { d.art = art; ctx.save(); ctx.rerender(); } };
      return [
        { icon: 'edit', label: 'Editar (doble clic)', fn: () => setTimeout(() => ctx.editAscii && ctx.editAscii(), 30) },
        { icon: 'grid', label: 'Galería…', fn: async () => set(await galleryDialog(n)) },
        { icon: 'font', label: 'Texto a letras grandes…', fn: async () => set(await bannerDialog(n)) },
        { icon: 'image', label: 'Imagen a ASCII…', fn: async () => set(await imageDialog(n, ctx)) },
        {
          icon: 'sparkle', label: 'Efecto: ' + FX[d.fx || 'ink'],
          fn: () => {
            const keys = Object.keys(FX);
            d.fx = keys[(keys.indexOf(d.fx) + 1) % keys.length];
            ctx.save(); ctx.rerender();
            SP.ui.toast('Efecto: ' + FX[d.fx], { ms: 1200 });
          },
          keepOpen: false,
        },
        {
          icon: 'fit', label: d.fit ? 'Tamaño fijo de letra' : 'Ajustar al tamaño de la nota',
          fn: async () => {
            if (d.fit) {
              const r = await SP.ui.modal({ title: 'Tamaño de letra', fields: [{ name: 'size', label: 'Píxeles', type: 'number', min: 4, max: 64, value: d.size }] });
              if (!r) return;
              d.size = Math.max(4, Math.min(64, +r.size || 14));
            }
            d.fit = !d.fit;
            ctx.save(); ctx.rerender();
          },
        },
        {
          icon: 'copy', label: 'Copiar el texto',
          fn: async () => {
            try { await navigator.clipboard.writeText(d.art); SP.ui.toast('Copiado'); } catch (e) { SP.ui.toast('No se pudo copiar'); }
          },
        },
      ];
    },
  });

  SP.ascii = { PRESETS, banner, imageToAscii, loadImage, fitInto, FX };
})(window.SP);
