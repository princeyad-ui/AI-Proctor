import React, { useState } from "react";
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
