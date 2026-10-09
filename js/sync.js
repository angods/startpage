/* ==========================================================================
   Startpage · Sincronizar entre dispositivos (opcional) con un Gist privado
   Se usa un token de GitHub con permiso "gist". El token queda solo en este
   navegador (nunca se exporta ni viaja dentro de los datos). Las imágenes,
   dibujos y videos no se sincronizan: solo notas y ajustes.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const KEY = 'startpage:sync';
  const FILE = 'startpage.json';
  const API = 'https://api.github.com/gists';

  let cfg = load();
  let pushTimer = null;
  let applying = false;  // evita que traer datos dispare una subida
  let busy = false;

  function load() {
    try { return { auto: true, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { auto: true }; }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) { /* nada */ } }
  const ready = () => !!(cfg.token && cfg.gistId);

  async function api(path, opts = {}) {
    const r = await fetch(API + path, {
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + cfg.token,
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    if (r.status === 401) throw new Error('El token no es válido o venció');
    if (r.status === 404) throw new Error('No se encontró el Gist (¿token sin permiso "gist"?)');
    if (!r.ok) throw new Error('GitHub respondió ' + r.status);
    return r.json();
  }

  function payload() {
    return JSON.stringify({ ...SP.store.state, syncedAt: Date.now() });
  }

  async function push({ quiet = false } = {}) {
    if (!cfg.token || busy) return;
    busy = true;
    try {
      const files = { [FILE]: { content: payload() } };
      if (!cfg.gistId) {
        const g = await api('', { method: 'POST', body: JSON.stringify({ description: 'Startpage · notas y ajustes', public: false, files }) });
        cfg.gistId = g.id;
      } else {
        await api('/' + cfg.gistId, { method: 'PATCH', body: JSON.stringify({ files }) });
      }
      cfg.lastSync = Date.now(); cfg.dirty = false; cfg.error = null;
      persist();
      if (!quiet) SP.ui.toast('Subido a la nube ☁️');
    } catch (e) {
      cfg.error = e.message; persist();
      if (!quiet) SP.ui.toast('No se pudo sincronizar: ' + e.message);
    } finally { busy = false; refreshUi(); }
  }

  async function fetchRemote() {
    const g = await api('/' + cfg.gistId);
    const f = g.files && g.files[FILE];
    if (!f) return null;
    const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
    return JSON.parse(text);
  }

  async function pull({ ask = true } = {}) {
    if (!ready() || busy) return;
    busy = true;
    try {
      const data = await fetchRemote();
      if (!data || data.v !== 1 || !Array.isArray(data.notes)) { SP.ui.toast('En la nube no hay datos todavía'); return; }
      if (ask) {
        const ok = await SP.ui.modal({
          title: '¿Traer lo de la nube?',
          message: `Hay ${data.notes.length} notas guardadas el ${new Date(data.syncedAt || 0).toLocaleString('es')}. Van a reemplazar lo que hay acá.`,
          submitText: 'Traer',
        });
        if (!ok) return;
      }
      applying = true;
      delete data.syncedAt;
      SP.app.replaceState(data);
      applying = false;
      cfg.lastSync = Date.now(); cfg.dirty = false; cfg.error = null; persist();
      SP.ui.toast('Datos traídos de la nube');
    } catch (e) {
      applying = false;
      cfg.error = e.message; persist();
      SP.ui.toast('No se pudo traer: ' + e.message);
    } finally { busy = false; refreshUi(); }
  }

  /** Al abrir: si la nube tiene algo más nuevo, lo trae (o pregunta si acá también hubo cambios) */
  async function checkRemote() {
    if (!ready() || !cfg.auto) return;
    try {
      const data = await fetchRemote();
      if (!data || !data.syncedAt || data.syncedAt <= (cfg.lastSync || 0)) return;
      if (cfg.dirty) {
        const ok = await SP.ui.modal({
          title: 'Hay cambios en la nube',
          message: 'Desde otro dispositivo se guardaron cambios, y acá también cambiaste cosas. ¿Cuál querés conservar?',
          submitText: 'Traer los de la nube', cancelText: 'Quedarme con estos',
        });
        if (!ok) { push({ quiet: true }); return; }
      }
      applying = true;
      delete data.syncedAt;
      SP.app.replaceState(data);
      applying = false;
      cfg.lastSync = Date.now(); cfg.dirty = false; persist();
      SP.ui.toast('Tablero actualizado desde la nube');
    } catch (e) { applying = false; cfg.error = e.message; persist(); }
  }

  function onLocalSave() {
    if (applying || !cfg.token) return;
    cfg.dirty = true; persist();
    if (!cfg.auto || !ready()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => push({ quiet: true }), 8000);
  }

  function now() { return push(); }

  function init() {
    const orig = SP.store.saveNow.bind(SP.store);
    SP.store.saveNow = function () { orig(); onLocalSave(); };
    setTimeout(checkRemote, 1500);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && cfg.dirty && ready() && cfg.auto) push({ quiet: true });
      else if (!document.hidden) checkRemote();
    });
  }

  /* ---------- Sección en Ajustes ---------- */
  let uiEl = null;
  function refreshUi() { if (uiEl && SP.settings) SP.settings.render(); }

  function section() {
    const tokenIn = h('input', { type: 'password', class: 'set-input', placeholder: 'ghp_… o github_pat_…', value: cfg.token || '', autocomplete: 'off', 'aria-label': 'Token de GitHub' });
    const status = cfg.error ? '⚠️ ' + cfg.error
      : ready() ? '✅ Conectado' + (cfg.lastSync ? ' · última vez ' + new Date(cfg.lastSync).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) : '')
        : 'Sin conectar';
    uiEl = SP.settings.section('Sincronizar (opcional)',
      h('p', { class: 'set-hint' },
        'Guardá tus notas en un Gist privado de GitHub para tenerlas en todas tus computadoras. Creá un token con permiso ',
        h('b', { text: 'gist' }), ' en ',
        h('a', { href: 'https://github.com/settings/tokens/new?scopes=gist&description=Startpage', target: '_blank', rel: 'noopener', text: 'github.com/settings/tokens' }),
        ' y pegalo acá. Queda solo en este navegador.'),
      h('div', { class: 'row' }, tokenIn),
      cfg.token ? h('label', { class: 'field' }, h('span', { class: 'field-label', text: 'ID del Gist (para usar el mismo en otra compu)' }),
        h('input', {
          class: 'set-input', value: cfg.gistId || '', placeholder: 'Se crea solo la primera vez', spellcheck: 'false',
          onchange: (e) => { cfg.gistId = e.target.value.trim().replace(/^.*\//, '') || null; persist(); refreshUi(); },
        })) : null,
      cfg.token ? SP.settings.toggleRow('Sincronizar sola', cfg.auto, (on) => { cfg.auto = on; persist(); }, 'Sube los cambios a los pocos segundos y trae los nuevos al abrir') : null,
      h('p', { class: 'set-hint', text: status }),
      h('div', { class: 'btn-row' },
        h('button', {
          type: 'button', class: 'btn small primary',
          onclick: async () => {
            const t = tokenIn.value.trim();
            if (!t) { SP.ui.toast('Pegá un token primero'); return; }
            if (t !== cfg.token) { cfg.token = t; cfg.error = null; persist(); }
            await push();
          },
        }, h('span', { html: SP.icon('upload', 14) }), cfg.gistId ? 'Subir ahora' : 'Conectar y subir'),
        ready() ? h('button', { type: 'button', class: 'btn small', onclick: () => pull() }, h('span', { html: SP.icon('download', 14) }), 'Traer de la nube') : null,
        cfg.token ? h('button', {
          type: 'button', class: 'btn small ghost danger-text',
          onclick: () => { cfg = { auto: true }; persist(); refreshUi(); SP.ui.toast('Sincronización desconectada (el Gist sigue en tu cuenta)'); },
        }, 'Desconectar') : null));
    return uiEl;
  }

  SP.sync = { init, section, now, pull, ready };
})(window.SP);
