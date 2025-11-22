import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");          // ✅ added
  const [loading, setLoading] = useState(false);   // optional, for UX
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Server returned non-JSON response");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid login");
      }

      // ✅ backend sends { success, token, user: {...} }
      localStorage.setItem("token", data.token);
      localStorage.setItem("adminName", data.user.name || "");

      // Redirect to profile page
      navigate("/profile");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-heading">Sign In</h1>

        {/* ✅ show error if any */}
        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <label className="field-label">
          Email <span className="req">*</span>
        </label>
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

        <label className="field-label">
          Password <span className="req">*</span>
        </label>
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
            onClick={() => setShowPwd((s) => !s)}
            aria-label={showPwd ? "Hide password" : "Show password"}
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="forgot-row">
          <Link to="/forgot" className="forgot-link">
            Forgot Password?
          </Link>
        </div>

        <button type="submit" className="sign-btn" disabled={loading}>
          {loading ? "Signing in..." : "SIGN IN"}
        </button>

        <div className="signup-row">
          <span>Don't have an account? </span>
          <Link to="/signup" className="signup-link">
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}
