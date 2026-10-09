/* ==========================================================================
   Startpage · Tema (claro/oscuro) y paletas de color
   Cada paleta define el acento y los colores del fondo aurora para
   cada tema. El acento se puede sobreescribir con un color propio.
   ========================================================================== */
(function (SP) {
  'use strict';

  const PALETTES = {
    aurora: {
      name: 'Aurora',
      light: { accent: '#6c5ce7', base: '#f3f0ff', blobs: ['#c7b8ff', '#ffc7e0', '#a6e3ff', '#ffe3b3'] },
      dark: { accent: '#a99cff', base: '#0c0a19', blobs: ['#3b2a90', '#86296a', '#18557f', '#2c1f66'] },
    },
    atardecer: {
      name: 'Atardecer',
      light: { accent: '#e8643c', base: '#fff3ea', blobs: ['#ffbf98', '#ffcfdc', '#ffe6a3', '#f8b4a6'] },
      dark: { accent: '#ff9b73', base: '#170c0b', blobs: ['#8a3524', '#7a2850', '#7d5a17', '#4a1b2d'] },
    },
    oceano: {
      name: 'Océano',
      light: { accent: '#1f8fc4', base: '#ecf7fb', blobs: ['#a3dcef', '#b3eedb', '#c4d4ff', '#d7f3ff'] },
      dark: { accent: '#5cc4f0', base: '#06111a', blobs: ['#0e4a6a', '#0d6656', '#21306e', '#0a3348'] },
    },
    bosque: {
      name: 'Bosque',
      light: { accent: '#2f8a5b', base: '#f0f6ee', blobs: ['#bde2c1', '#e4eeb0', '#a7d6c7', '#d9ebcf'] },
      dark: { accent: '#6fd19c', base: '#08130d', blobs: ['#1d5a39', '#4c5918', '#164c44', '#0f3323'] },
    },
    sakura: {
      name: 'Sakura',
      light: { accent: '#d9548a', base: '#fff1f5', blobs: ['#ffc3d8', '#ffdcc4', '#e1caff', '#ffe9f0'] },
      dark: { accent: '#ff8fbd', base: '#160a10', blobs: ['#792850', '#6a3828', '#48297a', '#3f1430'] },
    },
    mono: {
      name: 'Grafito',
      light: { accent: '#2d2b33', base: '#f2f1ef', blobs: ['#dcdad5', '#e9e6df', '#cfd3d8', '#f6f4ef'] },
      dark: { accent: '#e8e6ef', base: '#0b0b0d', blobs: ['#2a2a31', '#1f2329', '#33302c', '#18181c'] },
    },
  };

  function current() {
    const s = SP.store.state;
    const pal = PALETTES[s.palette] || PALETTES.aurora;
    return pal[s.theme === 'light' ? 'light' : 'dark'];
  }

  function apply() {
    const s = SP.store.state;
    const root = document.documentElement;
    root.dataset.theme = s.theme;
    const p = current();
    const accent = s.accent || p.accent;
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-ink', SP.util.inkFor(accent));
    root.style.setProperty('--bg-base', p.base);
    p.blobs.forEach((c, i) => root.style.setProperty(`--blob${i + 1}`, c));
    applyLook();
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = p.base;
    const btn = document.getElementById('btn-theme');
    if (btn) btn.innerHTML = SP.icon(s.theme === 'dark' ? 'sun' : 'moon', 18);
    document.dispatchEvent(new CustomEvent('sp:theme'));
  }

  /** Brillo (glossy), opacidad de notas, modo ligero y fuentes globales */
  function applyLook() {
    const s = SP.store.state;
    const root = document.documentElement;
    const g = Math.max(0, Math.min(100, s.gloss ?? 45)) / 100;
    root.style.setProperty('--g', g.toFixed(2));
    root.style.setProperty('--note-alpha', (s.opacity ?? 96) + '%');
    root.classList.toggle('translucent', (s.opacity ?? 96) < 94);
    root.classList.toggle('lite', !!s.lite);
    root.classList.toggle('glossy', g >= 0.6);
    const ui = s.fonts && s.fonts.ui; const disp = s.fonts && s.fonts.display;
    if (SP.fonts) {
      SP.fonts.load(ui); SP.fonts.load(disp);
      root.style.setProperty('--font', SP.fonts.stack(ui) || 'system-ui, sans-serif');
      root.style.setProperty('--font-display', SP.fonts.stack(disp) || 'Georgia, serif');
      SP.fonts.load('caveat'); // letra manuscrita de las notas
    }
  }

  function toggle() {
    const s = SP.store.state;
    s.theme = s.theme === 'dark' ? 'light' : 'dark';
    SP.store.save();
    document.documentElement.classList.add('theme-anim');
    apply();
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 700);
  }

  /* Colores de notas disponibles (los valores reales viven en el CSS) */
  const NOTE_COLORS = [
    { id: 'glass', label: 'Vidrio' },
    { id: 'yellow', label: 'Amarillo' },
    { id: 'peach', label: 'Durazno' },
    { id: 'pink', label: 'Rosa' },
    { id: 'lavender', label: 'Lavanda' },
    { id: 'sky', label: 'Cielo' },
    { id: 'mint', label: 'Menta' },
    { id: 'sand', label: 'Arena' },
    { id: 'graphite', label: 'Grafito' },
  ];

  SP.theme = { PALETTES, NOTE_COLORS, apply, applyLook, toggle, current };
})(window.SP);
