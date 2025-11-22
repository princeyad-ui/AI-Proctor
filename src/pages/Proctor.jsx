import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as faceapi from "face-api.js";

/**
 * Proctor.jsx
 * - Multi-face detection (prefer ssdMobilenetv1, fallback tiny)
 * - Out-of-frame detection (> NO_FACE_THRESHOLD_MS)
 * - Object detection (coco-ssd) via CDN or dynamic import
 * - Uploads frames and posts alerts to backend
 * - Shows immediate frontend alerts + thumbnails (evidence)
 *
 * Notes:
 * - Ensure public/models/ contains face-api model files (tiny and optionally ssdMobilenetv1).
 * - Add TFJS + coco-ssd CDN to public/index.html (see instructions).
 */

// tuning
const DETECT_INTERVAL_MS = 700;
const NO_FACE_THRESHOLD_MS = 4000; // 4s
const MULTI_FACE_CONFIRM_MS = 1200;
const OBJECT_CONFIRM_MS = 1000;
const OBJECT_SCORE_THRESHOLD = 0.40; // lower while testing

const SUSPICIOUS_OBJECT_TEXTS = [
  "cell phone", "cellphone", "mobile phone", "phone",
  "book", "laptop", "tv", "monitor", "tablet"
];

// --- Added audio & tab detection tuning (tweak as needed) ---
const AUDIO_CHECK_MS = 200;
const AUDIO_THRESHOLD = 0.06; // RMS threshold (tweak 0.03 - 0.12)
const AUDIO_REQUIRED_CONSECUTIVE = 3;
const AUDIO_COOLDOWN_MS = 10000;
const TAB_COOLDOWN_MS = 5000;

export default function Proctor() {
    const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  const [sessionId, setSessionId] = useState(null);
  const [running, setRunning] = useState(false);

  const lastFaceSeenAt = useRef(Date.now());
  const multiFaceSince = useRef(null);

  const objectModelRef = useRef(null);
  const objectSince = useRef(null);
  const lastObjectType = useRef(null);
  const objectAlertCooldown = useRef(0);

  // UI state for immediate alerts/evidence previews
  const [localEvents, setLocalEvents] = useState([]); // {id,type,details,timestamp,thumbnailUrl}
  const [debugLogs, setDebugLogs] = useState([]);

  const appendLog = (t) => {
    const str = `${new Date().toLocaleTimeString()} — ${t}`;
    console.log(str);
    setDebugLogs(s => [str, ...s].slice(0, 80));
  };

  // helper to convert server file path to URL if server returned an absolute path
  function framePathToUrl(path) {
    if (!path) return null;
    if (path.startsWith("/")) {
      return `http://localhost:5000${path}`;
    }
    const idx = path.indexOf("evidence");
    if (idx >= 0) {
      const sub = path.substring(idx);
      return `http://localhost:5000/${sub.replace(/\\/g, "/")}`;
    }
    return null;
  }

  // Load models: face-api (ssd preferred) + coco-ssd (CDN or dynamic)
  useEffect(() => {
    let mounted = true;
    async function loadModels() {
      const MODEL_URL = "/models";

      try {
        appendLog("Loading face-api ssdMobilenetv1 (preferred)...");
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        appendLog("face-api ssdMobilenetv1 loaded");
      } catch (e) {
        appendLog("ssdMobilenetv1 load failed (ok, will use tiny): " + (e?.message || e));
      }

      try {
        appendLog("Loading face-api tinyFaceDetector (fallback)...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        appendLog("face-api tinyFaceDetector loaded");
      } catch (e) {
        appendLog("tinyFaceDetector load failed: " + (e?.message || e));
      }

      try {
        if (window.cocoSsd) {
          appendLog("Using CDN coco-ssd (window.cocoSsd)");
          objectModelRef.current = await window.cocoSsd.load();
        } else {
          appendLog("Dynamically importing coco-ssd...");
          const mod = await import("@tensorflow-models/coco-ssd");
          objectModelRef.current = await mod.load();
        }
        appendLog("coco-ssd model loaded");
      } catch (err) {
        appendLog("coco-ssd load failed: " + (err?.message || err));
        console.error(err);
        objectModelRef.current = null;
      }
    }

    loadModels();
    return () => { mounted = false; };
  }, []);

  // start camera
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      appendLog("Camera started");
    } catch (err) {
      appendLog("Camera start failed: " + (err?.message || err));
      throw err;
    }
  }

  // start session on backend
  async function startSession() {
    try {
      const res = await fetch("http://localhost:5000/api/start-session", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: "{}"
      });
      const data = await res.json();
      if (data && data.success) {
        appendLog("Started session: " + data.sessionId);
        setSessionId(data.sessionId);
        return data.sessionId;
      } else {
        appendLog("Failed to start session: " + JSON.stringify(data));
        throw new Error("Failed to start session");
      }
    } catch (err) {
      appendLog("startSession error: " + (err?.message || err));
      throw err;
    }
  }

  // capture frame
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

  // common sendAlert that uploads frame and posts alert, and updates local UI state instantly
  async function sendAlert(type, severity="high", details="", uploadFrame=true) {
    if (!sessionId) {
      appendLog("No sessionId - cannot send alert");
      return null;
    }
    appendLog(`Preparing alert ${type}`);
    let thumbnailUrl = null;
    try {
      if (uploadFrame) {
        const blob = await captureFrameBlob();
        if (blob) {
          const fd = new FormData();
          fd.append("sessionId", sessionId);
          fd.append("frame", blob, `alert_${type}_${Date.now()}.jpg`);
          const r = await fetch("http://localhost:5000/api/frame", { method: "POST", body: fd });
          const fr = await r.json().catch(()=>null);
          appendLog("frame upload response: " + JSON.stringify(fr));
          if (fr && fr.evidence && fr.evidence.path) {
            thumbnailUrl = framePathToUrl(fr.evidence.path) || null;
          }
        }
      }

      const res = await fetch("http://localhost:5000/api/alerts", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ sessionId, type, severity, details })
      });
      const jr = await res.json().catch(()=>null);
      appendLog("alert post response: " + JSON.stringify(jr));

      // update local UI immediately with a local event entry
      const ev = {
        id: (jr && jr.event && jr.event.id) || `local-${Date.now()}`,
        type, severity, details,
        timestamp: new Date().toISOString(),
        thumbnailUrl
      };
      setLocalEvents(s => [ev, ...s].slice(0, 50));
      return ev;
    } catch (err) {
      appendLog("sendAlert error: " + (err?.message || err));
      return null;
    }
  }

  // --- AUDIO MONITORING implementation ---
  const audioRef = useRef({
    stream: null,
    audioContext: null,
    analyser: null,
    dataArray: null,
    intervalId: null,
    consecutiveAbove: 0,
    cooldown: false
  });
  const [micAllowed, setMicAllowed] = useState(null); // null=not asked, true=allowed, false=denied
  const [audioRms, setAudioRms] = useState(0);

  async function startAudioMonitoring() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAllowed(true);

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const dataArray = new Float32Array(analyser.fftSize);
      source.connect(analyser);

      audioRef.current = {
        ...audioRef.current,
        stream, audioContext, analyser, dataArray,
        consecutiveAbove: 0, cooldown: false
      };

      const intervalId = setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
          const rms = Math.sqrt(sum / dataArray.length);
          setAudioRms(rms);

          if (rms > AUDIO_THRESHOLD) {
            audioRef.current.consecutiveAbove++;
          } else {
            audioRef.current.consecutiveAbove = 0;
          }

          if (audioRef.current.consecutiveAbove >= AUDIO_REQUIRED_CONSECUTIVE && !audioRef.current.cooldown) {
            audioRef.current.cooldown = true;
            appendLog(`Audio activity flagged (rms=${rms.toFixed(4)})`);
            // send audio flag without uploading full frame each time
            sendAlert("audio_activity", "medium", `rms=${rms.toFixed(4)}`, false);
            // optionally also push a small local event
            setLocalEvents(s => [{ id: `audio-${Date.now()}`, type: 'audio_activity', severity: 'medium', details: `rms=${rms.toFixed(4)}`, timestamp: new Date().toISOString() }, ...s].slice(0,50));
            setTimeout(() => { audioRef.current.cooldown = false; }, AUDIO_COOLDOWN_MS);
            audioRef.current.consecutiveAbove = 0;
          }
        } catch (err) {
          console.error("audio interval error", err);
        }
      }, AUDIO_CHECK_MS);

      audioRef.current.intervalId = intervalId;
      appendLog("Audio monitoring started");
    } catch (err) {
      setMicAllowed(false);
      appendLog("Microphone access denied or error: " + (err?.message || err));
      // inform server about mic denial (no frame)
      if (sessionId) {
        sendAlert("audio_error", "low", err?.message || "microphone_denied", false);
      }
    }
  }

  function stopAudioMonitoring() {
    try {
      const cur = audioRef.current;
      if (cur.intervalId) clearInterval(cur.intervalId);
      if (cur.audioContext && cur.audioContext.state !== 'closed') cur.audioContext.close().catch(()=>{});
      if (cur.stream) cur.stream.getTracks().forEach(t => t.stop());
      audioRef.current = { stream: null, audioContext: null, analyser: null, dataArray: null, intervalId: null, consecutiveAbove: 0, cooldown: false };
      setAudioRms(0);
      appendLog("Audio monitoring stopped");
    } catch (e) {
      console.error("stopAudioMonitoring error", e);
    }
  }

  // --- TAB / VISIBILITY handlers ---
  const tabCooldownRef = useRef(false);

  function sendTabEvent(reason) {
    if (!sessionId) {
      appendLog("No session - not sending tab event");
      return;
    }
    if (tabCooldownRef.current) return;
    tabCooldownRef.current = true;
    appendLog("Tab event: " + reason);
    sendAlert("tab_switch", "low", reason, false);
    setLocalEvents(s => [{ id:`tab-${Date.now()}`, type:'tab_switch', severity:'low', details:reason, timestamp: new Date().toISOString()}, ...s].slice(0,50));
    setTimeout(() => { tabCooldownRef.current = false; }, TAB_COOLDOWN_MS);
  }

  // detection loop (face + object) - unchanged except referencing sessionId and sendAlert
  useEffect(() => {
    let mounted = true;

    async function runDetections() {
      const video = videoRef.current;
      if (!video || video.readyState !== 4) {
        appendLog("Video not ready");
        return;
      }

      appendLog(`runDetections w=${video.videoWidth} h=${video.videoHeight} session=${sessionId || "none"}`);

      // FACE detection -> prefer ssdMobilenetv1 if available
      try {
        const useSSD = !!faceapi.nets.ssdMobilenetv1.params;
        appendLog("Using face detector: " + (useSSD ? "ssdMobilenetv1" : "tinyFaceDetector"));

        let detections = [];
        if (useSSD) {
          const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 });
          detections = await faceapi.detectAllFaces(video, options);
        } else {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.30 });
          detections = await faceapi.detectAllFaces(video, options);
        }

        appendLog("face detections count=" + (detections ? detections.length : 0));

        // draw detections
        try {
          const canvas = canvasRef.current;
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const resized = faceapi.resizeResults(detections, displaySize);
          const ctx = canvas.getContext("2d");
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          resized.forEach(det => {
            const { x, y, width, height } = det.box;
            ctx.strokeStyle = "rgba(0,123,255,0.9)";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
          });
        } catch (e) {
          // ignore drawing errors
        }

        const now = Date.now();
        if (!detections || detections.length === 0) {
          if (!lastFaceSeenAt.current) lastFaceSeenAt.current = now;
          if (now - lastFaceSeenAt.current > NO_FACE_THRESHOLD_MS) {
            appendLog("No face detected -> sending no-face alert");
            await sendAlert("no-face", "high", `No face for > ${NO_FACE_THRESHOLD_MS/1000}s`, true);
            lastFaceSeenAt.current = now + 2000;
          }
        } else {
          lastFaceSeenAt.current = now;
          if (detections.length > 1) {
            if (!multiFaceSince.current) multiFaceSince.current = now;
            if (now - multiFaceSince.current > MULTI_FACE_CONFIRM_MS) {
              appendLog("Multiple faces confirmed -> sending multiple-faces alert");
              await sendAlert("multiple-faces", "high", `Detected ${detections.length} faces`, true);
              multiFaceSince.current = null;
            }
          } else {
            multiFaceSince.current = null;
          }
        }
      } catch (err) {
        appendLog("Face detection error: " + (err?.message || err));
      }

      // OBJECT detection via coco-ssd
      if (objectModelRef.current) {
        try {
          const predictions = await objectModelRef.current.detect(video);
          appendLog("object predictions length=" + (predictions?.length || 0));
          if (predictions && predictions.length) {
            appendLog("top preds: " + predictions.slice(0,4).map(p=>`${p.class}(${p.score.toFixed(2)})`).join(", "));
          }

          // find suspicious objects using includes, and score threshold
          const suspicious = (predictions || []).filter(p => {
            const cls = String(p.class).toLowerCase();
            const scoreOk = p.score >= OBJECT_SCORE_THRESHOLD;
            return scoreOk && SUSPICIOUS_OBJECT_TEXTS.some(s => cls.includes(s));
          });

          if (suspicious.length > 0) {
            const now = Date.now();
            const top = suspicious[0];
            const objClass = top.class.toLowerCase();
            if (lastObjectType.current === objClass) {
              if (!objectSince.current) objectSince.current = now;
              if (now - objectSince.current > OBJECT_CONFIRM_MS && now - objectAlertCooldown.current > 4000) {
                appendLog("Suspicious object confirmed -> " + objClass);
                await sendAlert("object-detected", "high", `Detected ${objClass} (${top.score.toFixed(2)})`, true);
                objectAlertCooldown.current = Date.now();
                objectSince.current = null;
                lastObjectType.current = null;
              }
            } else {
              lastObjectType.current = objClass;
              objectSince.current = Date.now();
              appendLog("Suspicious object first seen: " + objClass);
            }
          } else {
            lastObjectType.current = null;
            objectSince.current = null;
          }
        } catch (err) {
          appendLog("Object detection error: " + (err?.message || err));
        }
      } else {
        appendLog("Object model not loaded yet");
      }
    }

    // set/clear interval based on running
    if (running) {
      runDetections();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (running) runDetections();
      }, DETECT_INTERVAL_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, sessionId]);

  // start proctor: camera + session + run
  async function handleStartProctor() {
    try {
      await startCamera();
      const sid = await startSession();
      setSessionId(sid);
      setRunning(true);
    } catch (err) {
      appendLog("handleStartProctor error: " + (err?.message || err));
    }
  }

  // stop proctor
  async function handleStopProctor() {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRunning(false);

      // stop audio monitoring
      stopAudioMonitoring();

      if (sessionId) {
        await fetch("http://localhost:5000/api/end-session", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify({ sessionId })
        });
        appendLog("Session ended: " + sessionId);
      }

      // stop camera
      const video = videoRef.current;
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(t => t.stop());
        video.srcObject = null;
      }
      setSessionId(null);
    } catch (err) {
      appendLog("handleStopProctor error: " + (err?.message || err));
    }
  }

  // manual test alert
  async function handleManualAlert() {
    if (!sessionId) {
      appendLog("No sessionId - start proctoring first");
      return;
    }
    appendLog("Sending manual test alert");
    await sendAlert("manual-test", "low", "manual test", true);
  }

  // --- Start/stop audio and tab listeners when running toggles ---
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") sendTabEvent("visibility_hidden");
      else sendTabEvent("visibility_visible");
    }
    function handleBlur() { sendTabEvent("window_blur"); }
    function handleFocus() { sendTabEvent("window_focus"); }
    function handleBeforeUnload(e) {
      // send navigation event - don't upload frame
      if (sessionId) {
        // use navigator.sendBeacon if available
        try {
          const payload = JSON.stringify({ sessionId, type: 'navigation', reason: 'beforeunload', timestamp: new Date().toISOString() });
          if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon("http://localhost:5000/api/alerts", blob);
          } else {
            // fallback - synchronous XHR discouraged; use fetch but may not finish
            fetch("http://localhost:5000/api/alerts", { method: 'POST', headers: {'Content-Type':'application/json'}, body: payload });
          }
        } catch (err) {
          console.error("beforeunload send error", err);
        }
      }
    }

    if (running) {
      // audio
      startAudioMonitoring();
      // tab events
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("beforeunload", handleBeforeUnload);
      appendLog("Audio + Tab monitoring enabled");
    } else {
      // cleanup listeners when stopped
      stopAudioMonitoring();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      appendLog("Audio + Tab monitoring disabled");
    }

    return () => {
      stopAudioMonitoring();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, sessionId]);

  return (
    
    <div style={{ padding: 20 }}>
       <div style={{ marginLeft:"1150px" , display:"flex", gap:"12px"}} >
        <button className="btn1" onClick={() => navigate("/admindashboard")}>AdminDashBoard</button>
       <button className="btn1" onClick={() => navigate("/sessions")}>Session</button>
      </div >
      <h2>Live Proctor (Face + Object Detection)</h2>
      

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <video ref={videoRef} style={{ width: 480, height: 360, background: "#000" }} muted />
          <canvas ref={canvasRef} style={{ position: "absolute", left: 0, top: 0 }} />
        </div>

        <div style={{ minWidth: 300 }}>
          <p>Session: <strong>{sessionId ?? "Not started"}</strong></p>
          <p>Status: {running ? "Running" : "Stopped"}</p>

          {!running ? (
            <button onClick={handleStartProctor} style={{ padding: "10px 14px", marginBottom: 8 }}>Start Proctoring</button>
          ) : (
            <button onClick={handleStopProctor} style={{ padding: "10px 14px", marginBottom: 8 }}>Stop Proctoring</button>
          )}
          
          <div style={{ marginTop: 12 }}>
            <button onClick={handleManualAlert} style={{ padding: "8px 12px", marginRight: 8 }}>Send Test Alert</button>
            <button onClick={() => { setDebugLogs([]); appendLog("Cleared logs"); }} style={{ padding: "8px 12px" }}>Clear Logs</button>
          </div>

          {/* Added audio status UI */}
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, color: "#666" }}>Client Signals:</p>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13 }}>Mic: {micAllowed === null ? "not asked" : micAllowed ? "allowed" : "denied"}</div>
              <div style={{ marginTop: 6, fontSize: 12 }}>
                RMS: {audioRms.toFixed(4)}
                <div style={{ height: 8, width: '100%', background: '#eee', borderRadius: 4, marginTop: 6 }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, audioRms * 800)}%`,
                    background: '#4caf50',
                    borderRadius: 4,
                    transition: 'width 120ms linear'
                  }} />
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <p style={{ margin: 0, color: "#666" }}>Alerts & Evidence (latest first):</p>
            <div style={{ marginTop: 8 }}>
              {localEvents.length === 0 ? <div style={{ color: "#666" }}>No alerts yet</div> :
                localEvents.map(ev => (
                  <div key={ev.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    {ev.thumbnailUrl ? (
                      <img src={ev.thumbnailUrl} alt="thumb" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 4 }} onClick={()=>{
                        window.open(ev.thumbnailUrl, "_blank");
                      }} />
                    ) : (
                      <div style={{ width: 80, height: 60, background: "#eee", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>No image</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{ev.type}</div>
                      <div style={{ fontSize: 12, color: "#444" }}>{new Date(ev.timestamp).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{ev.details}</div>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <h3>Debug logs (latest)</h3>
        <div style={{ maxHeight: 240, overflow: "auto", background: "#fbfcff", padding: 10, borderRadius: 8, border: "1px solid #eef2f7" }}>
          {debugLogs.length === 0 ? <div style={{ color: "#777" }}>No logs yet</div> :
            <ul style={{ margin: 0, paddingLeft: 14 }}>
              {debugLogs.map((l, i) => <li key={i} style={{ fontSize: 13, marginBottom: 6 }}>{l}</li>)}
            </ul>
          }
        </div>
      </div>
     
    </div>
  );
}
