import { getStore } from '@netlify/blobs';

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const city = (url.searchParams.get('city') || 'Asunción').trim();

    const api = new URL('https://api.openweathermap.org/data/2.5/forecast');
    api.searchParams.set('q', city);
    api.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    api.searchParams.set('units', 'metric');
    api.searchParams.set('lang', 'es');

    const r = await fetch(api);
    const forecast = await r.json();
    if (!r.ok) return json(r.status, { error: forecast?.message || 'Error consultando forecast' });

    const tz = forecast?.city?.timezone || 0;
    const cityName = forecast?.city?.name || city;
    const country = forecast?.city?.country || 'PY';

    const rainyBlocks = (forecast.list || []).filter((i) => {
      const hasRain = (i.rain && ((i.rain['3h'] || i.rain['1h'] || 0) > 0)) ||
                      (i.weather && i.weather[0] && isRainCode(i.weather[0].id));
      if (!hasRain) return false;
      const local = new Date((i.dt + tz) * 1000);
      const hour = local.getUTCHours();
      return hour >= 7 && hour <= 17;
    });

    const daysMap = new Map();
    rainyBlocks.forEach((i) => {
      const local = new Date((i.dt + tz) * 1000);
      const key = yyyy_mm_dd(local);
      const temp = i?.main?.temp;
      const vol  = i?.rain?.['3h'] || i?.rain?.['1h'] || 0;
      const desc = i?.weather?.[0]?.description || 'lluvia';
      const icon = i?.weather?.[0]?.icon || '10d';

      if (!daysMap.has(key)) {
        daysMap.set(key, {
          date: key,
          city: cityName,
          country,
          timezone: tz,
          anyHourBetween_07_17: true,
          minTemp: temp,
          maxTemp: temp,
          totalRainMm_approx: vol,
          samples: 1,
          sampleDesc: desc,
          sampleIcon: icon
        });
      } else {
        const d = daysMap.get(key);
        if (typeof temp === 'number') {
          d.minTemp = Math.min(d.minTemp ?? temp, temp);
          d.maxTemp = Math.max(d.maxTemp ?? temp, temp);
        }
        d.totalRainMm_approx += vol || 0;
        d.samples += 1;
      }
    });

    const store = getStore({ name: 'rain-logs', consistency: 'eventual' });
    const currentRaw = (await store.get('rain-logs.json')) || '[]';
    let current = [];
    try { current = JSON.parse(currentRaw) || []; } catch { current = []; }

    const newEntries = Array.from(daysMap.values()).filter((entry) =>
      !current.some(e => e.date === entry.date && e.city === entry.city)
    );

    if (newEntries.length > 0) {
      const updated = [...current, ...newEntries];
      await store.set('rain-logs.json', JSON.stringify(updated, null, 2), {
        metadata: { contentType: 'application/json' }
      });
    }

    return json(200, { ok: true, added: newEntries.length });
  } catch (err) {
    console.error('log-rain error:', err);
    return json(500, { error: 'Error interno registrando lluvia' });
  }
}

function isRainCode(id) { return (id >= 200 && id <= 232) || (id >= 300 && id <= 321) || (id >= 500 && id <= 531); }
function yyyy_mm_dd(d) { const y=d.getUTCFullYear(), m=String(d.getUTCMonth()+1).padStart(2,'0'), day=String(d.getUTCDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function json(statusCode, body){ return { statusCode, headers:{'content-type':'application/json; charset=utf-8'}, body: JSON.stringify(body) }; }
