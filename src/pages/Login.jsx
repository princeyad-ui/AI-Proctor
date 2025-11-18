import React, { useState } from "react";
<<<<<<< HEAD
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
=======
import { Link } from "react-router-dom";

import "./Login.css";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      setStatus("error");
      return;
    }

    setStatus("loading");

    // Simulate API call
    setTimeout(() => {
      console.log("Logged in:", form);
      setStatus("success");
      setTimeout(() => setStatus(""), 2500);
    }, 1000);
  };

  return (
    <div className="login-page container">
      <div className="login-card">

        <h1 className="login-title">Login</h1>
        <p className="muted login-sub">
          Welcome back! Please enter your credentials to continue.
        </p>

        <form onSubmit={handleSubmit} className="login-form">

          <label>
            <span>Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </label>

          <a href="#" className="forgot-link">Forgot password?</a>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Logging in..." : "Login"}
          </button>

          {status === "error" && (
            <p className="status error">Fill all required fields.</p>
          )}
          {status === "success" && (
            <p className="status success">Login successful!</p>
          )}

          <p className="signup-text">
            Don’t have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
>>>>>>> aba3405d7df38e22b803edfe49f269eabe134d6e
