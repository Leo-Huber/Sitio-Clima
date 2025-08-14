exports.handler = async (event) => {
  try {
    const city = (event.queryStringParameters?.city || "Asunción").trim();
    const base = Date.now();
    const days = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(base + i * 864e5);
      const even = i % 2 === 0;
      return {
        date: d.toISOString().slice(0, 10),
        min: 20 + (i % 3),
        max: 30 + (i % 4),
        description: even ? "Lluvia" : "Despejado",
        rain_mm: even ? 5 + i : 0
      };
    });

    return { statusCode: 200, body: JSON.stringify({ city, days }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "forecast failed" };
  }
};
