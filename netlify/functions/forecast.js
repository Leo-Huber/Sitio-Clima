const fetch = global.fetch;

exports.handler = async (event) => {
  try {
    const city = (event.queryStringParameters?.city || 'Asunción').trim();
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'es');

    const r = await fetch(url);
    const data = await r.json(); // debe contener { list: [...], city: { timezone, ... } }
    return { statusCode: r.ok ? 200 : r.status, body: JSON.stringify(data) };
  } catch (e) {
    console.error('forecast error', e);
    return { statusCode: 500, body: JSON.stringify({ message: 'Error pronóstico' }) };
  }
};
