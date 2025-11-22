// src/pages/StudentProctor.jsx
import React, { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";

const API_BASE = "http://localhost:5000";
const DETECT_INTERVAL_MS = 700;
const NO_FACE_THRESHOLD_MS = 4000;
const MULTI_FACE_CONFIRM_MS = 1200;

export default function StudentProctor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [running, setRunning] = useState(false);
  const [camVisible, setCamVisible] = useState(true);

  const lastFaceSeenAt = useRef(Date.now());
  const multiFaceSince = useRef(null);

  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const log = (msg) =>
    console.log(`[StudentProctor] ${new Date().toLocaleTimeString()} — ${msg}`);

  // ─────────────────────────────────
  // Load face-api model once
  // ─────────────────────────────────
  useEffect(() => {
    async function loadModel() {
      try {
        log("Loading tinyFaceDetector model from /models");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        log("Model loaded");
      } catch (err) {
        log("Model load failed: " + (err?.message || String(err)));
      }
    }
    loadModel();
  }, []);

  // ─────────────────────────────────
  // Camera + Mic
  // ─────────────────────────────────
  async function startCamera() {
    // ask for both video & audio (audio will be recorded)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    log("Camera + mic stream started");
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // ─────────────────────────────────
  // Backend proctor session
  // ─────────────────────────────────
  async function startSession() {
    const res = await fetch(`${API_BASE}/api/start-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to start proctor session");
    setSessionId(data.sessionId);
    log("Session started: " + data.sessionId);
    return data.sessionId;
  }

  async function endSession(currentId) {
    if (!currentId) return;
    try {
      await fetch(`${API_BASE}/api/end-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentId }),
      });
      log("Session ended: " + currentId);
    } catch (e) {
      log("endSession error: " + e.message);
    }
  }

  // ─────────────────────────────────
  // Audio recording → /api/audio
  // ─────────────────────────────────
  function startAudioRecorder(activeSessionId) {
    if (!streamRef.current) {
      log("No stream for audio recording");
      return;
    }
    if (!window.MediaRecorder) {
      log("MediaRecorder not supported – audio evidence disabled");
      return;
    }

    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm",
      });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        try {
          if (!e.data || !e.data.size || !activeSessionId) return;
          const fd = new FormData();
          fd.append("sessionId", activeSessionId);
          fd.append("audio", e.data, `audio_${Date.now()}.webm`);
          await fetch(`${API_BASE}/api/audio`, {
            method: "POST",
            body: fd,
          });
          log("Audio chunk uploaded");
        } catch (err) {
          log("audio upload error: " + err.message);
        }
      };

      recorder.onerror = (e) => {
        log("MediaRecorder error: " + e.error?.message);
      };

      // record in 5s chunks
      recorder.start(5000);
      log("Audio recorder started");
    } catch (err) {
      log("Failed to start MediaRecorder: " + err.message);
    }
  }

  function stopAudioRecorder() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      log("Audio recorder stopped");
    }
    mediaRecorderRef.current = null;
  }

  // ─────────────────────────────────
  // Evidence helpers
  // ─────────────────────────────────
  function captureFrameBlob() {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve(null);
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
    });
  }

  async function sendAlert(
    type,
    severity = "high",
    details = "",
    uploadFrame = false
  ) {
    if (!sessionId) return;
    try {
      let blob = null;
      if (uploadFrame) {
        blob = await captureFrameBlob();
      }
      if (blob) {
        const fd = new FormData();
        fd.append("sessionId", sessionId);
        fd.append("frame", blob, `alert_${type}_${Date.now()}.jpg`);
        await fetch(`${API_BASE}/api/frame`, {
          method: "POST",
          body: fd,
        });
        log(`Frame uploaded for ${type}`);
      }

      await fetch(`${API_BASE}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, severity, details }),
      });
      log(`Alert sent: ${type} (${severity}) ${details}`);
    } catch (err) {
      log("sendAlert error: " + err.message);
    }
  }

  // ─────────────────────────────────
  // Tab / window switch detection
  // ─────────────────────────────────
  useEffect(() => {
    function handleHidden() {
      if (document.hidden && sessionId) {
        sendAlert(
          "tab-switch",
          "medium",
          "Student switched tab / minimized window",
          true
        );
      }
    }
    function handleBlur() {
      if (sessionId) {
        sendAlert(
          "tab-blur",
          "medium",
          "Window lost focus (possible tab switch)",
          true
        );
      }
    }

    window.addEventListener("visibilitychange", handleHidden);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("visibilitychange", handleHidden);
      window.removeEventListener("blur", handleBlur);
    };
  }, [sessionId]);

  // ─────────────────────────────────
  // Detection loop (no-face + multi-face)
  // ─────────────────────────────────
  useEffect(() => {
    let intervalId = null;

    async function runDetections() {
      const video = videoRef.current;
      if (!video || video.readyState !== 4 || !sessionId) return;

      try {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.45,
        });
        const detections = await faceapi.detectAllFaces(video, options);

        // draw boxes
        try {
          const canvas = canvasRef.current;
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const resized = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          resized.forEach((det) => {
            const { x, y, width, height } = det.box;
            ctx.strokeStyle = "rgba(37,99,235,0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
          });
        } catch (_) {}

        const now = Date.now();

        if (!detections || detections.length === 0) {
          // NO FACE
          if (!lastFaceSeenAt.current) lastFaceSeenAt.current = now;
          if (now - lastFaceSeenAt.current > NO_FACE_THRESHOLD_MS) {
            await sendAlert(
              "no-face",
              "high",
              `No face detected for > ${NO_FACE_THRESHOLD_MS / 1000}s`,
              true
            );
            lastFaceSeenAt.current = now + 2000; // cooldown
          }
        } else {
          lastFaceSeenAt.current = now;

          if (detections.length > 1) {
            // MULTIPLE FACES
            if (!multiFaceSince.current) multiFaceSince.current = now;
            if (now - multiFaceSince.current > MULTI_FACE_CONFIRM_MS) {
              await sendAlert(
                "multiple-faces",
                "high",
                `Detected ${detections.length} faces in frame`,
                true
              );
              multiFaceSince.current = null;
            }
          } else {
            multiFaceSince.current = null;
          }
        }
      } catch (err) {
        log("detection error: " + (err?.message || String(err)));
      }
    }

    if (running && sessionId) {
      runDetections();
      intervalId = setInterval(runDetections, DETECT_INTERVAL_MS);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [running, sessionId]);

  // ─────────────────────────────────
  // Auto-start on mount (for exam)
  // ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function startAll() {
      try {
        await startCamera();
        const sid = await startSession();
        if (cancelled) return;
        setRunning(true);
        startAudioRecorder(sid);
      } catch (err) {
        log("startAll error: " + err.message);
      }
    }
    startAll();

    return () => {
      cancelled = true;
      setRunning(false);
      stopAudioRecorder();
      endSession(sessionId);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─────────────────────────────────
  // UI – student only sees camera + toggle
  // ─────────────────────────────────
  return (
    <div style={{ fontSize: 13 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "#16a34a" }}>
          Monitoring active {running ? "" : "(starting…)"}
        </span>
        <button
          type="button"
          onClick={() => setCamVisible((v) => !v)}
          style={{
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            background: "#f3f4f6",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          {camVisible ? "Hide Camera" : "Show Camera"}
        </button>
      </div>

      <div
        style={{
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid #e5e7eb",
          width: 320,
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "75%", // 4:3 aspect ratio
            display: camVisible ? "block" : "none",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              background: "#000",
            }}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
            }}
          />
        </div>
      </div>
    </div>
  );
}
