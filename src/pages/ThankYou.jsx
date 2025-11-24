// src/pages/ThankYou.jsx
import React from "react";
import "./ThankYou.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function ThankYou() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentName, examTitle } = location.state || {};

  return (
    <div className="ty-container">
      <div className="ty-card">
        <div className="ty-icon">🎉</div>

        <h1 className="ty-heading">Thank You!</h1>

        {studentName && (
          <p className="ty-student-name">{studentName}</p>
        )}

        <p className="ty-subtitle">
          Your exam <strong>{examTitle || "Exam"}</strong> has been submitted successfully.
        </p>

        <p className="ty-desc">
          Your responses have been securely recorded.  
          Our AI proctoring system captured and analyzed your activity to ensure exam integrity.  
          You may now safely close this page or return to the home screen.
        </p>

        <button
          className="ty-btn"
          onClick={() => navigate("/")}
        >
          Go to Home
        </button>
      </div>
    </div>
  );
}
