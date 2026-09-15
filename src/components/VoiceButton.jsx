import React, { useState, useEffect, useRef } from "react";
import * as api from "../api.js";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function VoiceButton() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError("");
      setFeedback("Listening... Speak now!");
    };

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;
      setTranscript(spokenText);
      setIsListening(false);
      await processVoiceCommand(spokenText);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "no-speech") {
        setError("No speech was detected. Please try again.");
      } else if (event.error === "not-allowed") {
        setError("Microphone permission was denied.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, []);

  const speak = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const processVoiceCommand = async (text) => {
    const lower = text.toLowerCase().trim();
    setFeedback("Processing command...");
    setError("");

    // 1. Fan Control Commands
    if (
      lower.includes("turn on the fan") ||
      lower.includes("turn on fan") ||
      lower.includes("switch on the fan") ||
      lower.includes("switch the fan on") ||
      lower.includes("fan on")
    ) {
      try {
        await api.setDevice("fan", "on");
        const msg = "Fan has been turned ON.";
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        const msg = `Failed to turn on fan: ${err.message}`;
        setError(msg);
        speak("Failed to turn on the fan.");
      }
      return;
    }

    if (
      lower.includes("turn off the fan") ||
      lower.includes("turn off fan") ||
      lower.includes("switch off the fan") ||
      lower.includes("switch the fan off") ||
      lower.includes("fan off")
    ) {
      try {
        await api.setDevice("fan", "off");
        const msg = "Fan has been turned OFF.";
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        const msg = `Failed to turn off fan: ${err.message}`;
        setError(msg);
        speak("Failed to turn off the fan.");
      }
      return;
    }

    // 2. Light Control Commands
    if (
      lower.includes("turn on the light") ||
      lower.includes("turn on light") ||
      lower.includes("light on")
    ) {
      try {
        await api.setDevice("light", "on");
        const msg = "Light has been turned ON.";
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        setError(`Failed to turn on light: ${err.message}`);
      }
      return;
    }

    if (
      lower.includes("turn off the light") ||
      lower.includes("turn off light") ||
      lower.includes("light off")
    ) {
      try {
        await api.setDevice("light", "off");
        const msg = "Light has been turned OFF.";
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        setError(`Failed to turn off light: ${err.message}`);
      }
      return;
    }

    // 3. Temperature Query
    if (
      lower.includes("temperature") ||
      lower.includes("temp") ||
      lower.includes("how hot") ||
      lower.includes("how cold")
    ) {
      try {
        const status = await api.getStatus();
        if (status.temperature != null) {
          const msg = `The current temperature is ${status.temperature} degrees Celsius.`;
          setFeedback(msg);
          speak(msg);
        } else {
          const msg = "Temperature data is currently unavailable.";
          setFeedback(msg);
          speak(msg);
        }
      } catch (err) {
        setError(`Could not fetch temperature: ${err.message}`);
      }
      return;
    }

    // 4. Humidity Query
    if (
      lower.includes("humidity") ||
      lower.includes("humid") ||
      lower.includes("moisture")
    ) {
      try {
        const status = await api.getStatus();
        if (status.humidity != null) {
          const msg = `The current humidity level is ${status.humidity} percent.`;
          setFeedback(msg);
          speak(msg);
        } else {
          const msg = "Humidity data is currently unavailable.";
          setFeedback(msg);
          speak(msg);
        }
      } catch (err) {
        setError(`Could not fetch humidity: ${err.message}`);
      }
      return;
    }

    // 5. Motion Query
    if (
      lower.includes("motion") ||
      lower.includes("movement") ||
      lower.includes("anyone there") ||
      lower.includes("detect")
    ) {
      try {
        const status = await api.getStatus();
        const val = status.motion ?? status.pir ?? status.motion_detected ?? status.movement;
        const isDetected =
          val === true ||
          val === 1 ||
          val === "1" ||
          (typeof val === "string" && ["detected", "motion", "active", "true", "on"].includes(val.toLowerCase()));

        const msg = isDetected
          ? "Motion is detected!"
          : "No motion detected.";
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        setError(`Could not fetch motion status: ${err.message}`);
      }
      return;
    }

    // 6. Light / LDR Query
    if (
      lower.includes("light level") ||
      lower.includes("ldr") ||
      lower.includes("light status") ||
      lower.includes("how bright") ||
      lower.includes("dark") ||
      lower.includes("bright")
    ) {
      try {
        const status = await api.getStatus();
        const ldrVal = status.ldr ?? status.light_level ?? status.ldr_sensor ?? status.light_reading;
        const ldrStr = status.ldr_status ?? status.light_status;

        let msg = "";
        if (ldrVal != null) {
          const cond = typeof ldrVal === "number" ? (ldrVal > 300 ? "Bright" : "Dark") : "";
          msg = `Light reading is ${ldrVal}${cond ? ` (${cond})` : ""}.`;
        } else if (ldrStr != null) {
          msg = `Light status is ${ldrStr}.`;
        } else {
          msg = "LDR light sensor reading is currently unavailable.";
        }
        setFeedback(msg);
        speak(msg);
      } catch (err) {
        setError(`Could not fetch light status: ${err.message}`);
      }
      return;
    }

    // 7. Unknown Command
    const unknownMsg = `Command not recognized: "${spokenText}". Try asking for temperature, humidity, fan ON/OFF, motion, or light.`;
    setFeedback(unknownMsg);
    speak("Command not recognized.");
  };

  const toggleListening = () => {
    if (!isSupported) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript("");
      setFeedback("");
      setError("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        recognitionRef.current?.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      }
    }
  };

  return (
    <div className="card voice-card">
      <h2>Voice command</h2>

      {!isSupported && (
        <p className="error-text">
          ⚠️ Speech Recognition API is not supported by your browser.
        </p>
      )}

      <button
        className={`voice-button ${isListening ? "recording" : ""}`}
        onClick={toggleListening}
        disabled={!isSupported}
        title={isListening ? "Listening... Click to stop" : "Click to speak voice command"}
      >
        {isListening ? "🔴" : "🎤"}
      </button>
      <div className="voice-status">
        {isListening ? "Listening..." : "Click to Speak"}
      </div>

      {transcript && (
        <div className="transcript-box">
          <div className="transcript-label">Recognized Speech:</div>
          <div className="transcript-text">"{transcript}"</div>
        </div>
      )}

      {feedback && (
        <div className="feedback-box">
          <p className="feedback-text">{feedback}</p>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <p className="error-text">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
