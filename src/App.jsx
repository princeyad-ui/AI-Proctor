import React from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./pages/NavBar";
import HomePage from "./pages/HomePage";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Footer from "./pages/Footer";
import Proctor from "./pages/Proctor";
import Sessions from "./pages/Sessions";
import AdminDashboard from "./pages/AdminDashboard";


const App = () => {
  return (
    <Router>
      <NavBar />
      <Routes>
          <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<Features />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/proctor" element={<Proctor />} />
        <Route path="/sessions" element={<Sessions />} />
         <Route path="/admindashboard" element={<AdminDashboard />} />

      </Routes>
       <Footer /> 
    </Router>
  )
}

export default App