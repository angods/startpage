/* ==========================================================================
   Startpage · Conversor de unidades y monedas
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h, fmtNumber } = SP.util;

  // Factor a la unidad base de cada categoría
  const CATS = {
    length: { label: 'Longitud', units: { mm: ['Milímetros', 0.001], cm: ['Centímetros', 0.01], m: ['Metros', 1], km: ['Kilómetros', 1000], in: ['Pulgadas', 0.0254], ft: ['Pies', 0.3048], yd: ['Yardas', 0.9144], mi: ['Millas', 1609.344] } },
    weight: { label: 'Peso', units: { g: ['Gramos', 1], kg: ['Kilos', 1000], t: ['Toneladas', 1e6], oz: ['Onzas', 28.3495], lb: ['Libras', 453.592] } },
    temp: { label: 'Temperatura', units: { c: ['Celsius', null], f: ['Fahrenheit', null], k: ['Kelvin', null] } },
    volume: { label: 'Volumen', units: { ml: ['Mililitros', 0.001], l: ['Litros', 1], m3: ['Metros³', 1000], cup: ['Tazas', 0.24], gal: ['Galones (EE.UU.)', 3.78541], floz: ['Onzas líquidas', 0.0295735] } },
    speed: { label: 'Velocidad', units: { kmh: ['km/h', 1 / 3.6], ms: ['m/s', 1], mph: ['mph', 0.44704], kn: ['Nudos', 0.514444] } },
    area: { label: 'Superficie', units: { m2: ['m²', 1], ha: ['Hectáreas', 1e4], km2: ['km²', 1e6], ft2: ['Pies²', 0.092903], ac: ['Acres', 4046.86] } },
    data: { label: 'Datos', units: { b: ['Bytes', 1], kb: ['KB', 1e3], mb: ['MB', 1e6], gb: ['GB', 1e9], tb: ['TB', 1e12], kib: ['KiB', 1024], mib: ['MiB', 1048576], gib: ['GiB', 1073741824] } },
    time: { label: 'Tiempo', units: { s: ['Segundos', 1], min: ['Minutos', 60], h: ['Horas', 3600], d: ['Días', 86400], wk: ['Semanas', 604800], y: ['Años', 31557600] } },
    money: { label: 'Monedas', units: {} },
  };
  const MONEY = ['USD', 'EUR', 'ARS', 'BRL', 'CLP', 'UYU', 'MXN', 'COP', 'PEN', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF'];

  function toC(v, u) { return u === 'c' ? v : u === 'f' ? (v - 32) * 5 / 9 : v - 273.15; }
  function fromC(v, u) { return u === 'c' ? v : u === 'f' ? v * 9 / 5 + 32 : v + 273.15; }

  SP.board.register('converter', {
    label: 'Conversor',
    icon: 'swap',
    size: [300, 210],
    min: [230, 170],
    color: 'sky',
    create: () => ({ cat: 'length', from: 'km', to: 'mi', value: '1' }),
    render(body, n, ctx) {
      const d = n.data;
      body.classList.add('conv-body');
      let rates = null;

      const unitsOf = (cat) => (cat === 'money' ? Object.fromEntries(MONEY.map((c) => [c, [c, null]])) : CATS[cat].units);
      const convert = (v) => {
        if (d.cat === 'temp') return fromC(toC(v, d.from), d.to);
        if (d.cat === 'money') return rates && rates[d.from] && rates[d.to] ? v / rates[d.from] * rates[d.to] : NaN;
        const u = CATS[d.cat].units;
        return v * u[d.from][1] / u[d.to][1];
      };

      const catSel = h('select', { class: 'conv-select', 'aria-label': 'Categoría' }, Object.entries(CATS).map(([k, c]) => h('option', { value: k, text: c.label })));
      const fromSel = h('select', { class: 'conv-select', 'aria-label': 'De' });
      const toSel = h('select', { class: 'conv-select', 'aria-label': 'A' });
      const input = h('input', { class: 'conv-input', type: 'text', inputmode: 'decimal', value: d.value, 'aria-label': 'Valor' });
      const out = h('output', { class: 'conv-out' });
      const swap = h('button', { type: 'button', class: 'conv-swap', title: 'Invertir', 'aria-label': 'Invertir', html: SP.icon('swap', 15) });

      const fillUnits = () => {
        const units = unitsOf(d.cat);
        const opts = () => Object.entries(units).map(([k, u]) => h('option', { value: k, text: u[0] }));
        fromSel.replaceChildren(...opts()); toSel.replaceChildren(...opts());
        if (!units[d.from]) d.from = Object.keys(units)[0];
        if (!units[d.to]) d.to = Object.keys(units)[1];
        fromSel.value = d.from; toSel.value = d.to;
      };
      const calc = () => {
        const v = parseFloat(String(input.value).replace(/\./g, (m, i, s) => (s.includes(',') ? '' : m)).replace(',', '.'));
        if (Number.isNaN(v)) { out.textContent = '—'; return; }
        if (d.cat === 'money' && !rates) { out.textContent = 'Cargando…'; return; }
        const r = convert(v);
        out.textContent = Number.isFinite(r) ? fmtNumber(r, Math.abs(r) < 1 ? 6 : 3) + ' ' + (d.cat === 'money' ? d.to : '') : '—';
      };
      catSel.value = d.cat;
      fillUnits();
      catSel.addEventListener('change', () => {
        d.cat = catSel.value; d.from = ''; d.to = ''; fillUnits(); ctx.save(); calc();
        if (d.cat === 'money') loadRates();
      });
      fromSel.addEventListener('change', () => { d.from = fromSel.value; ctx.save(); calc(); });
      toSel.addEventListener('change', () => { d.to = toSel.value; ctx.save(); calc(); });
      input.addEventListener('input', () => { d.value = input.value; ctx.save(); calc(); });
      swap.addEventListener('click', () => { [d.from, d.to] = [d.to, d.from]; fromSel.value = d.from; toSel.value = d.to; ctx.save(); calc(); swap.classList.toggle('turn'); });

      const loadRates = async () => {
        try { rates = await SP.rates.getFx(); calc(); } catch (e) { out.textContent = 'Sin conexión para monedas'; }
      };
      if (d.cat === 'money') loadRates();

      body.append(catSel, h('div', { class: 'conv-row' }, input, fromSel), h('div', { class: 'conv-mid' }, swap), h('div', { class: 'conv-row' }, out, toSel));
      calc();
    },
  });
})(window.SP);
