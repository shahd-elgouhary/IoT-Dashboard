import React, { useEffect, useState } from "react";
import * as api from "../api.js";

const POLL_INTERVAL_MS = 5000;

function DeviceTile({ label, isOn, onLabel, offLabel, onToggle, isBusy }) {
  return (
    <div className="device-tile">
      <div className="device-info">
        <strong>{label}</strong>{" "}
        <span className={`state-badge ${isOn ? "state-on" : "state-off"}`}>
          {isOn ? onLabel : offLabel}
        </span>
      </div>
      <div className="device-actions">
        <button onClick={onToggle} disabled={isBusy} className="control-btn">
          {isBusy ? "Processing..." : `Turn ${isOn ? offLabel : onLabel}`}
        </button>
      </div>
    </div>
  );
}

export default function DeviceControls() {
  const [status, setStatus] = useState({});
  const [busyDevice, setBusyDevice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function fetchStatus() {
      try {
        const data = await api.getStatus();
        if (!isCancelled) {
          setStatus(data);
          setError("");
        }
      } catch (err) {
        if (!isCancelled) setError(err.message);
      }
    }

    fetchStatus();
    const intervalId = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const lightOn = status.light === "on";
  const fanOn = status.fan === "on";
  const doorOpen = status.door === "open";

  async function toggle(device, currentlyOn, onValue, offValue) {
    setBusyDevice(device);
    setError("");
    const targetState = currentlyOn ? offValue : onValue;
    try {
      const res = await api.setDevice(device, targetState);
      if (res && res.state) {
        setStatus((prev) => ({ ...prev, [device]: res.state }));
      } else {
        const updated = await api.getStatus();
        setStatus(updated);
      }
    } catch (err) {
      setError(`Failed to set ${device}: ${err.message}`);
    } finally {
      setBusyDevice(null);
    }
  }

  return (
    <div className="card">
      <h2>Device Controls</h2>
      {error && (
        <div className="error-banner">
          <p className="error-text">⚠️ {error}</p>
        </div>
      )}

      <DeviceTile
        label="Fan"
        isOn={fanOn}
        onLabel="ON"
        offLabel="OFF"
        onToggle={() => toggle("fan", fanOn, "on", "off")}
        isBusy={busyDevice === "fan"}
      />
      <DeviceTile
        label="Light"
        isOn={lightOn}
        onLabel="ON"
        offLabel="OFF"
        onToggle={() => toggle("light", lightOn, "on", "off")}
        isBusy={busyDevice === "light"}
      />
      <DeviceTile
        label="Door"
        isOn={doorOpen}
        onLabel="OPEN"
        offLabel="CLOSED"
        onToggle={() => toggle("door", doorOpen, "open", "closed")}
        isBusy={busyDevice === "door"}
      />
    </div>
  );
}
