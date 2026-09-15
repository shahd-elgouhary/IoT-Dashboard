
async function request(path, { method = "GET", body, timeoutMs = 6000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Request failed (${response.status})`);
    }

    return await response.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out: ESP32 or server did not respond in time");
    }
    if (err.message && err.message.includes("Failed to fetch")) {
      throw new Error("Network error: Unable to reach the server or ESP32");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function getStatus() {
  return request("/api/status");
}

export function setDevice(device, state) {
  return request("/api/devices", { method: "POST", body: { device, state } });
}

