const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    let payload = {};
    try { payload = JSON.parse(event.body || '{}'); } catch {}
    const { city, localTimeISO, mm, description } = payload;

    const isAsuncion = (city || '')
      .normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() === 'asuncion';
    if (!isAsuncion) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'city' }) };

    const dt = new Date(localTimeISO || Date.now());
    const hour = dt.getHours();
    if (hour < 7 || hour >= 17) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'time' }) };

    const store = getStore('rain-logs');
    const key = 'asuncion.json';
    const current = (await store.get(key, { type: 'json' })) || [];

    current.push({ ts: new Date().toISOString(), localTimeISO: dt.toISOString(), mm: Number(mm) || 0, description: description || '' });
    await store.set(key, JSON.stringify(current), { metadata: { updatedBy: 'logRain' } });

    return { statusCode: 200, body: JSON.stringify({ ok: true, count: current.length }) };
  } catch (err) {
    console.error('logRain error', err);
    return { statusCode: 500, body: 'logRain failed' };
  }
};
