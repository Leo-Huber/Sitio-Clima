const { getStore } = require('@netlify/blobs');

function toCSV(rows) {
  return rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

exports.handler = async () => {
  try {
    const store = getStore('rain-logs');
    const key = 'asuncion.json';
    const logs = (await store.get(key, { type: 'json' })) || [];

    const header = ['fecha_servidor', 'hora_local', 'mm', 'descripcion'];
    const rows = logs.map((it) => [
      it.ts || '',
      it.localTimeISO || '',
      it.mm ?? '',
      it.description ?? '',
    ]);

    const csv = '\uFEFF' + toCSV([header, ...rows]); // BOM para Excel

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="asuncion-lluvia.csv"',
        'Cache-Control': 'no-store',
      },
      body: csv,
    };
  } catch (err) {
    console.error('logs-csv error', err);
    // Devuelve CSV mínimo aunque falle (evita 500 en el navegador)
    const csv = '\uFEFF' + toCSV([['fecha_servidor', 'hora_local', 'mm', 'descripcion']]);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="asuncion-lluvia.csv"',
      },
      body: csv,
    };
  }
};
