import { getStore } from '@netlify/blobs';

export async function handler() {
  try {
    const store = getStore({ name: 'rain-logs', consistency: 'eventual' });

    // Si no existe, devolvemos CSV vacío (con headers)
    const raw = (await store.get('rain-logs.json')) || '[]';

    let data;
    try {
      data = JSON.parse(raw);
      if (!Array.isArray(data)) data = [];
    } catch {
      // Si hay corrupción de formato, no rompemos: devolvemos vacío
      data = [];
    }

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
      safe(r?.date),
      safe(r?.city),
      safe(r?.country),
      num(r?.timezone),
      r?.anyHourBetween_07_17 ? 'true' : 'false',
      num(r?.minTemp),
      num(r?.maxTemp),
      num(r?.totalRainMm_approx),
      num(r?.samples)
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
    // Log interno para ver en Netlify → Functions → Logs
    console.error('logs-csv error:', err);
    return { statusCode: 500, body: 'Error generando CSV' };
  }
}

function toCSV(matrix) {
  const bom = '\uFEFF'; // para Excel
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
const num  = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10) / 10 : '');
