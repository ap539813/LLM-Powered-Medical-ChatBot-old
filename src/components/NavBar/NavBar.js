import React from 'react';
import './NavBar.css';
import { FaSignInAlt } from 'react-icons/fa';

function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="https://lh3.googleusercontent.com/u/0/drive-viewer/AKGpihbYUgV9yP3x10tHQ3v6MzOoLBoFEHOpEzJJqW-ToQxKk8V5jtO0ngEn_geQloM7I1CLpGcwAh4g42cfrTy_pb-veyge=w1572-h1558" alt="Logo" className="navbar-logo" />
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
