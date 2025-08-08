## Mi Clima — App de Pronóstico
Aplicación web para consultar el clima actual, el pronóstico por hora (próximas 24 h) y los próximos días, usando la API de OpenWeatherMap.
Incluye un backend Node.js con Express que actúa como proxy, evitando exponer la clave API en el frontend.

## Configuración inicial
Clonar o descargar el proyecto
- git clone https://github.com/Leo-Huber/Sitio-Clima.git
- cd sitio-clima

## Instalar dependencias
npm install

## Obtener tu clave de OpenWeatherMap

Regístrate en https://openweathermap.org

Ve a tu perfil → API Keys

Copia tu clave

## Configurar variables de entorno

Crea un archivo .env en la raíz con:
- API_KEY_OPENWEATHER=TU_API_KEY_AQUI
- PORT=3000

(Asegúrate de que .env está en el .gitignore para no subirlo a repositorios públicos.)

## Ejecución
Inicia el servidor con:
- npm start

Esto hace lo siguiente:
- Levanta el servidor Node.js en http://localhost:3000
- Sirve el frontend (HTML, CSS, JS)
- Expone dos endpoints:
/api/weather?city=CIUDAD → Clima actual
/api/forecast?city=CIUDAD → Pronóstico 5 días / 3 h

## Uso
Abre http://localhost:3000 en tu navegador.

Usa la barra de búsqueda o los botones de ciudades rápidas.

Se mostrarán:

- Clima actual (temperatura, sensación térmica, humedad, viento, presión)
- Pronóstico por hora (próximas 24 h, en bloques de 3 h)
- Pronóstico próximos días (mín/máx y estado)

## Seguridad de la API Key
La clave está almacenada en .env y solo se usa en el backend (server.js).
El frontend (script.js) hace peticiones a /api/weather y /api/forecastscript, sin conocer la clave.
Esto evita exponer tu API key a los usuarios o al inspeccionar el código del navegador.

## Diseño
Responsive y optimizado para desktop y móvil.
Tarjetas (cards) para cada sección.
Colores oscuros y acento azul.
Scroll horizontal para el pronóstico por horas.

## Licencia
Este proyecto está bajo licencia ISC (ver package.json).