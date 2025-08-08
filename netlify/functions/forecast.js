export async function handler(event) {
  try {
    const urlObj = new URL(event.rawUrl);
    const city = (urlObj.searchParams.get('city') || '').trim();
    if (!city) {
      return resp(400, { error: 'Falta ?city' });
    }

    const api = new URL('https://api.openweathermap.org/data/2.5/forecast');
    api.searchParams.set('q', city);
    api.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    api.searchParams.set('units', 'metric');
    api.searchParams.set('lang', 'es');

    const r = await fetch(api);
    const data = await r.json();
    return resp(r.ok ? 200 : r.status, data);
  } catch (err) {
    console.error(err);
    return resp(500, { error: 'Error interno consultando forecast' });
  }
}

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  };
}
