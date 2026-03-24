import React, { useState } from 'react';
import { ethers } from 'ethers';
import './Login.css';
import { Link } from "react-router-dom";
import Ribbons from "../components/Ribbons";;
import { useEffect } from "react";
export default function Login({ onLogin }) {
  const [idValue, setIdValue] = useState('');
  const [pin, setPin] = useState('');
  const [specialization, setSpecialization] = useState('surgeon');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e, role) => {
    e.preventDefault();

    if (role === 'patient' && idValue.length !== 12) {
      setError('Aadhaar must be 12 digits.');
      return;
    }

    if (role === 'doctor' && idValue.length < 5) {
      setError('Invalid Professional ID.');
      return;
    }

    if (pin.length !== 6) {
      setError('PIN must be 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('http://127.0.0.1:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aadhaar: idValue, pin, role }),
      });

      const data = await resp.json();

      if (!resp.ok) throw new Error(data.detail || 'Login failed');

      localStorage.setItem('token', data.session_id);

      const sessionUser = {
        ...data.user,
        specialization: role === 'doctor' ? specialization : 'n/a'
      };

      onLogin(sessionUser);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectAdminWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected.');
      return;
    }

    setWalletLoading(true);
    setError('');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      const adminUser = {
        name: "Hospital Admin",
        role: "admin",
        address: accounts[0]
      };

      onLogin(adminUser);
    } catch {
      setError('Wallet Connection Failed.');
    } finally {
      setWalletLoading(false);
    }
  };
useEffect(() => {
  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  document.body.appendChild(cursor);

  const move = (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  };

  window.addEventListener("mousemove", move);

  return () => {
    window.removeEventListener("mousemove", move);
    document.body.removeChild(cursor);
  };
}, []);
  return (
    <>

      {/* 🔥 FULL PAGE RIBBONS */}
      <div className="ribbon-global">
        <Ribbons
          baseThickness={30}
          colors={["#00f0ff", "#00ffa3"]}
          speedMultiplier={0.4}
          maxAge={400}
          enableFade={false}
          enableShaderEffect={false}
        />
      </div>

      <div className="auth-container">

        {/* LEFT - PATIENT */}
        <div className="auth-left">
          <h2 className="auth-title">Patient Login</h2>
          <p className="auth-sub">Access your health records securely</p>

          <input
            className="auth-input"
            placeholder="Aadhaar Number"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value.replace(/\D/g, ''))}
          />

          <input
            className="auth-input"
            type="password"
            maxLength={6}
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />

          <button
            className="auth-btn"
            onClick={(e) => handleLogin(e, 'patient')}
          >
            {loading ? 'Verifying...' : 'Patient Sign In'}
          </button>

          <p className="auth-footer">
            Don’t have an account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </p>
        </div>

        {/* MIDDLE PANEL */}
        <div className="auth-middle">
          <img
            src="img.png"
            alt="design"
            className="middle-img"
          />
        </div>

        {/* RIGHT - PRACTITIONER */}
        <div className="auth-right">

          <button className="admin-btn" onClick={connectAdminWallet}>
            {walletLoading ? 'Connecting...' : 'Admin Login'}
          </button>

          <div className="right-content">
            <h2 className="auth-title">Practitioner Login</h2>
            <p className="auth-sub">Authorized medical access</p>

            <select
              className="auth-input"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            >
              <option value="surgeon">Surgeon</option>
              <option value="pharmacist">Pharmacist</option>
            </select>

            <input
              className="auth-input"
              placeholder="Registration ID"
              value={idValue}
              onChange={(e) => setIdValue(e.target.value)}
            />

            <input
              className="auth-input"
              type="password"
              maxLength={6}
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />

            <button
              className="auth-btn"
              onClick={(e) => handleLogin(e, 'doctor')}
            >
              {loading ? 'Verifying...' : 'Practitioner Sign In'}
            </button>

            <p className="auth-footer">
              Don’t have an account?{" "}
              <Link to="/signup" className="signup-link">
                Sign Up
              </Link>
            </p>

            {error && <div className="error">{error}</div>}
          </div>
        </div>

      </div>
    </>
  );
}