import React from 'react';
import './NavBar.css';
import { FaSignInAlt } from 'react-icons/fa';

function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img 
          src="/logo.png" 
          alt="Logo"
          className="navbar-logo"
        />
        <span className="navbar-heading">CareSaathi</span>
      </div>
      <ul className="navbar-nav">
        <div className="navbar-right">
          <div className="nav-item">Appointment</div>
          <button className="login-button">
            <FaSignInAlt className="login-icon" />
            Login
          </button>
        </div>
      </ul>
    </nav>
  );
}

export default NavBar;
