# SmartHome Voice-Controlled IoT Dashboard

A modern, responsive Web Dashboard and Serverless API built with **React**, **Vite**, and **Vercel Functions** to monitor sensors and control IoT devices (Fan, Light, Door) connected to an **ESP32** via HTTP requests and **Voice Commands**.

---

## Key Features

- 🌡️ **Real-Time Sensor Dashboard**: Monitors Temperature (°C), Humidity (%), Motion (`Detected` / `Not Detected`), LDR Light Level (`Bright` / `Dark`), and Gas level.
- 🌀 **Device Control**: Controls Fan (ON/OFF), Light (ON/OFF), and Door (OPEN/CLOSED) with optimistic updates, busy state locking, and real hardware response verification.
- 🎙️ **Voice Commands**: Native Web Speech API integration with voice feedback (`speechSynthesis`), transcript box, and intelligent intent parsing.
- 🛡️ **Robust Error Handling**: Handles network timeouts, ESP32 offline states, invalid responses, and browser speech permissions gracefully.
- ⚡ **Serverless Proxy**: Securely routes frontend requests to your local or remote ESP32 using environment variables (`ESP32_BASE_URL`), bypassing CORS and exposing no sensitive IP credentials to the client.

---

## 🏗️ System Architecture

```text
  ┌─────────────────────────────────────────────────────────────┐
  │                    Browser Client (React)                   │
  │   - Sensor Readings Dashboard  - Device Control Buttons     │
  │   - Voice Input (SpeechRecognition & SpeechSynthesis)        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP GET / POST
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │              Serverless Backend / API Proxy                 │
  │   - GET  /api/status   -> Proxies to ESP32 /status         │
  │   - POST /api/devices  -> Proxies to ESP32 /{device}        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ HTTP over Wi-Fi / WAN
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                       ESP32 Microcontroller                 │
  │   - Web Server (listening on Port 80)                       │
  │   - Sensors: DHT11/22, PIR Motion, LDR Photoresistor        │
  │   - Actuators: Relays (Fan, Light), Servo (Door)            │
  └─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Requirements & Hardware Setup

### Required Components
1. **ESP32 Development Board** (NodeMCU ESP32 / ESP-WROOM-32)
2. **DHT11 / DHT22** Temperature & Humidity Sensor
3. **PIR Motion Sensor** (HC-SR501 or similar)
4. **LDR Photoresistor** + 10kΩ Resistor (or LDR Sensor Module)
5. **Relay Module** (5V / 3.3V) for Fan and Light control
6. **Servo Motor** / Solenoid Lock (for Door control - optional)
7. **Wi-Fi Network** (2.4 GHz)

### Pin Mapping Example
| Component | ESP32 Pin |
|---|---|
| DHT Sensor | GPIO 4 |
| PIR Motion Sensor | GPIO 13 |
| LDR Analog Output | GPIO 34 (VP) |
| Fan Relay | GPIO 18 |
| Light Relay | GPIO 19 |
| Door Servo / Relay | GPIO 21 |

---

## 💻 ESP32 Firmware Example (C++ / Arduino)

Upload this sketch to your ESP32 using Arduino IDE or PlatformIO. Make sure to update your Wi-Fi credentials.

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <DHT.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

#define DHTPIN 4
#define DHTTYPE DHT11
#define PIR_PIN 13
#define LDR_PIN 34
#define FAN_PIN 18
#define LIGHT_PIN 19
#define DOOR_PIN 21

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

String fanState = "off";
String lightState = "off";
String doorState = "closed";

void handleStatus() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int motion = digitalRead(PIR_PIN);
  int ldrVal = analogRead(LDR_PIN);

  StaticJsonDocument<256> doc;
  doc["temperature"] = isnan(temp) ? 24.0 : temp;
  doc["humidity"] = isnan(hum) ? 50.0 : hum;
  doc["motion"] = (motion == HIGH);
  doc["ldr"] = ldrVal;
  doc["ldr_status"] = (ldrVal > 1500) ? "Bright" : "Dark";
  doc["fan"] = fanState;
  doc["light"] = lightState;
  doc["door"] = doorState;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleFan() {
  if (server.hasArg("plain") == false) {
    server.send(400, "application/json", "{\"error\":\"Body missing\"}");
    return;
  }
  StaticJsonDocument<128> doc;
  deserializeJson(doc, server.arg("plain"));
  String state = doc["state"];
  
  if (state == "on") {
    digitalWrite(FAN_PIN, HIGH);
    fanState = "on";
  } else {
    digitalWrite(FAN_PIN, LOW);
    fanState = "off";
  }
  server.send(200, "application/json", "{\"device\":\"fan\",\"state\":\"" + fanState + "\"}");
}

void handleLight() {
  if (server.hasArg("plain") == false) return;
  StaticJsonDocument<128> doc;
  deserializeJson(doc, server.arg("plain"));
  String state = doc["state"];
  digitalWrite(LIGHT_PIN, (state == "on") ? HIGH : LOW);
  lightState = (state == "on") ? "on" : "off";
  server.send(200, "application/json", "{\"device\":\"light\",\"state\":\"" + lightState + "\"}");
}

void handleDoor() {
  if (server.hasArg("plain") == false) return;
  StaticJsonDocument<128> doc;
  deserializeJson(doc, server.arg("plain"));
  String state = doc["state"];
  digitalWrite(DOOR_PIN, (state == "open") ? HIGH : LOW);
  doorState = (state == "open") ? "open" : "closed";
  server.send(200, "application/json", "{\"device\":\"door\",\"state\":\"" + doorState + "\"}");
}

void setup() {
  Serial.begin(115200);
  pinMode(PIR_PIN, INPUT);
  pinMode(FAN_PIN, OUTPUT);
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(DOOR_PIN, OUTPUT);
  
  dht.begin();
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected! IP: ");
  Serial.println(WiFi.localIP());

  server.on("/status", HTTP_GET, handleStatus);
  server.on("/fan", HTTP_POST, handleFan);
  server.on("/light", HTTP_POST, handleLight);
  server.on("/door", HTTP_POST, handleDoor);

  server.begin();
}

void loop() {
  server.handleClient();
}
```

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Local Setup & Testing

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd IoT-Dashboard
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   ESP32_BASE_URL=http://192.168.1.100
   ```
   *(Replace `192.168.1.100` with your ESP32's IP address on your local network).*

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in Google Chrome or Microsoft Edge.

4. **Verify Build**:
   ```bash
   npm run build
   ```

---

### Step 2: Deploying to Production (Vercel)

Vercel provides free serverless hosting that automatically runs the functions in `/api`.

1. **Push your code to GitHub / GitLab / Bitbucket**.

2. **Connect to Vercel**:
   - Log into [Vercel](https://vercel.com).
   - Click **Add New Project** and select your Git repository.

3. **Configure Environment Variables in Vercel**:
   - In the project setup screen, expand **Environment Variables**.
   - Key: `ESP32_BASE_URL`
   - Value: Your ESP32 HTTP address.
     - *If testing on local Wi-Fi*: Use a tunneling tool like **ngrok** (`ngrok http 80`) or **localtunnel** (`lt --port 80`) to generate a public URL (e.g. `https://your-esp32.ngrok-free.app`), and set `ESP32_BASE_URL` to that URL.
     - *If ESP32 is connected via Port Forwarding*: Use your router's public IP address (e.g. `http://YOUR_PUBLIC_IP:8080`).

4. **Deploy**:
   - Click **Deploy**. Vercel will build the Vite frontend and host the serverless functions in `/api/status` and `/api/devices`.
   - Your dashboard will be live at `https://your-project.vercel.app`.

---

## 🎙️ Voice Commands Reference Guide

Click the microphone button 🎤 to activate voice input.

| Intent Category | Spoken Command Variations | Action |
|---|---|---|
| **Fan ON** | *"Turn on the fan"*, *"Switch on the fan"*, *"Fan on"* | Sends HTTP POST to turn fan ON + Voice audio feedback |
| **Fan OFF** | *"Turn off the fan"*, *"Switch off the fan"*, *"Fan off"* | Sends HTTP POST to turn fan OFF + Voice audio feedback |
| **Light ON** | *"Turn on the light"*, *"Light on"* | Sends HTTP POST to turn light ON |
| **Light OFF** | *"Turn off the light"*, *"Light off"* | Sends HTTP POST to turn light OFF |
| **Temperature** | *"What is the temperature?"*, *"Temperature"*, *"How hot is it?"* | Queries sensor & speaks current temperature |
| **Humidity** | *"What is the humidity?"*, *"Humidity"*, *"How humid is it?"* | Queries sensor & speaks current humidity |
| **Motion** | *"Is there motion?"*, *"Check motion"*, *"Any movement?"* | Queries sensor & speaks `Motion detected!` or `No motion detected.` |
| **LDR Light** | *"What's the light level?"*, *"Is the light on?"*, *"Light status"* | Queries LDR & speaks brightness level |
| **Unknown** | *"Play music"*, *"What's the weather?"* | Speaks *"Command not recognized"* and displays helper text |

---

## 📡 API Endpoints Reference

### `GET /api/status`
Proxies request to `${ESP32_BASE_URL}/status`.
- **Response `200 OK`**:
  ```json
  {
    "temperature": 25.4,
    "humidity": 58,
    "motion": true,
    "ldr": 450,
    "ldr_status": "Bright",
    "fan": "off",
    "light": "on",
    "door": "closed"
  }
  ```

### `POST /api/devices`
Proxies request to `${ESP32_BASE_URL}/{device}`.
- **Request Body**:
  ```json
  {
    "device": "fan",
    "state": "on"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "device": "fan",
    "state": "on"
  }
  ```

---

## ❓ Troubleshooting

1. **ESP32 Offline Error (`502 Bad Gateway` / `Could not reach ESP32`)**:
   - Ensure the ESP32 is powered on and connected to Wi-Fi.
   - Verify that `ESP32_BASE_URL` in `.env` or Vercel settings matches the ESP32's current IP address.
   - Test opening `http://<ESP32_IP>/status` directly in your browser or Postman.

2. **Microphone / Voice Recognition Not Working**:
   - Ensure you are using Google Chrome, Microsoft Edge, or Safari (Brave requires enabling "Google Services for Speech Recognition" in settings).
   - Allow microphone permissions when prompted by the browser.
   - Ensure your site is served over `https://` (or `http://localhost`).

3. **CORS Errors**:
   - Do not make `fetch()` calls directly from React to the ESP32 IP address. Always route through `/api/status` and `/api/devices` so the serverless API proxy handles requests cleanly.

---

## 📄 License

MIT License. Designed for ITI Smart Home IoT Project.
