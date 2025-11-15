import React from 'react'
import "./NavBar.css";
import { Link } from "react-router-dom";


const NavBar = () => {
  return (
     <nav className="navbar">
      
      {/* Logo Section */}
      <div className="logo">
        AI-Proctor
      </div>

      {/* Menu */}
      <ul className="nav-links">
        <li><Link to="/features">Features</Link></li>
        <li><Link to="/contact">Contact</Link></li>
        <li><Link to="/login" className="login-btn">Login</Link></li>
      </ul>

    </nav>
  )
}

export default NavBar