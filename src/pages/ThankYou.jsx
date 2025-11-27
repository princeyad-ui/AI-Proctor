// src/pages/ThankYou.jsx
import React from "react";
import "./ThankYou.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();

  // 1) values from navigate(..., { state })
  const state = location.state || {};
  // 2) values from query string ?name=..&exam=..
  const params = new URLSearchParams(location.search);

  const studentName =
    state.studentName || params.get("name") || ""; // fallback empty
  const examTitle =
    state.examTitle || params.get("exam") || "Exam";

  return (
    <div className="ty-container">
      <div className="ty-card">
        <div className="ty-icon">🎉</div>

        <h1 className="ty-heading">Thank You!</h1>

        {studentName && (
          <p className="ty-student-name">{studentName}</p>
        )}

        <p className="ty-subtitle">
          Your exam <strong>{examTitle}</strong> has been submitted successfully.
        </p>

        <p className="ty-desc">
          Your responses have been securely recorded.
          Our AI proctoring system captured and analyzed your activity to ensure
          exam integrity. You may now safely close this page or return to the
          home screen.
        </p>

       
      </div>
    </div>
  );
}
