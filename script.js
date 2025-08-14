// --- Utilidades ---
const $ = (sel) => document.querySelector(sel);
const estado = $('#estado');

function iconUrl(code){ return `https://openweathermap.org/img/wn/${code}@2x.png`; }
function fmtTemp(v){ return `${Math.round(v)}°C`; }
function fmtWind(ms){ return `${Math.round(ms*3.6)} km/h`; }
function titleCase(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function toLocal(dt, tzSeconds){ return new Date((dt + tzSeconds) * 1000); }
function dayKey(date){
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth()+1).padStart(2,'0');
  const d = String(date.getUTCDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function dayName(date){ return date.toLocaleDateString('es-ES', { weekday:'short' }).replace('.',''); }
function hourStr(date){ return date.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' }); }

// --- Render: clima actual ---
function renderActual(data){
  // Soporta respuesta OpenWeather (completa) o payload simple {city,temp,description,rain_mm}
  if (data?.main && data?.weather) {
    const { name, sys, main, weather, wind } = data;
    const w = weather[0];
    const html = `
      <div>
        <h2>${name}, ${sys.country}</h2>
        <p class="meta">${titleCase(w.description)}</p>
        <div class="temp">${fmtTemp(main.temp)}</div>
        <div class="details">
          <span>Sensación: <strong>${fmtTemp(main.feels_like)}</strong></span>
          <span>Humedad: <strong>${main.humidity}%</strong></span>
          <span>Viento: <strong>${fmtWind(wind.speed)}</strong></span>
          <span>Presión: <strong>${main.pressure} hPa</strong></span>
        </div>
      </div>
      <div class="right">
        <img alt="${w.description}" width="96" height="96" src="${iconUrl(w.icon)}"/>
      </div>`;
    $('#datosClima').innerHTML = html;
  } else {
    const ciudad = data.city || '—';
    const desc = data.description || '—';
    const temp = typeof data.temp === 'number' ? fmtTemp(data.temp) : '—';
    const html = `
      <div>
        <h2>${ciudad}</h2>
        <p class="meta">${desc}</p>
        <div class="temp">${temp}</div>
      </div>
      <div class="right"> </div>`;
    $('#datosClima').innerHTML = html;
  }
}

// --- Render: por hora (24h) usando OpenWeather forecast ---
function renderHoraria(list){
  if (!Array.isArray(list) || !list.length) { $('#listaHoraria').innerHTML = ''; return; }
  const now = Date.now();
  const prox = list.filter(i => (i.dt*1000) > now).slice(0, 8); // 8 * 3h = 24h
  $('#listaHoraria').innerHTML = prox.map(i => {
    const date = new Date(i.dt * 1000); // hora local del usuario
    return `
      <div class="hour">
        <div class="time">${hourStr(date)}</div>
        <img alt="${i.weather[0].description}" width="60" height="60" src="${iconUrl(i.weather[0].icon)}"/>
        <div class="t">${fmtTemp(i.main.temp)}</div>
        <div class="desc">${titleCase(i.weather[0].description)}</div>
      </div>`;
  }).join('');
}

// --- Render: próximos días (mín/máx por día) ---
function renderDiaria(list, cityTZ){
  if (!Array.isArray(list) || !list.length) { $('#listaDiaria').innerHTML = ''; return; }
  const grupos = new Map();
  list.forEach(i => {
    const local = toLocal(i.dt, cityTZ);
    const key = dayKey(local);
    if(!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(i);
  });

  const dias = Array.from(grupos.entries())
    .map(([key, items]) => {
      const temps = items.map(x => x.main.temp);
      const min = Math.min(...temps);
      const max = Math.max(...temps);
      const counts = {};
      items.forEach(x => { const ic = x.weather[0].icon; counts[ic] = (counts[ic]||0)+1; });
      const icon = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0][0];
      const date = new Date(key + 'T00:00:00Z');
      return { date, min, max, icon, desc: items[0].weather[0].description };
    })
    .sort((a,b)=> a.date - b.date)
    .slice(0,5);

  $('#listaDiaria').innerHTML = dias.map(d => `
    <div class="day">
      <div class="name">${dayName(d.date)}</div>
      <img alt="${d.desc}" width="64" height="64" src="${iconUrl(d.icon)}"/>
      <div class="range"><span>${fmtTemp(d.max)}</span> / <span>${fmtTemp(d.min)}</span></div>
      <div class="desc">${titleCase(d.desc)}</div>
    </div>
  `).join('');
}

// --- Búsqueda principal (usa backend serverless) ---
async function buscarCiudad(ciudad){
  if(!ciudad) return;
  estado.textContent = 'Buscando…';
  try{
    const [wResp, fResp] = await Promise.all([
      fetch(`/api/weather?city=${encodeURIComponent(ciudad)}`),
      fetch(`/api/forecast?city=${encodeURIComponent(ciudad)}`)
    ]);

    // Soportar payload simple (200/JSON) o error con message
    if(!wResp.ok){
      const err = await wResp.json().catch(()=> ({}));
      throw new Error(err.message || `Error clima actual (${wResp.status})`);
    }
    if(!fResp.ok){
      const err = await fResp.json().catch(()=> ({}));
      throw new Error(err.message || `Error pronóstico (${fResp.status})`);
    }

    const wData = await wResp.json();
    const fData = await fResp.json();

    renderActual(wData);
    renderHoraria(fData.list || []);                   // si tu forecast es mock, puede no traer list
    renderDiaria(fData.list || [], fData.city?.timezone || 0);

    // Registrar lluvia automática solo para Asunción (07–17 se valida del lado server)
    const isAsu = (ciudad || '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase() === 'asuncion';
    const looksRain = Boolean((wData?.rain?.['1h'] || wData?.rain?.['3h'] || 0) > 0 ||
                       /lluvia|rain|shower|tormenta|drizzle/i.test(wData?.description || wData?.weather?.[0]?.description || ''));
    if (isAsu && looksRain) {
      const localTimeISO = new Date().toISOString();
      const mm = wData?.rain?.['1h'] || wData?.rain?.['3h'] || 0;
      const description = wData?.description || wData?.weather?.[0]?.description || 'lluvia';
      fetch('/api/log-rain', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ city: 'Asunción', localTimeISO, mm, description })
      }).catch(()=>{ /* silencioso */ });
    }

    estado.textContent = `Actualizado: ${new Date().toLocaleTimeString('es-ES')}`;
  }catch(err){
    console.error(err);
    estado.textContent = err.message || 'Error consultando el clima.';
  }
}

// --- Eventos UI ---
document.addEventListener('DOMContentLoaded', () => {
  // Quick cities
  document.querySelectorAll('.pill[data-city]').forEach(btn => {
    btn.addEventListener('click', () => buscarCiudad(btn.dataset.city));
  });

  // Form submit + Enter
  $('#buscador').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#ciudadEntrada').value.trim();
    buscarCiudad(v);
  });

  // Acciones: log y export
  const btnLog = $('#btnLogAsu');
  if (btnLog) {
    btnLog.addEventListener('click', async () => {
      btnLog.disabled = true;
      try{
        const r = await fetch('/api/log-rain?city=' + encodeURIComponent('Asunción'), { method: 'POST', body: JSON.stringify({ city: 'Asunción', localTimeISO: new Date().toISOString(), mm: 0, description:'manual' })});
        const j = await r.json().catch(()=> ({}));
        alert(j.ok ? `Registro actualizado (agregados: ${j.added || j.count || 0})` : (j.message || 'Listo'));
      }catch(e){ alert('Error registrando lluvia'); }
      btnLog.disabled = false;
    });
  }

  const btnCsv = $('#btnExportCSV');
  if (btnCsv) {
    btnCsv.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/logs-csv', { cache:'no-store' });
        if(!res.ok) throw new Error(`CSV HTTP ${res.status}`);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'lluvias_asuncion.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (e) {
        estado.textContent = 'Error generando CSV';
        console.error(e);
      }
    });
  }

  // Ciudad por defecto
  buscarCiudad('Asunción');
});
