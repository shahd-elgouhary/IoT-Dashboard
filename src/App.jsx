import React from "react";
import VoiceButton from "./components/VoiceButton.jsx";
import SensorPanel from "./components/SensorPanel.jsx";
import DeviceControls from "./components/DeviceControls.jsx";

export default function App() {
  return (
    <div className="page">
      <h1>SmartHome</h1>
      <VoiceButton />
      <SensorPanel />
      <DeviceControls />
    </div>
  );
}
