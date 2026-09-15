import React, { useEffect, useState } from "react";
import * as api from "../api.js";

const POLL_INTERVAL_MS = 5000;

export default function SensorPanel() {
  const [readings, setReadings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function fetchReadings() {
      try {
        const data = await api.getStatus();
        if (!isCancelled) {
          setReadings(data);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    fetchReadings();
    const intervalId = setInterval(fetchReadings, POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const getMotionStatus = (data) => {
    if (!data) return { detected: false, label: "Not Detected", unknown: true };
    const val = data.motion ?? data.pir ?? data.motion_detected ?? data.movement;
    if (val === undefined || val === null) return { detected: false, label: "Not Detected", unknown: true };
    const isDetected =
      val === true ||
      val === 1 ||
      val === "1" ||
      (typeof val === "string" && ["detected", "motion", "active", "true", "on"].includes(val.toLowerCase()));
    return {
      detected: isDetected,
      label: isDetected ? "Detected" : "Not Detected",
      unknown: false,
    };
  };

  const getLdrStatus = (data) => {
    if (!data) return { value: null, status: "—" };
    const rawVal = data.ldr ?? data.light_level ?? data.ldr_sensor ?? data.light_reading;
    const strStatus = data.ldr_status ?? data.light_status;

    if (rawVal == null && strStatus == null) return { value: null, status: "—" };

    if (typeof strStatus === "string") {
      return { value: rawVal ?? null, status: strStatus };
    }

    if (typeof rawVal === "number") {
      const status = rawVal > 300 ? "Bright" : "Dark";
      return { value: rawVal, status };
    }

    if (typeof rawVal === "string") {
      return { value: null, status: rawVal };
    }

    return { value: rawVal, status: "—" };
  };

  const motion = getMotionStatus(readings);
  const ldr = getLdrStatus(readings);

  return (
    <div className="card">
      <div className="card-header">
        <h2>Sensor readings</h2>
        {loading && <span className="loading-badge">Loading...</span>}
      </div>
      {error && (
        <div className="error-banner">
          <p className="error-text">⚠️ {error}</p>
        </div>
      )}
      <div className="sensor-grid">
        <div className="sensor-card">
          <div className="sensor-value">
            {readings?.temperature != null ? `${readings.temperature}°C` : "—"}
          </div>
          <div className="sensor-label">Temperature</div>
        </div>

        <div className="sensor-card">
          <div className="sensor-value">
            {readings?.humidity != null ? `${readings.humidity}%` : "—"}
          </div>
          <div className="sensor-label">Humidity</div>
        </div>

        <div className="sensor-card">
          <div className="sensor-value">
            {motion.unknown ? (
              "—"
            ) : (
              <span className={`state-badge ${motion.detected ? "state-alert" : "state-off"}`}>
                {motion.label}
              </span>
            )}
          </div>
          <div className="sensor-label">Motion</div>
        </div>

        <div className="sensor-card">
          <div className="sensor-value">
            {ldr.value != null ? (
              <span>
                {ldr.value}{" "}
                <small className="ldr-tag">({ldr.status})</small>
              </span>
            ) : (
              ldr.status
            )}
          </div>
          <div className="sensor-label">LDR (Light)</div>
        </div>

        {readings?.gas_level != null && (
          <div className="sensor-card">
            <div className="sensor-value">{readings.gas_level}</div>
            <div className="sensor-label">Gas level</div>
          </div>
        )}
      </div>
    </div>
  );
}
