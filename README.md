# Sitio Clima – Netlify

## Scripts
- `npm run dev` (o `netlify dev`): corre el sitio y las Functions en local.
- `npm run build`: no hace nada (sitio estático).
- Deploy: conectar repo con Netlify. Build command vacío, publish `.`.

## Endpoints
- `/api/weather`    -> `netlify/functions/weather.js`
- `/api/forecast`   -> `netlify/functions/forecast.js`
- `/api/log-rain`   -> `netlify/functions/log-rain.js`
- `/logs.csv`       -> `netlify/functions/logs-csv.js` (descarga)
