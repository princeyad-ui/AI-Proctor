import React, { useState } from "react";
import "./Contact.css";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState(""); // "", "sending", "sent", "error"

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic client-side validation
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      return;
    }

    setStatus("sending");

    // Simulate sending — replace with real API call
    setTimeout(() => {
      console.log("Contact form submitted:", form);
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
      // reset status after a short while
      setTimeout(() => setStatus(""), 3000);
    }, 900);
  };

  return (
    <div className="contact-page container">
      <div className="contact-grid">
        <div className="contact-info">
          <h1>Contact Us</h1>
          <p className="muted">
            Have questions or want a demo of AI-Proctor? Fill the form and our team will get back to you within 24 hours.
          </p>

          <div className="info-block">
            <h4>Support</h4>
            <p><a href="mailto:hello@aiproctor.example">hello@aiproctor.example</a></p>
          </div>

          <div className="info-block">
            <h4>Office</h4>
            <p>123, Tech Park, YourCity, YourCountry</p>
          </div>

          <div className="info-block">
            <h4>Phone</h4>
            <p>+1 (555) 123-4567</p>
          </div>
        </div>

        <form className="contact-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>Name</span>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              required
            />
          </label>

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
            <span>Subject (optional)</span>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange}
              placeholder="Subject"
            />
          </label>

          <label>
            <span>Message</span>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows="6"
              placeholder="Write your message here..."
              required
            />
          </label>

          <div className="form-row">
            <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>

            <div className="form-status">
              {status === "error" && <span className="status error">Please fill required fields.</span>}
              {status === "sent" && <span className="status success">Thanks — message sent!</span>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Contact;
