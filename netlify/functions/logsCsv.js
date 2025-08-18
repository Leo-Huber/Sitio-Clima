const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const store = getStore('rain-logs');
    const key = 'asuncion.json';
    const items = (await store.get(key, { type: 'json' })) || [];

    const header = ['ts_servidor','ts_local','mm','descripcion'];
    const rows = items.map(r => [
      r.ts || '',
      r.localTimeISO || '',
      (Number(r.mm) || 0).toString().replace('.', ','),
      (r.description || '').replace(/"/g, '""')
    ]);
    const csv = [header.join(','), ...rows.map(c => c.map(v => `"${v}"`).join(','))].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lluvias_asuncion.csv"',
        'Cache-Control': 'no-store'
      },
      body: '\uFEFF' + csv
    };
  } catch (e) {
    console.error('logsCsv error', e);
    return { statusCode: 500, body: 'CSV generation failed' };
  }
};
