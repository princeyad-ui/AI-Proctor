import React from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./pages/NavBar";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Login from "./pages/Login";

const App = () => {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/features" element={<Features />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  )
}

export default App