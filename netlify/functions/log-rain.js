import { getStore } from '@netlify/blobs';

export async function handler(event) {
  try {
    // ciudad fija por requerimiento (Asunción, PY); permite override con ?city=
    const url = new URL(event.rawUrl);
    const city = (url.searchParams.get('city') || 'Asunción').trim();

    // 1) Traer pronóstico 5 días / 3h (métrico, es)
    const api = new URL('https://api.openweathermap.org/data/2.5/forecast');
    api.searchParams.set('q', city);
    api.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    api.searchParams.set('units', 'metric');
    api.searchParams.set('lang', 'es');

    const r = await fetch(api);
    const forecast = await r.json();
    if (!r.ok) {
      return json(r.status, { error: forecast?.message || 'Error consultando forecast' });
    }

    const tz = forecast?.city?.timezone || 0; // offset en segundos vs UTC
    const items = forecast.list || [];

    // 2) Filtrar bloques con lluvia entre 07:00–17:00 (hora local de la ciudad)
    const rainyBlocks = items.filter((i) => {
      const hasRain =
        (i.rain && (i.rain['3h'] || i.rain['1h'] || 0) > 0) ||
        (i.weather && i.weather[0] && isRainCode(i.weather[0].id));

      if (!hasRain) return false;

      // convertir dt (UTC seg) a hora local de la ciudad
      const local = new Date((i.dt + tz) * 1000);
      const hour = local.getUTCHours(); // ya ajustado por tz
      return hour >= 7 && hour <= 17;
    });

    // 3) Reducir a "días" con lluvia en esa franja (sin duplicar la misma fecha)
    const daysMap = new Map();
    rainyBlocks.forEach((i) => {
      const local = new Date((i.dt + tz) * 1000);
      const key = yyyy_mm_dd(local); // fecha local de la ciudad
      const vol = (i.rain?.['3h'] || i.rain?.['1h'] || 0);
      const desc = i.weather?.[0]?.description || 'lluvia';
      const icon = i.weather?.[0]?.icon || '10d';
      const temp = i.main?.temp;

      if (!daysMap.has(key)) {
        daysMap.set(key, {
          date: key,
          city: forecast.city?.name || city,
          country: forecast.city?.country || 'PY',
          timezone: tz,
          anyHourBetween_07_17: true,
          // acumulamos un mínimo de info útil:
          minTemp: temp,
          maxTemp: temp,
          totalRainMm_approx: vol,
          samples: 1,
          sampleDesc: desc,
          sampleIcon: icon
        });
      } else {
        const ref = daysMap.get(key);
        ref.minTemp = Math.min(ref.minTemp, temp);
        ref.maxTemp = Math.max(ref.maxTemp, temp);
        ref.totalRainMm_approx += vol;
        ref.samples += 1;
      }
    });

    if (daysMap.size === 0) {
      return json(200, { ok: true, logAdded: false, message: 'No hubo lluvia entre 07–17 en el rango consultado.' });
    }

    // 4) Guardar (append) en Netlify Blobs
    const store = getStore({ name: 'rain-logs', consistency: 'eventual' }); // nombre lógico del bucket
    // Leer existente
    const currentRaw = (await store.get('rain-logs.json')) || '[]';
    const current = JSON.parse(currentRaw);

    // Evitar duplicados por fecha+ciudad
    const newEntries = Array.from(daysMap.values()).filter((entry) => {
      return !current.some(e => e.date === entry.date && e.city === entry.city);
    });

    if (newEntries.length > 0) {
      const updated = [...current, ...newEntries];
      await store.set('rain-logs.json', JSON.stringify(updated, null, 2), {
        metadata: { contentType: 'application/json' }
      });
    }

    return json(200, { ok: true, logAdded: newEntries.length > 0, added: newEntries.length });
  } catch (err) {
    console.error(err);
    return json(500, { error: 'Error interno registrando lluvia' });
  }
}

function isRainCode(id) {
  // 2xx tormentas, 3xx llovizna, 5xx lluvia
  return (id >= 200 && id <= 232) || (id >= 300 && id <= 321) || (id >= 500 && id <= 531);
}
function yyyy_mm_dd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}
