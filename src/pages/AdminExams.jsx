// src/pages/AdminExams.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://localhost:5000";

export default function AdminExams() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalQuestions, setTotalQuestions] = useState("");
  const [passingMarks, setPassingMarks] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/exams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setExams(data.exams || []);
      } else {
        alert(data.message || "Failed to load exams");
      }
    } catch (err) {
      console.error(err);
      alert("Error loading exams");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!title) {
      alert("Please enter a title");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          totalQuestions: totalQuestions ? Number(totalQuestions) : undefined,
          passingMarks: passingMarks ? Number(passingMarks) : undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("Exam created");
        setTitle("");
        setDescription("");
        setTotalQuestions("");
        setPassingMarks("");
        setDurationMinutes("");
        loadExams();
      } else {
        alert(data.message || "Failed to create exam");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating exam");
    }
  }

  function examLink(exam) {
    // link students will open; adjust port if your frontend runs on different port
    return `${window.location.origin}/exam/${exam.linkCode}`;
  }

  function copyLink(link) {
    navigator.clipboard
      .writeText(link)
      .then(() => alert("Link copied to clipboard"))
      .catch(() => alert("Failed to copy link"));
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h2>Conduct Exam (Admin)</h2>
        <button
          onClick={() => navigate("/profile")}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            cursor: "pointer",
          }}
        >
          Back to Profile
        </button>
      </div>

      {/* Create Exam Form */}
      <form
        onSubmit={handleCreate}
        style={{
          marginTop: 16,
          maxWidth: 640,
          padding: 16,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
        }}
      >
        <h3 style={{ marginTop: 0 }}>New Exam</h3>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
            Title *
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AI Proctored Midterm"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #d1d5db",
            }}
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description or instructions for students..."
            rows={3}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #d1d5db",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Total Questions
            </label>
            <input
              type="number"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              placeholder="e.g. 20"
              style={{
                width: 140,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Passing Marks
            </label>
            <input
              type="number"
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)}
              placeholder="e.g. 10"
              style={{
                width: 140,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g. 30"
              style={{
                width: 160,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #d1d5db",
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {loading ? "Creating..." : "Create Exam"}
        </button>
      </form>

      {/* Existing Exams List */}
      <h3 style={{ marginTop: 24 }}>Your Exams</h3>
      {exams.length === 0 ? (
        <div style={{ color: "#6b7280" }}>No exams created yet.</div>
      ) : (
        <div
          style={{
            marginTop: 8,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {exams.map((ex) => {
            const link = examLink(ex);
            return (
              <div
                key={ex._id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 600 }}>{ex.title}</div>
                {ex.description && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#4b5563",
                      maxHeight: 40,
                      overflow: "hidden",
                    }}
                  >
                    {ex.description}
                  </div>
                )}
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Questions: {ex.totalQuestions ?? "-"} | Passing:{" "}
                  {ex.passingMarks ?? "-"} | Duration:{" "}
                  {ex.durationMinutes ?? "-"} min
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Created:{" "}
                  {ex.createdAt
                    ? new Date(ex.createdAt).toLocaleString()
                    : "-"}
                </div>

                <div
                  style={{
                    marginTop: 4,
                    padding: 6,
                    borderRadius: 6,
                    background: "#f9fafb",
                    fontSize: 12,
                    wordBreak: "break-all",
                  }}
                >
                  Exam Link:{" "}
                  <a href={link} target="_blank" rel="noreferrer">
                    {link}
                  </a>
                </div>

                <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => copyLink(link)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "1px solid #d1d5db",
                      background: "#f3f4f6",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Copy Link
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/admin/exams/${ex._id}/sessions`)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      border: "none",
                      background: "#10b981",
                      color: "white",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    View Sessions
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
