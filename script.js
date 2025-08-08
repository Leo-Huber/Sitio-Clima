// Helpers
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

// Render: actual
function renderActual(data){
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
}

// Render: por hora (24h)
function renderHoraria(list){
  const now = Date.now();
  const prox = list.filter(i => (i.dt*1000) > now).slice(0, 8); // 8 bloques de 3h = 24h
  $('#listaHoraria').innerHTML = prox.map(i => {
    const date = new Date(i.dt * 1000); // mostrar en hora local del usuario
    return `
      <div class="hour">
        <div class="time">${hourStr(date)}</div>
        <img alt="${i.weather[0].description}" width="60" height="60" src="${iconUrl(i.weather[0].icon)}"/>
        <div class="t">${fmtTemp(i.main.temp)}</div>
        <div class="desc">${titleCase(i.weather[0].description)}</div>
      </div>`;
  }).join('');
}

// Render: próximos días (min/máx + icono dominante)
function renderDiaria(list, cityTZ){
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
      <div class="range">
        <span>${fmtTemp(d.max)}</span> / <span>${fmtTemp(d.min)}</span>
      </div>
      <div class="desc">${titleCase(d.desc)}</div>
    </div>
  `).join('');
}

// Llamadas al backend (sin exponer API key)
async function buscarCiudad(ciudad){
  if(!ciudad) return;
  estado.textContent = 'Buscando…';
  try{
    const [wResp, fResp] = await Promise.all([
      fetch(`/api/weather?city=${encodeURIComponent(ciudad)}`),
      fetch(`/api/forecast?city=${encodeURIComponent(ciudad)}`)
    ]);

    if(!wResp.ok){
      const err = await wResp.json().catch(()=> ({}));
      throw new Error(err.message || 'No se encontró la ciudad (clima actual).');
    }
    if(!fResp.ok){
      const err = await fResp.json().catch(()=> ({}));
      throw new Error(err.message || 'No se encontró la ciudad (pronóstico).');
    }

    const wData = await wResp.json();
    const fData = await fResp.json();

    renderActual(wData);
    renderHoraria(fData.list);
    renderDiaria(fData.list, fData.city.timezone || 0);
    estado.textContent = `Actualizado: ${new Date().toLocaleTimeString('es-ES')}`;
  }catch(err){
    console.error(err);
    estado.textContent = err.message || 'Error consultando el clima.';
  }
}

// Eventos UI
document.addEventListener('DOMContentLoaded', () => {
  // Quick cities
  document.querySelectorAll('.pill[data-city]').forEach(btn => {
    btn.addEventListener('click', () => buscarCiudad(btn.dataset.city));
  });

  // Buscar con submit (y Enter)
  $('#buscador').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#ciudadEntrada').value.trim();
    buscarCiudad(v);
  });

  // Ciudad por defecto
  buscarCiudad('Asunción');
});

// Botón “Buscar” por compatibilidad (opcional porque ya manejamos submit)
document.getElementById('botonBusqueda').addEventListener('click', (e) => {
  e.preventDefault();
  const ciudad = document.getElementById('ciudadEntrada').value.trim();
  if (ciudad) buscarCiudad(ciudad);
});
