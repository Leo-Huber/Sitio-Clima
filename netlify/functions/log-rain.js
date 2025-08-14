const { getStore } = require('@netlify/blobs');

// Guarda registros de lluvia solo para Asunción de 07:00 a 17:00
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const payload = JSON.parse(event.body || '{}');
    const { city, localTimeISO, mm, description } = payload;

    // Normaliza ciudad (acentos y case)
    const isAsuncion = (city || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() === 'asuncion';
    if (!isAsuncion) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'city' }) };
    }

    // Ventana 07:00–17:00 (hora local que envías desde el front)
    const dt = new Date(localTimeISO);
    const hour = dt.getHours();
    if (hour < 7 || hour >= 17) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'time' }) };
    }

    const store = getStore('rain-logs');                 // “bucket” lógico
    const key = 'asuncion.json';                         // una sola clave
    const current = (await store.get(key, { type: 'json' })) || [];

    current.push({
      ts: new Date().toISOString(),                     // sello servidor
      localTimeISO,
      mm: Number(mm) || 0,
      description: description || '',
    });

    await store.set(key, JSON.stringify(current), { metadata: { updatedBy: 'log-rain' } });

    return { statusCode: 200, body: JSON.stringify({ ok: true, count: current.length }) };
  } catch (err) {
    console.error('log-rain error', err);
    return { statusCode: 500, body: 'log-rain failed' };
  }
};
