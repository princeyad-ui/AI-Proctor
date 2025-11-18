import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";

export default function Signup() {
  const [org, setOrg] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // Replace with real signup API call later
    if (!name || !email || !phone || !password) {
      alert("Please fill required fields");
      return;
    }
    // fake success
    alert("Account created (demo)");
    navigate("/login");
  }

  return (
    <div className="signup-page">
      <form className="signup-card" onSubmit={handleSubmit}>
        <h1 className="signup-heading">Sign Up</h1>

        <label className="label">Organization Name</label>
        <div className="input-wrap light">
          <span className="input-icon">🏢</span>
          <input
            className="input-field"
            placeholder="Company Name"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </div>

        <label className="label">Name <span className="req">*</span></label>
        <div className="input-wrap">
          <span className="input-icon">👤</span>
          <input
            className="input-field"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <label className="label">Email <span className="req">*</span></label>
        <div className="input-wrap">
          <span className="input-icon">📧</span>
          <input
            type="email"
            className="input-field"
            placeholder="Mail@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <label className="label">Mobile <span className="req">*</span></label>
        <div className="phone-wrap">
          <div className="country-select">
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
            </select>
          </div>
          <div className="input-wrap phone-input">
            <input
              className="input-field"
              placeholder="81234 56789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
        </div>

        <label className="label">Password <span className="req">*</span></label>
        <div className="input-wrap">
          <span className="input-icon">🔒</span>
          <input
            type={showPwd ? "text" : "password"}
            className="input-field"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" className="pwd-toggle" onClick={() => setShowPwd(s => !s)}>
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" className="signup-btn">SIGN UP</button>

        <div className="signin-row">
          <span>Have an account? </span>
          <Link to="/login" className="signin-link">Sign In</Link>
        </div>
      </form>
    </div>
  );
}
