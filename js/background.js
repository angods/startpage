/* ==========================================================================
   Startpage · Fondo
   - Por defecto: "aurora" animada (CSS) teñida con la paleta.
   - Video propio (MP4/WebM) subido (IndexedDB) o por URL/ruta.
   - YouTube o Vimeo como fondo (silenciado y en bucle).
   - Cualquier página web como fondo (si la página permite incrustarse).
   - Se puede usar un fondo distinto para el tema claro y el oscuro.
   - Un "guardián" se asegura de que el video nunca quede en pausa.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;

  let objectUrl = null;
  let currentKey = null;
  let active = null;      // 'video' | 'frame' | null
  let frameKind = null;   // 'youtube' | 'vimeo' | 'page'

  const KINDS = {
    auto: 'Detectar automáticamente',
    video: 'Archivo de video (MP4 / WebM)',
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    page: 'Página web',
  };

  const $ = (id) => document.getElementById(id);

  function activeSlot() {
    const s = SP.store.state;
    return s.bg.sameForBoth ? 'dark' : (s.theme === 'light' ? 'light' : 'dark');
  }

  /** Deduce qué tipo de fondo es una URL */
  function detectKind(url) {
    const u = (url || '').trim();
    if (SP.youtube && /youtu\.?be/i.test(u) && SP.youtube.parse(u)) return 'youtube';
    if (/vimeo\.com\/(?:video\/)?\d+/i.test(u)) return 'vimeo';
    if (/\.(mp4|webm|ogv|ogg|mov|m4v)(\?|#|$)/i.test(u) || /^(assets\/|\.\/|\.\.\/|blob:|data:video)/i.test(u)) return 'video';
    return 'page';
  }

  function frameUrl(kind, url) {
    if (kind === 'youtube') {
      const v = SP.youtube.parse(url);
      if (!v) return null;
      const p = new URLSearchParams({
        autoplay: '1', mute: '1', loop: '1', controls: '0', disablekb: '1', fs: '0',
        modestbranding: '1', playsinline: '1', rel: '0', iv_load_policy: '3', enablejsapi: '1',
      });
      if (v.list) p.set('list', v.list); else p.set('playlist', v.id);
      if (v.start) p.set('start', String(v.start));
      if (location.origin && location.origin !== 'null') p.set('origin', location.origin);
      return `https://www.youtube-nocookie.com/embed/${v.id || 'videoseries'}?${p}`;
    }
    if (kind === 'vimeo') {
      const m = /vimeo\.com\/(?:video\/)?(\d+)/i.exec(url);
      return m ? `https://player.vimeo.com/video/${m[1]}?background=1&autoplay=1&loop=1&muted=1&dnt=1` : null;
    }
    return SP.util.normalizeUrl(url);
  }

  /* ---------- Mostrar / ocultar capas ---------- */
  function clearFrame() {
    const box = $('bg-frame');
    if (box) box.replaceChildren();
    if (box) box.classList.remove('on');
    frameKind = null;
  }
  function clearVideo() {
    const v = $('bg-video');
    v.classList.remove('on');
    if (v.getAttribute('src')) { v.pause(); v.removeAttribute('src'); v.load(); }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
  }
  function showAurora() {
    clearVideo(); clearFrame();
    $('aurora').classList.remove('off');
    active = null; currentKey = null;
  }
  function hideAurora() { $('aurora').classList.add('off'); }

  /* ---------- Video <video> ---------- */
  function playVideo(src, fallbackToPage) {
    clearFrame();
    const v = $('bg-video');
    active = 'video';
    v.muted = true;
    v.onloadeddata = () => { v.classList.add('on'); hideAurora(); keepPlaying(); };
    v.onerror = () => {
      if (fallbackToPage) { showFrame('page', fallbackToPage); return; }
      SP.ui.toast('No se pudo cargar el video de fondo');
      showAurora();
    };
    v.src = src;
    keepPlaying();
  }

  /* ---------- iframe (YouTube, Vimeo, página) ---------- */
  function showFrame(kind, url) {
    clearVideo();
    const src = frameUrl(kind, url);
    if (!src) { SP.ui.toast('Ese enlace no se puede usar como fondo'); showAurora(); return; }
    let box = $('bg-frame');
    if (!box) {
      box = h('div', { id: 'bg-frame' });
      $('bg-video').after(box);
    }
    const iframe = h('iframe', {
      src,
      class: 'bg-iframe kind-' + kind,
      allow: 'autoplay; encrypted-media; picture-in-picture',
      referrerpolicy: 'strict-origin-when-cross-origin',
      tabindex: '-1',
      title: 'Fondo',
      'aria-hidden': 'true',
    });
    iframe.addEventListener('load', () => {
      box.classList.add('on'); hideAurora();
      ytCommand('mute'); ytCommand('playVideo');
    });
    box.replaceChildren(iframe);
    active = 'frame';
    frameKind = kind;
    if (location.protocol === 'file:' && (kind === 'youtube')) {
      SP.ui.toast('YouTube como fondo funciona cuando la startpage está publicada (GitHub Pages), no abierta como archivo', { ms: 6000 });
    }
  }

  function ytCommand(func) {
    const f = document.querySelector('#bg-frame iframe');
    if (!f || !f.contentWindow) return;
    try {
      if (frameKind === 'youtube') f.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*');
      else if (frameKind === 'vimeo' && func === 'playVideo') f.contentWindow.postMessage(JSON.stringify({ method: 'play' }), '*');
    } catch (e) { /* nada */ }
  }

  /* ---------- Guardián: el fondo nunca se queda en pausa ---------- */
  function keepPlaying() {
    if (active === 'video') {
      const v = $('bg-video');
      if (v.getAttribute('src') && (v.paused || v.ended)) {
        v.muted = true;
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    } else if (active === 'frame') {
      ytCommand('playVideo');
    }
  }
  setInterval(keepPlaying, 2000);
  $('bg-video').addEventListener('pause', () => setTimeout(keepPlaying, 250));
  $('bg-video').addEventListener('stalled', () => setTimeout(keepPlaying, 1000));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepPlaying(); });
  window.addEventListener('focus', keepPlaying);
  // Si el navegador bloquea el autoplay, el primer clic lo destraba
  document.addEventListener('pointerdown', keepPlaying, { passive: true });

  /* ---------- Aplicar el estado ---------- */
  async function refresh() {
    const s = SP.store.state;
    const root = document.documentElement;
    root.style.setProperty('--bg-overlay', String((s.bg.overlay ?? 30) / 100));
    root.style.setProperty('--bg-blur', (s.bg.blur || 0) + 'px');

    const slot = activeSlot();
    const info = s.bg.videos[slot];
    if (s.bg.mode !== 'video' || !info) { showAurora(); return; }

    const key = [slot, info.src, info.kind, info.url, info.name, info.stamp].join('|');
    if (key === currentKey) { keepPlaying(); return; }
    currentKey = key;

    if (info.src === 'file') {
      let blob = null;
      try { blob = await SP.idb.get('video-' + slot); } catch (e) { console.warn(e); }
      if (!blob) { showAurora(); return; }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      playVideo(objectUrl);
      return;
    }

    let kind = info.kind && info.kind !== 'auto' ? info.kind : detectKind(info.url);
    if (kind === 'video') playVideo(info.url);
    else if (kind === 'page' && (!info.kind || info.kind === 'auto')) {
      // URL sin extensión conocida: probamos como video y si falla, como página
      playVideo(info.url, info.url);
    } else showFrame(kind, info.url);
  }

  async function setFile(slot, file) {
    if (!file) return;
    if (!/^video\//.test(file.type)) { SP.ui.toast('Elegí un archivo de video (.mp4 o .webm)'); return; }
    if (file.size > 400 * 1024 * 1024) SP.ui.toast('Video muy pesado: puede tardar en cargar');
    try {
      await SP.idb.put('video-' + slot, file);
    } catch (e) {
      SP.ui.toast('No hay espacio para guardar ese video');
      return;
    }
    const s = SP.store.state;
    s.bg.videos[slot] = { src: 'file', kind: 'video', name: file.name, stamp: Date.now() };
    s.bg.mode = 'video';
    SP.store.save();
    currentKey = null;
    await refresh();
  }

  function setUrl(slot, url, kind = 'auto') {
    const s = SP.store.state;
    const u = url.trim();
    let name = u;
    try { const x = new URL(SP.util.normalizeUrl(u)); name = x.hostname.replace(/^www\./, '') + (x.pathname.length > 1 ? x.pathname : ''); } catch (e) { /* ruta relativa */ }
    s.bg.videos[slot] = { src: 'url', kind, url: u, name, stamp: Date.now() };
    s.bg.mode = 'video';
    SP.store.save();
    currentKey = null;
    return refresh();
  }

  async function clearSlot(slot) {
    const s = SP.store.state;
    s.bg.videos[slot] = null;
    try { await SP.idb.del('video-' + slot); } catch (e) { /* nada */ }
    if (!s.bg.videos.dark && !s.bg.videos.light) s.bg.mode = 'default';
    SP.store.save();
    currentKey = null;
    return refresh();
  }

  document.addEventListener('sp:theme', () => refresh());

  SP.background = { refresh, setFile, setUrl, clearSlot, activeSlot, detectKind, KINDS };
})(window.SP);
