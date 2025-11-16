import React from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./pages/NavBar";
import HomePage from "./pages/HomePage";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Footer from "./pages/Footer";

const App = () => {
  return (
    <Router>
      <NavBar />
      <Routes>
          <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<Features />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
      </Routes>
       <Footer /> 
    </Router>
  )
}

export default App