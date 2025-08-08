require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

// Clima actual
app.get('/api/weather', async (req, res) => {
  const city = (req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'Falta ?city' });

  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'es');

    const resp = await fetch(url);
    const data = await resp.json();
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno consultando weather' });
  }
});

// Pronóstico 5 días / 3h (para 24h y días)
app.get('/api/forecast', async (req, res) => {
  const city = (req.query.city || '').trim();
  if (!city) return res.status(400).json({ error: 'Falta ?city' });

  try {
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
    url.searchParams.set('q', city);
    url.searchParams.set('appid', process.env.API_KEY_OPENWEATHER);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('lang', 'es');

    const resp = await fetch(url);
    const data = await resp.json();
    return res.status(resp.ok ? 200 : resp.status).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno consultando forecast' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
