const VALID_DEVICES = new Set(["light", "door", "fan"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const { device, state } = req.body || {};
  if (!VALID_DEVICES.has(device)) {
    res.status(400).json({ error: `device must be one of: ${[...VALID_DEVICES].join(", ")}` });
    return;
  }
  if (!state) {
    res.status(400).json({ error: "Missing 'state'" });
    return;
  }

  const esp32BaseUrl = process.env.ESP32_BASE_URL;
  if (!esp32BaseUrl) {
    res.status(500).json({ error: "ESP32_BASE_URL is not configured on the server" });
    return;
  }

  try {
    const espResponse = await fetch(`${esp32BaseUrl}/${device}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    });
    if (!espResponse.ok) {
      throw new Error(`ESP32 returned status ${espResponse.status}`);
    }
    res.status(200).json({ device, state });
  } catch (err) {
    res.status(502).json({ error: `Could not reach the ESP32: ${err.message}` });
  }
}
