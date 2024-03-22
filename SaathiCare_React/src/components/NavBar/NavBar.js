import React, { useState } from 'react';
import './NavBar.css';
import { FaSignInAlt, FaCaretDown } from 'react-icons/fa';
import { NavLink, useNavigate } from 'react-router-dom';

function NavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleChatbotClick = () => {
    navigate("/");
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const openDropdown = () => {
    setIsDropdownOpen(true);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={handleChatbotClick}>
        <img src="https://lh3.googleusercontent.com/u/0/drive-viewer/AKGpihbYUgV9yP3x10tHQ3v6MzOoLBoFEHOpEzJJqW-ToQxKk8V5jtO0ngEn_geQloM7I1CLpGcwAh4g42cfrTy_pb-veyge=w1572-h1558" alt="Logo" className="navbar-logo" />
        <span className="navbar-heading">CareSaathi</span>
      </div>
      <div className="navbar-items">
        <div className="nav-item" activeClassName="active" onClick={handleChatbotClick}>
          Care Saathi ChatBot
        </div>
        <NavLink to="/optimize-lab-report" activeClassName="active" className="nav-item" onClick={closeDropdown}>
          Optimize Lab Report
        </NavLink>
        <div className="nav-item dropdown" onClick={toggleDropdown} onMouseEnter={openDropdown} onMouseLeave={closeDropdown}>
          Strategic Healthcare Analytics <FaCaretDown className="dropdown-icon"/>
          {isDropdownOpen && (
            <div className="dropdown-content">
              <NavLink to="/image-analytics" activeClassName="active" onClick={closeDropdown}>Image Analytics</NavLink>
              <NavLink to="/extent-prediction" activeClassName="active" onClick={closeDropdown}>Extent Prediction and Preventive Planning</NavLink>
            </div>
          )}
        </div>
        <div className="nav-item">
          <button className="login-button">
            <FaSignInAlt className="login-icon" />
            Login
          </button>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
