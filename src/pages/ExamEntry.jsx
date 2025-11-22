// src/pages/ExamEntry.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import StudentProctor from "./StudentProctor"; // adjust path if needed

const API_BASE = "http://localhost:5000";

export default function ExamEntry() {
  const { code } = useParams(); // /exam/:code

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(1); // 1: details, 2: system, 3: instructions, 4: test
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  // system check
  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [internetOk, setInternetOk] = useState(false);
  const [micChecking, setMicChecking] = useState(false);
  const [micStatusText, setMicStatusText] = useState(
    "Please speak normally for a few seconds…"
  );
  const [internetChecking, setInternetChecking] = useState(false);
  const [internetSpeedMbps, setInternetSpeedMbps] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const micCheckAnimRef = useRef(null);
  const micCheckStartTimeRef = useRef(0);

  // exam session from backend
  const [examSession, setExamSession] = useState(null);

  // questions + answers + timer
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeftSec, setTimeLeftSec] = useState(null);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);

  // ─────────────────────────────────────
  // 1) Load exam by linkCode
  // ─────────────────────────────────────
  useEffect(() => {
    async function loadExam() {
      try {
        const res = await fetch(`${API_BASE}/api/exams/link/${code}`);
        const data = await res.json();
        if (data.success) {
          setExam(data.exam);
        } else {
          alert(data.message || "Exam not found");
        }
      } catch (err) {
        console.error("loadExam error", err);
        alert("Failed to load exam");
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [code]);

  // ─────────────────────────────────────
  // 2) System checks
  // ─────────────────────────────────────
  useEffect(() => {
    if (step === 2) {
      runSystemChecks();
    } else {
      cleanupMedia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function cleanupMedia() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (micCheckAnimRef.current) {
      cancelAnimationFrame(micCheckAnimRef.current);
      micCheckAnimRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }

  async function runSystemChecks() {
    setCameraOk(false);
    setMicOk(false);
    setInternetOk(false);
    setInternetSpeedMbps(null);
    setMicStatusText("Please speak normally for a few seconds…");

    // camera + mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOk(true);
      startMicMonitor(stream);
    } catch (err) {
      console.error("camera/mic error", err);
      alert(
        "Could not access camera or microphone. Please allow permissions and refresh."
      );
    }

    // internet
    testInternetSpeed();
  }

  function startMicMonitor(stream) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        setMicStatusText(
          "Browser does not support audio analysis. Assuming mic is OK."
        );
        setMicOk(true);
        return;
      }

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      micCheckStartTimeRef.current = performance.now();
      setMicChecking(true);
      setMicStatusText("Speak normally for 3–5 seconds…");

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        analyser.getByteTimeDomainData(dataArray);
        let maxDeviation = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const deviation = Math.abs(dataArray[i] - 128);
          if (deviation > maxDeviation) maxDeviation = deviation;
        }
        const elapsed = performance.now() - micCheckStartTimeRef.current;

        if (maxDeviation > 20) {
          setMicOk(true);
          setMicChecking(false);
          setMicStatusText("We detected your voice. Microphone looks good.");
          return;
        }

        if (elapsed > 7000) {
          setMicChecking(false);
          if (!micOk) {
            setMicStatusText(
              "We could not clearly detect audio. Please check your microphone."
            );
          }
          return;
        }

        micCheckAnimRef.current = requestAnimationFrame(loop);
      };

      micCheckAnimRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("mic monitor error", err);
      setMicChecking(false);
      setMicStatusText(
        "Could not analyse microphone. Please ensure it is enabled."
      );
    }
  }

  async function testInternetSpeed() {
    setInternetChecking(true);
    setInternetSpeedMbps(null);
    try {
      const start = performance.now();
      const res = await fetch(`/vite.svg?cb=${Date.now()}`, {
        cache: "no-store",
      });
      const blob = await res.blob();
      const durationSec = (performance.now() - start) / 1000;
      const sizeBytes = blob.size || 0;

      if (sizeBytes > 0 && durationSec > 0) {
        const bits = sizeBytes * 8;
        const mbps = bits / (durationSec * 1024 * 1024);
        setInternetSpeedMbps(mbps);
        setInternetOk(mbps >= 0.3); // simple threshold
      } else {
        setInternetOk(true); // fallback
      }
    } catch (err) {
      console.error("internet check error", err);
      setInternetOk(false);
    } finally {
      setInternetChecking(false);
    }
  }

  // ─────────────────────────────────────
  // 3) Steps navigation
  // ─────────────────────────────────────
  function handleDetailsNext() {
    if (!studentName || !studentEmail) {
      alert("Please enter your name and email");
      return;
    }
    setStep(2);
  }

  // ─────────────────────────────────────
  // 4) Start exam session (calls backend: POST /api/exams/:id/sessions)
  // ─────────────────────────────────────
  async function handleStartTest() {
    try {
      const res = await fetch(`${API_BASE}/api/exams/${exam._id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentEmail,
          // later we can add proctorSessionId here
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Failed to start exam session");
        return;
      }

      setExamSession(data.session);
      setStep(4);
      setCurrentIndex(0);
      setAnswers({});
      setFinished(false);

      const durationMin =
        exam.durationMinutes && exam.durationMinutes > 0
          ? exam.durationMinutes
          : 30;
      setTimeLeftSec(durationMin * 60);
    } catch (err) {
      console.error("start exam session error", err);
      alert("Error starting exam");
    }
  }

  // ─────────────────────────────────────
  // 5) Timer effect (auto submit on time over)
  // ─────────────────────────────────────
  useEffect(() => {
    if (!examSession || step !== 4 || finished) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timeLeftSec == null) return;

    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeftSec((prev) => {
          if (prev == null) return prev;
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            handleFinishTest(true); // auto submit
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examSession, step, finished, timeLeftSec]);

  // ─────────────────────────────────────
  // 6) Questions + answers
  // ─────────────────────────────────────
  const questions =
    exam && Array.isArray(exam.questions) && exam.questions.length > 0
      ? exam.questions
      : [
          {
            text: "Sample question 1 (add real questions in admin panel).",
            options: ["Option A", "Option B", "Option C", "Option D"],
            correctIndex: 1,
          },
          {
            text: "Sample question 2.",
            options: ["True", "False"],
            correctIndex: 0,
          },
        ];

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || questions[0];

  function handleAnswerChange(value) {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: value,
    }));
  }

  function goPrev() {
    setCurrentIndex((idx) => Math.max(0, idx - 1));
  }

  function goNext() {
    setCurrentIndex((idx) => Math.min(totalQuestions - 1, idx + 1));
  }

  // ─────────────────────────────────────
  // 7) Finish exam (calls backend: POST /api/exam-sessions/:id/complete)
  // ─────────────────────────────────────
  async function handleFinishTest(autoByTimer = false) {
    if (!examSession || finished) return;

    if (!autoByTimer) {
      const ok = window.confirm("Are you sure you want to submit the test?");
      if (!ok) return;
    }

    setFinished(true);

    // simple score using correctIndex
    let score = 0;
    questions.forEach((q, idx) => {
      if (typeof q.correctIndex === "number") {
        if (answers[idx] === q.correctIndex) score++;
      }
    });

    const payload = {
      responses: answers,
      score,
      completedAt: new Date().toISOString(),
      autoSubmitted: autoByTimer,
    };

    try {
      const res = await fetch(
        `${API_BASE}/api/exam-sessions/${examSession._id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        alert(
          autoByTimer
            ? "Time is over. Your test has been auto-submitted."
            : "Test submitted successfully."
        );
      } else {
        alert(
          "Test finished (demo). Backend did not confirm submission (check /api/exam-sessions/:id/complete)."
        );
      }
    } catch (err) {
      console.error("finish test error", err);
      alert("Test finished (demo). Error sending data to server.");
    }
  }

  function formatTime(sec) {
    if (sec == null) return "--:--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m < 10 ? `0${m}` : String(m);
    const ss = s < 10 ? `0${s}` : String(s);
    return `${mm}:${ss}`;
  }

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────
  if (loading) return <div style={{ padding: 20 }}>Loading exam…</div>;
  if (!exam) return <div style={{ padding: 20 }}>Exam not found</div>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0 }}>{exam.title}</h2>
        {exam.description && (
          <p style={{ marginTop: 6, color: "#4b5563" }}>{exam.description}</p>
        )}
      </div>

      <div style={{ marginBottom: 16, fontSize: 14, color: "#6b7280" }}>
        Step {step} of 4
      </div>

      {/* STEP 1: Details */}
      {step === 1 && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            maxWidth: 480,
          }}
        >
          <h3 style={{ marginTop: 0 }}>Your Details</h3>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            Please enter your name and email. These will appear in the exam
            report.
          </p>
          <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
            Full Name
          </label>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your full name"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #d1d5db",
              marginBottom: 10,
            }}
          />
          <label style={{ display: "block", fontSize: 14 }}>
            Email Address
          </label>
          <input
            type="email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            placeholder="Enter your email"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #d1d5db",
              marginBottom: 16,
            }}
          />
          <button
            onClick={handleDetailsNext}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "white",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Next: System Check
          </button>
        </div>
      )}

      {/* STEP 2: System checklist */}
      {step === 2 && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>System Checklist</h3>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            We are automatically checking your camera, microphone and internet.
          </p>

          <div style={{ marginTop: 10, marginBottom: 12 }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: 260,
                height: 180,
                background: "#000",
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Camera preview during check.
            </div>
          </div>

          <ul style={{ listStyle: "none", paddingLeft: 0, marginTop: 10 }}>
            <li style={{ marginBottom: 8 }}>
              <StatusItem
                label="Camera is enabled and clearly shows my face."
                ok={cameraOk}
                checking={!cameraOk}
              />
            </li>
            <li style={{ marginBottom: 8 }}>
              <StatusItem
                label="Microphone is enabled and working."
                ok={micOk}
                checking={micChecking}
              />
              <div
                style={{ fontSize: 12, color: "#6b7280", marginLeft: 24 }}
              >
                {micStatusText}
              </div>
            </li>
            <li style={{ marginBottom: 8 }}>
              <StatusItem
                label="Internet connection is stable for the exam duration."
                ok={internetOk}
                checking={internetChecking}
              />
              {internetSpeedMbps != null && (
                <div
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginLeft: 24,
                  }}
                >
                  Measured speed: {internetSpeedMbps.toFixed(2)} Mbps
                </div>
              )}
            </li>
          </ul>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Back
            </button>
            <button
              onClick={runSystemChecks}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "#f3f4f6",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Re-run checks
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!(cameraOk && micOk && internetOk)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background:
                  cameraOk && micOk && internetOk ? "#2563eb" : "#9ca3af",
                color: "white",
                cursor:
                  cameraOk && micOk && internetOk ? "pointer" : "not-allowed",
                fontWeight: 500,
                marginLeft: "auto",
              }}
            >
              Continue to Instructions
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Instructions */}
      {step === 3 && (
        <div
          style={{
            padding: 16,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Exam Instructions</h3>
          <div style={{ fontSize: 14, color: "#374151" }}>
            <p>
              <strong>Total Questions:</strong>{" "}
              {exam.totalQuestions != null ? exam.totalQuestions : "-"}
            </p>
            <p>
              <strong>Passing Marks:</strong>{" "}
              {exam.passingMarks != null ? exam.passingMarks : "-"}
            </p>
            <p>
              <strong>Duration:</strong>{" "}
              {exam.durationMinutes != null
                ? `${exam.durationMinutes} minutes`
                : "-"}
            </p>
          </div>

          <ul style={{ marginTop: 10, fontSize: 14, color: "#4b5563" }}>
            <li>Do not move out of the camera frame during the exam.</li>
            <li>Do not use mobile phones or extra devices.</li>
            <li>Your camera and behavior are monitored using AI proctoring.</li>
          </ul>

          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setStep(2)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #d1d5db",
                background: "white",
                cursor: "pointer",
                marginRight: 8,
                fontSize: 14,
              }}
            >
              Back
            </button>
            <button
              onClick={handleStartTest}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "none",
                background: "#16a34a",
                color: "white",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Start Test
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Test + Proctor */}
      {step === 4 && examSession && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 14, color: "#4b5563" }}>
              Student: <strong>{examSession.studentName}</strong> (
              {examSession.studentEmail})
              <br />
              Exam: <strong>{exam.title}</strong>
            </div>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: finished ? "#fee2e2" : "#ecfdf3",
                fontSize: 14,
              }}
            >
              ⏱ Time Left:{" "}
              <strong>{finished ? "00:00" : formatTime(timeLeftSec)}</strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Questions panel */}
            <div
              style={{
                flex: 2,
                minWidth: 260,
                padding: 16,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <h4 style={{ margin: 0 }}>
                  Question {currentIndex + 1} of {totalQuestions}
                </h4>
                {finished && (
                  <span style={{ fontSize: 13, color: "#dc2626" }}>
                    Test submitted
                  </span>
                )}
              </div>

              <p style={{ fontSize: 15, color: "#111827" }}>
                {currentQuestion.text || currentQuestion.questionText}
              </p>

              {Array.isArray(currentQuestion.options) &&
              currentQuestion.options.length > 0 ? (
                <div style={{ marginTop: 8 }}>
                  {currentQuestion.options.map((opt, idx) => (
                    <label
                      key={idx}
                      style={{
                        display: "block",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid #e5e7eb",
                        marginBottom: 6,
                        cursor: finished ? "default" : "pointer",
                        background:
                          answers[currentIndex] === idx
                            ? "#eff6ff"
                            : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name={`q_${currentIndex}`}
                        value={idx}
                        disabled={finished}
                        checked={answers[currentIndex] === idx}
                        onChange={() => handleAnswerChange(idx)}
                        style={{ marginRight: 8 }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  disabled={finished}
                  value={answers[currentIndex] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Type your answer here"
                  style={{
                    width: "100%",
                    minHeight: 120,
                    marginTop: 8,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    fontSize: 14,
                  }}
                />
              )}

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0 || finished}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor:
                      currentIndex === 0 || finished
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 14,
                  }}
                >
                  ⬅ Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={
                    currentIndex === totalQuestions - 1 || finished
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #d1d5db",
                    background: "white",
                    cursor:
                      currentIndex === totalQuestions - 1 || finished
                        ? "not-allowed"
                        : "pointer",
                    fontSize: 14,
                  }}
                >
                  Next ➡
                </button>
                <button
                  onClick={() => handleFinishTest(false)}
                  disabled={finished}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#dc2626",
                    color: "white",
                    cursor: finished ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    marginLeft: "auto",
                  }}
                >
                  Finish Test
                </button>
              </div>
            </div>

            {/* Proctor panel */}
            <div
              style={{
                flex: 1,
                minWidth: 260,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <h4 style={{ marginTop: 0 }}>Proctoring</h4>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                Your camera is monitored using AI proctoring. Do not close this
                panel during the exam.
              </p>
              <StudentProctor />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// helper component for checklist rows
function StatusItem({ label, ok, checking }) {
  let icon = "⏳";
  let color = "#6b7280";

  if (ok) {
    icon = "✅";
    color = "#16a34a";
  } else if (!checking) {
    icon = "⚠️";
    color = "#dc2626";
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 14, color }}>{label}</span>
    </div>
  );
}
