import React, { useState } from "react";
import "./SignUp.css";
import { FaBuilding, FaUser, FaEnvelope, FaLock } from "react-icons/fa";

const SignUp = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [form, setForm] = useState({
		org: "",
		name: "",
		email: "",
		phone: "",
		password: "",
	});

	const handleChange = (e) => {
		setForm({ ...form, [e.target.name]: e.target.value });
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		console.log("User Signed Up:", form);
	};

	return (
		<div className="signup-page">
			<div className="signup-card">

				<h1 className="signup-title">Sign Up</h1>

				<form onSubmit={handleSubmit} className="signup-form">

					{/* Organization */}
					<label>
						<span>Organization Name</span>
						<div className="input-field">
							<FaBuilding className="icon" />
							<input
								name="org"
								type="text"
								placeholder="Company Name"
								value={form.org}
								onChange={handleChange}
							/>
						</div>
					</label>

					{/* Name */}
					<label>
						<span>Name *</span>
						<div className="input-field">
							<FaUser className="icon" />
							<input
								name="name"
								type="text"
								placeholder="Name"
								required
								value={form.name}
								onChange={handleChange}
							/>
						</div>
					</label>

					{/* Email */}
					<label>
						<span>Email *</span>
						<div className="input-field">
							<FaEnvelope className="icon" />
							<input
								name="email"
								type="email"
								placeholder="Mail@company.com"
								required
								value={form.email}
								onChange={handleChange}
							/>
						</div>
					</label>

					{/* Mobile */}
					<label>
						<span>Mobile *</span>
						<div className="input-field phone">
							<span className="flag">🇮🇳 +91</span>
							<input
								name="phone"
								type="text"
								placeholder="81234 56789"
								required
								value={form.phone}
								onChange={handleChange}
							/>
						</div>
					</label>

					{/* Password */}
					<label>
						<span>Password *</span>
						<div className="input-field">
							<FaLock className="icon" />
							<input
								name="password"
								type={showPassword ? "text" : "password"}
								placeholder="Password"
								required
								value={form.password}
								onChange={handleChange}
							/>
							<span
								className="toggle-pass"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? "🙈" : "👁️"}
							</span>
						</div>
					</label>



					<button type="submit" className="btn-primary">
						SIGN UP
					</button>

					<p className="signin-text">
						Have an account? <a href="/login">Sign In</a>
					</p>
				</form>
			</div>
		</div>
	);
};

export default SignUp;
