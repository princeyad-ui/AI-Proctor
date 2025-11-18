import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: replace with real auth
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    // fake success
    alert("Signed in");
    navigate("/");
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-heading">Sign In</h1>

        <label className="field-label">Email <span className="req">*</span></label>
        <div className="input-wrap">
          <span className="input-icon">📧</span>
          <input
            type="email"
            className="input-field"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label className="field-label">Password <span className="req">*</span></label>
        <div className="input-wrap">
          <span className="input-icon">🔒</span>
          <input
            type={showPwd ? "text" : "password"}
            className="input-field"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="pwd-toggle"
            onClick={() => setShowPwd(s => !s)}
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="forgot-row">
          <Link to="/forgot" className="forgot-link">Forgot Password?</Link>
        </div>

        <button type="submit" className="sign-btn">SIGN IN</button>

        <div className="signup-row">
          <span>Don't have an account? </span>
          <Link to="/signup" className="signup-link">Sign Up</Link>
        </div>
      </form>
    </div>
  );
}
