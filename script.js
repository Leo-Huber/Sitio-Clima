// Utilidad para normalizar nombre de ciudad
const normalize = (str) =>
  (str || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const $ = (sel) => document.querySelector(sel);
const out = $("#out");

const print = (data) => {
  out.textContent = typeof data === "string" ? data : JSON.stringify(data, null, 2);
};

// --- Llama a la función serverless de clima ---
async function getWeather(city) {
  const url = `/api/weather?city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather HTTP ${res.status}`);
  return res.json();
}

// --- Llama a la función serverless de pronóstico ---
async function getForecast(city) {
  const url = `/api/forecast?city=${encodeURIComponent(city)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`);
  return res.json();
}

// --- Envía registro de lluvia (si corresponde) ---
async function maybeLogRain(city, weatherPayload) {
  try {
    // Registra solo si la ciudad es Asunción y es lluvia (en español/inglés)
    const isAsu = normalize(city) === "asuncion";
    if (!isAsu) return;

    const description = (weatherPayload?.description || "").toLowerCase();
    const mm = Number(weatherPayload?.rain_mm || 0);

    const looksRain =
      mm > 0 ||
      /\b(rain|lluvia|chubasco|tormenta|drizzle|aguacero|shower|storm)\b/.test(description);

    if (!looksRain) return;

    // Hora local que se envía al backend para validar 07:00–17:00 allá
    const localTimeISO = new Date().toISOString();
    await fetch("/api/log-rain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, localTimeISO, mm, description }),
    });
  } catch {
    // Silencioso: el registro no debe romper la UI
  }
}

$("#btnWeather").addEventListener("click", async () => {
  const city = $("#city").value.trim() || "Asunción";
  print("Cargando clima...");
  try {
    const data = await getWeather(city);
    print(data);
    await maybeLogRain(city, data);
  } catch (e) {
    print(`Error: ${e.message}`);
  }
});

$("#btnForecast").addEventListener("click", async () => {
  const city = $("#city").value.trim() || "Asunción";
  print("Cargando pronóstico...");
  try {
    const data = await getForecast(city);
    print(data);
  } catch (e) {
    print(`Error: ${e.message}`);
  }
});

$("#btnExport").addEventListener("click", async () => {
  try {
    const res = await fetch("/logs.csv", { cache: "no-store" });
    if (!res.ok) throw new Error(`CSV HTTP ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lluvias_asuncion.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    print("Error generando CSV");
    console.error(e);
  }
});
