export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Use GET" });
    return;
  }

  const esp32BaseUrl = process.env.ESP32_BASE_URL;
  if (!esp32BaseUrl) {
    res.status(500).json({ error: "ESP32_BASE_URL is not configured on the server" });
    return;
  }

  try {
    const espResponse = await fetch(`${esp32BaseUrl}/status`);
    if (!espResponse.ok) {
      throw new Error(`ESP32 returned status ${espResponse.status}`);
    }
    const status = await espResponse.json();
    res.status(200).json(status);
  } catch (err) {
    res.status(502).json({ error: `Could not reach the ESP32: ${err.message}` });
  }
}
