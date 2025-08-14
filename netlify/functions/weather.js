// Devuelve un “clima actual” simplificado.
// Si tienes una API real, retorna { temp, description, rain_mm } como mínimo.
exports.handler = async (event) => {
  try {
    const city = (event.queryStringParameters?.city || "Asunción").trim();
    // Mock básico con “lluvia” para disparar el logger algunas veces
    const now = new Date();
    const evenMinute = now.getMinutes() % 2 === 0;

    const payload = {
      city,
      temp: 24 + (now.getMinutes() % 6),                 // 24..29
      description: evenMinute ? "Lluvia ligera" : "Parcialmente nublado",
      rain_mm: evenMinute ? 2.3 : 0
    };

    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: "weather failed" };
  }
};
