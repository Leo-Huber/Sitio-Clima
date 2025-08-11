import { getStore } from '@netlify/blobs';

export async function handler() {
  try {
    const store = getStore({ name: 'rain-logs', consistency: 'eventual' });
    const raw = (await store.get('rain-logs.json')) || '[]';
    const data = JSON.parse(raw);

    const headers = [
      'date',
      'city',
      'country',
      'timezone',
      'anyHourBetween_07_17',
      'minTemp',
      'maxTemp',
      'totalRainMm_approx',
      'samples'
    ];

    const rows = data.map((r) => [
      r.date,
      safe(r.city),
      safe(r.country),
      r.timezone,
      r.anyHourBetween_07_17 ? 'true' : 'false',
      round(r.minTemp),
      round(r.maxTemp),
      round(r.totalRainMm_approx),
      r.samples
    ]);

    const csv = toCSV([headers, ...rows]);

    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="rain-logs.csv"'
      },
      body: csv
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error generando CSV' };
  }
}

function toCSV(matrix) {
  // Escapar comillas y separar por coma; agregar BOM para Excel
  const bom = '\uFEFF';
  const lines = matrix.map(cols =>
    cols.map(c => {
      const s = String(c ?? '');
      const needsQuotes = /[",\n]/.test(s);
      const escaped = s.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    }).join(',')
  );
  return bom + lines.join('\n');
}
const safe = (v) => (v == null ? '' : String(v));
const round = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : '');
