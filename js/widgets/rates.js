/* ==========================================================================
   Startpage · Cotizaciones
   Dólar en Argentina (DolarApi: oficial, blue, MEP, CCL, tarjeta, cripto),
   criptomonedas (CoinGecko) y monedas del mundo (ExchangeRate-API).
   Todas gratis y sin clave. Se actualiza cada 10 minutos.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, fmtNumber } = SP.util;

  const CRYPTO = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', tether: 'USDT' };
  const FX_LIST = ['EUR', 'BRL', 'ARS', 'CLP', 'UYU', 'MXN', 'COP', 'PEN', 'GBP', 'JPY', 'CNY'];

  /* Tipos de cambio compartidos (también los usa el conversor) */
  let fxCache = null;
  async function getFx() {
    if (fxCache && Date.now() - fxCache.at < 6 * 36e5) return fxCache.rates;
    try {
      const saved = JSON.parse(localStorage.getItem('startpage:fx') || 'null');
      if (saved && Date.now() - saved.at < 6 * 36e5) { fxCache = saved; return saved.rates; }
    } catch (e) { /* nada */ }
    const r = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!r.ok) throw new Error('monedas ' + r.status);
    const j = await r.json();
    fxCache = { at: Date.now(), rates: j.rates };
    try { localStorage.setItem('startpage:fx', JSON.stringify(fxCache)); } catch (e) { /* nada */ }
    return j.rates;
  }

  async function fetchAll(show) {
    const out = { at: Date.now() };
    const jobs = [];
    if (show.dolar) {
      jobs.push(fetch('https://dolarapi.com/v1/dolares').then((r) => r.json()).then((j) => {
        out.dolar = j.map((x) => ({ name: x.nombre, buy: x.compra, sell: x.venta }));
      }).catch(() => {}));
    }
    if (show.crypto) {
      const ids = Object.keys(CRYPTO).join(',');
      jobs.push(fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`).then((r) => r.json()).then((j) => {
        out.crypto = Object.entries(CRYPTO).filter(([id]) => j[id]).map(([id, sym]) => ({ sym, usd: j[id].usd, ch: j[id].usd_24h_change }));
      }).catch(() => {}));
    }
    if (show.fx && show.fx.length) {
      jobs.push(getFx().then((rates) => { out.fx = show.fx.filter((c) => rates[c]).map((c) => ({ code: c, rate: rates[c] })); }).catch(() => {}));
    }
    await Promise.all(jobs);
    return out;
  }

  SP.board.register('rates', {
    label: 'Cotizaciones',
    icon: 'dollar',
    size: [290, 330],
    min: [200, 150],
    color: 'glass',
    create: () => ({ show: { dolar: true, crypto: true, fx: ['EUR', 'BRL'] }, cache: null }),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('rates-body');
      const money = (v, max = 2) => (v == null ? '—' : '$' + fmtNumber(v, max));
      const draw = () => {
        const c = d.cache;
        if (!c) { body.replaceChildren(h('p', { class: 'rss-msg', text: 'Cargando cotizaciones…' })); return; }
        if (!c.dolar && !c.crypto && !c.fx) {
          body.replaceChildren(h('div', { class: 'rss-msg' }, 'No se pudieron cargar las cotizaciones (¿sin conexión?). ',
            h('button', { type: 'button', class: 'linkish', text: 'Reintentar', onclick: () => refresh(true) })));
          return;
        }
        const sec = (title, rows) => (rows && rows.length ? [h('div', { class: 'rates-sec', text: title }), ...rows] : []);
        body.replaceChildren(h('div', { class: 'rates-list' },
          sec('Dólar (Argentina) · compra / venta', (c.dolar || []).map((x) => h('div', { class: 'rates-row' },
            h('span', { class: 'rates-name', text: x.name }),
            h('span', { class: 'rates-val' }, h('small', { text: money(x.buy, 0) }), ' ', money(x.sell, 0))))),
          sec('Cripto (USD) · 24 h', (c.crypto || []).map((x) => h('div', { class: 'rates-row' },
            h('span', { class: 'rates-name', text: x.sym }),
            h('span', { class: 'rates-val' }, money(x.usd, x.usd < 10 ? 3 : 0), ' ',
              h('small', { class: x.ch >= 0 ? 'up' : 'down', text: (x.ch >= 0 ? '▲' : '▼') + Math.abs(x.ch || 0).toFixed(1) + '%' }))))),
          sec('1 USD equivale a', (c.fx || []).map((x) => h('div', { class: 'rates-row' },
            h('span', { class: 'rates-name', text: x.code }),
            h('span', { class: 'rates-val', text: fmtNumber(x.rate, x.rate < 10 ? 3 : 1) })))),
          h('small', { class: 'rates-at', text: 'Actualizado ' + new Date(c.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) })));
      };
      const refresh = async (force) => {
        if (!force && d.cache && Date.now() - d.cache.at < 10 * 60000) return;
        const c = await fetchAll(d.show);
        if (!c.dolar && !c.crypto && !c.fx && d.cache && (d.cache.dolar || d.cache.crypto || d.cache.fx)) return; // sin conexión: queda lo último
        d.cache = c; ctx.save(); draw();
      };
      ctx.refreshRates = () => refresh(true);
      draw();
      refresh(false);
      const t = setInterval(() => refresh(false), 60000);
      return () => clearInterval(t);
    },
    menu(n, ctx) {
      const s = n.data.show;
      return [
        { icon: 'refresh', label: 'Actualizar', fn: () => ctx.refreshRates && ctx.refreshRates() },
        { icon: 'dollar', label: (s.dolar ? 'Ocultar' : 'Mostrar') + ' dólar Argentina', fn: () => { s.dolar = !s.dolar; n.data.cache = null; ctx.save(); ctx.rerender(); } },
        { icon: 'bolt', label: (s.crypto ? 'Ocultar' : 'Mostrar') + ' cripto', fn: () => { s.crypto = !s.crypto; n.data.cache = null; ctx.save(); ctx.rerender(); } },
        {
          icon: 'globe', label: 'Elegir monedas…',
          fn: async () => {
            const r = await SP.ui.modal({
              title: 'Monedas a mostrar',
              fields: [{ name: 'fx', label: 'Códigos separados por coma', value: (s.fx || []).join(', '), hint: 'Ej.: ' + FX_LIST.join(', ') }],
            });
            if (!r) return;
            s.fx = r.fx.toUpperCase().split(/[\s,;]+/).filter((x) => /^[A-Z]{3}$/.test(x)).slice(0, 12);
            n.data.cache = null; ctx.save(); ctx.rerender();
          },
        },
      ];
    },
  });

  SP.rates = { getFx };
})(window.SP);
