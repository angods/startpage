/* ==========================================================================
   Startpage · Clima (Open-Meteo, gratis y sin API key)
   Buscás tu ciudad, se guarda, y se actualiza cada 15 minutos.
   ========================================================================== */
(function (SP) {
  'use strict';
  const { h } = SP.util;
  const REFRESH_MS = 15 * 60 * 1000;

  const CODES = {
    0: ['Despejado', '☀️', '🌙'],
    1: ['Mayormente despejado', '🌤️', '🌙'],
    2: ['Parcialmente nublado', '⛅', '☁️'],
    3: ['Nublado', '☁️', '☁️'],
    45: ['Niebla', '🌫️'], 48: ['Niebla escarchada', '🌫️'],
    51: ['Llovizna leve', '🌦️'], 53: ['Llovizna', '🌦️'], 55: ['Llovizna intensa', '🌧️'],
    56: ['Llovizna helada', '🌧️'], 57: ['Llovizna helada', '🌧️'],
    61: ['Lluvia leve', '🌦️'], 63: ['Lluvia', '🌧️'], 65: ['Lluvia fuerte', '🌧️'],
    66: ['Lluvia helada', '🌧️'], 67: ['Lluvia helada', '🌧️'],
    71: ['Nevada leve', '🌨️'], 73: ['Nevada', '🌨️'], 75: ['Nevada fuerte', '❄️'], 77: ['Granizo fino', '🌨️'],
    80: ['Chaparrones', '🌦️'], 81: ['Chaparrones', '🌧️'], 82: ['Chaparrones fuertes', '⛈️'],
    85: ['Chaparrones de nieve', '🌨️'], 86: ['Chaparrones de nieve', '🌨️'],
    95: ['Tormenta', '⛈️'], 96: ['Tormenta con granizo', '⛈️'], 99: ['Tormenta con granizo', '⛈️'],
  };
  function wx(code, isDay = 1) {
    const c = CODES[code] || ['—', '🌡️'];
    return { text: c[0], emoji: !isDay && c[2] ? c[2] : c[1] };
  }

  async function searchCities(q) {
    const u = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`;
    const r = await fetch(u);
    if (!r.ok) throw new Error('geo');
    const j = await r.json();
    return (j.results || []).map((c) => ({
      name: c.name, region: c.admin1 || '', country: c.country || '', cc: c.country_code || '',
      lat: c.latitude, lon: c.longitude,
    }));
  }

  async function fetchWeather(place, unit) {
    let u = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
      '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5';
    if (unit === 'f') u += '&temperature_unit=fahrenheit&wind_speed_unit=mph';
    const r = await fetch(u);
    if (!r.ok) throw new Error('wx');
    const j = await r.json();
    return { at: Date.now(), unit, key: place.lat + ',' + place.lon, current: j.current, daily: j.daily };
  }

  async function reverseName(lat, lon) {
    try {
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
      const j = await r.json();
      return j.city || j.locality || j.principalSubdivision || 'Mi ubicación';
    } catch (e) { return 'Mi ubicación'; }
  }

  /* ---------- Vista: elegir ciudad ---------- */
  function renderPicker(body, n, ctx) {
    const input = h('input', { class: 'wx-input', placeholder: 'Buscá tu ciudad…', spellcheck: 'false', autocomplete: 'off' });
    const results = h('div', { class: 'wx-results' });
    const status = h('div', { class: 'wx-status' });
    let seq = 0;

    const choose = (p) => {
      n.data.place = p; n.data.cache = null;
      ctx.save(); ctx.rerender();
    };

    const doSearch = SP.util.debounce(async () => {
      const q = input.value.trim();
      const my = ++seq;
      if (q.length < 2) { results.replaceChildren(); status.textContent = ''; return; }
      status.textContent = 'Buscando…';
      try {
        const list = await searchCities(q);
        if (my !== seq) return;
        status.textContent = list.length ? '' : 'Sin resultados';
        results.replaceChildren(...list.map((c) => h('button', {
          class: 'wx-result', type: 'button', onclick: () => choose(c),
        }, h('strong', { text: c.name }), h('span', { text: [c.region, c.country].filter(Boolean).join(', ') }))));
      } catch (e) {
        if (my === seq) status.textContent = 'Sin conexión';
      }
    }, 320);
    input.addEventListener('input', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const f = results.querySelector('button'); if (f) f.click(); }
    });

    const locate = h('button', {
      class: 'wx-locate', type: 'button', title: 'Usar mi ubicación', html: SP.icon('locate', 16),
      onclick: () => {
        if (!navigator.geolocation) { status.textContent = 'Tu navegador no permite ubicación'; return; }
        status.textContent = 'Obteniendo ubicación…';
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          choose({ name: await reverseName(lat, lon), region: '', country: '', lat, lon });
        }, () => { status.textContent = 'No se pudo obtener la ubicación'; }, { timeout: 10000 });
      },
    });

    body.append(h('div', { class: 'wx-pick' },
      h('div', { class: 'wx-pick-title', text: '¿De dónde querés el clima?' }),
      h('div', { class: 'wx-search' }, h('span', { html: SP.icon('search', 15) }), input, locate),
      status, results));
    if (ctx.focusPicker) { ctx.focusPicker = false; setTimeout(() => input.focus({ preventScroll: true }), 50); }
  }

  /* ---------- Vista: clima ---------- */
  function renderWeather(body, n, ctx) {
    const unit = n.data.unit || 'c';
    const root = h('div', { class: 'wx' });
    body.append(root);

    const paint = (c) => {
      const cur = c.current;
      const w = wx(cur.weather_code, cur.is_day);
      const deg = (v) => Math.round(v) + '°';
      const days = c.daily.time.map((t, i) => {
        const d = new Date(t + 'T12:00');
        const label = i === 0 ? 'Hoy' : d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '');
        return h('div', { class: 'wx-day' },
          h('span', { class: 'wx-day-name', text: label }),
          h('span', { class: 'wx-day-ico', text: wx(c.daily.weather_code[i]).emoji }),
          h('span', { class: 'wx-day-t' }, h('b', { text: deg(c.daily.temperature_2m_max[i]) }), ' ', deg(c.daily.temperature_2m_min[i])));
      });
      root.replaceChildren(
        h('div', { class: 'wx-place' }, h('span', { html: SP.icon('pin', 13) }), h('span', { text: n.data.place.name })),
        h('div', { class: 'wx-main' },
          h('span', { class: 'wx-emoji', text: w.emoji }),
          h('button', {
            class: 'wx-temp', type: 'button', title: 'Cambiar °C / °F',
            onclick: () => { n.data.unit = unit === 'c' ? 'f' : 'c'; n.data.cache = null; ctx.save(); ctx.rerender(); },
          }, deg(cur.temperature_2m), h('small', { text: unit === 'c' ? 'C' : 'F' }))),
        h('div', { class: 'wx-desc', text: `${w.text} · Sensación ${deg(cur.apparent_temperature)}` }),
        h('div', { class: 'wx-meta' },
          h('span', { text: `↑ ${deg(c.daily.temperature_2m_max[0])}  ↓ ${deg(c.daily.temperature_2m_min[0])}` }),
          h('span', { text: `💧 ${cur.relative_humidity_2m}%` }),
          h('span', { text: `💨 ${Math.round(cur.wind_speed_10m)} ${unit === 'c' ? 'km/h' : 'mph'}` })),
        h('div', { class: 'wx-days' }, days));
    };

    const load = async (force) => {
      const p = n.data.place;
      const c = n.data.cache;
      const fresh = c && c.unit === unit && c.key === p.lat + ',' + p.lon && Date.now() - c.at < REFRESH_MS;
      if (c && c.unit === unit && c.current) paint(c);
      else root.replaceChildren(h('div', { class: 'wx-status center', text: 'Cargando clima…' }));
      if (fresh && !force) return;
      try {
        n.data.cache = await fetchWeather(p, unit);
        ctx.save();
        if (root.isConnected) paint(n.data.cache);
      } catch (e) {
        if (!c && root.isConnected) {
          root.replaceChildren(h('div', { class: 'wx-status center' }, 'Sin conexión. ',
            h('button', { class: 'linkish', type: 'button', text: 'Reintentar', onclick: () => load(true) })));
        }
      }
    };
    ctx.reload = () => load(true);
    load(false);
    const t = setInterval(() => load(false), 60 * 1000);
    return () => clearInterval(t);
  }

  SP.board.register('weather', {
    label: 'Clima',
    icon: 'cloud',
    size: [270, 230],
    min: [170, 140],
    color: 'sky',
    create: (o) => ({ place: o.place || null, unit: o.unit || 'c', cache: null }),
    render(body, n, ctx) {
      body.classList.add('wx-body');
      if (!n.data.place) return renderPicker(body, n, ctx);
      return renderWeather(body, n, ctx);
    },
    menu(n, ctx) {
      const items = [{ icon: 'pin', label: 'Cambiar ciudad', fn: () => { n.data.place = null; n.data.cache = null; ctx.focusPicker = true; ctx.save(); ctx.rerender(); } }];
      if (n.data.place) {
        items.push(
          { icon: 'refresh', label: 'Actualizar', fn: () => ctx.reload && ctx.reload() },
          { icon: 'sun', label: n.data.unit === 'f' ? 'Usar °C' : 'Usar °F', fn: () => { n.data.unit = n.data.unit === 'f' ? 'c' : 'f'; n.data.cache = null; ctx.save(); ctx.rerender(); } },
        );
      }
      return items;
    },
  });
})(window.SP);
