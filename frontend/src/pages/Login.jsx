import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Login({ onLogin }) {
    const [activeTab, setActiveTab] = useState('patient');
    const [idValue, setIdValue] = useState(''); // Aadhaar or Reg ID
    const [pin, setPin] = useState('');
    const [specialization, setSpecialization] = useState('surgeon');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [walletLoading, setWalletLoading] = useState(false);
    const [activeAccount, setActiveAccount] = useState(localStorage.getItem('walletAddress') || null);

    // Lock logic: If user starts typing, disable switching tabs
    const isTyping = idValue.length > 0 || pin.length > 0;

    const handleLogin = async (e) => {
        e.preventDefault();
        if (activeTab === 'patient' && idValue.length !== 12) { setError('Aadhaar must be 12 digits.'); return; }
        if (activeTab === 'doctor' && idValue.length < 5) { setError('Invalid Professional ID.'); return; }
        if (pin.length !== 6) { setError('PIN must be 6 digits.'); return; }

        setLoading(true);
        setError('');

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8s timeout

        try {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
            const resp = await fetch(`${baseUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aadhaar: idValue, pin, role: activeTab }),
                signal: abortController.signal
            });

            clearTimeout(timeoutId);
            const data = await resp.json();
            if (!resp.ok) {
                // If detail is an object/array (common in Pydantic), stringify it
                const detailStr = typeof data.detail === 'string'
                    ? data.detail
                    : JSON.stringify(data.detail);
                throw new Error(detailStr || 'Login failed');
            }

            localStorage.setItem('token', data.session_id);
            const sessionUser = {
                ...data.user,
                specialization: activeTab === 'doctor' ? specialization : 'n/a'
            };
            onLogin(sessionUser);
        } catch (err) {
            console.error("[LOGIN ERROR]", err);

            let finalMsg = "An unexpected error occurred.";
            if (err.name === 'AbortError') {
                finalMsg = 'Request Timeout: Local backend not responding.';
            } else if (err.message && err.message !== '[object Object]') {
                finalMsg = err.message;
            } else {
                finalMsg = String(err);
            }

            setError(finalMsg);
        } finally {
            setLoading(false);
        }
    };

    const connectAdminWallet = async () => {
        if (!window.ethereum) { setError('MetaMask not detected.'); return; }
        setWalletLoading(true);
        setError('');
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];

            // Admin bypass: In a real system, you'd verify a signature
            const adminUser = {
                name: "Hospital Admin",
                role: "admin",
                address: address,
                id_hash: "0xADMIN"
            };

            onLogin(adminUser);
        } catch (err) {
            setError('Wallet Connection Failed.');
        } finally {
            setWalletLoading(false);
        }
    };

    // Helper for tab names
    const tabs = [
        { id: 'patient', label: 'Patient Self-Service' },
        { id: 'doctor', label: 'Medical Practitioner' },
        { id: 'admin', label: 'System Admin' }
    ];

    return (
        <div style={{ fontFamily: 'monospace', minHeight: '100vh', background: '#e5e7eb' }}>
            {/* Navbar */}
            <div style={{ height: 60, backgroundColor: '#fbfbfb', display: 'flex', alignItems: 'center', padding: '0 15px', borderBottom: '1px solid #e0e0e0', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111' }}>
                    Medi<span style={{ color: '#2563eb' }}>Chain</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#999', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginLeft: 8 }}>Intelligence Portal</span>
            </div>

            {/* Main Container */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
                <div style={{ width: 750, maxWidth: '95%', backgroundColor: '#fbfbfb', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', borderRadius: 12, overflow: 'hidden' }} className="animate-fadeUp">

                    {/* Universal Wallet Section */}
                    <div style={{ padding: '20px 60px', background: '#fefce8', borderBottom: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#854d0e', letterSpacing: 1.5 }}>SECURE GATEWAY</span>
                            <h3 style={{ fontSize: '1rem', color: '#111', marginTop: 2 }}>Universal Health Wallet</h3>
                        </div>
                        <button
                            onClick={async () => {
                                if (!window.ethereum) {
                                    alert('MetaMask not detected. Please install a compatible Web3 wallet.');
                                    return;
                                }
                                try {
                                    const provider = new ethers.BrowserProvider(window.ethereum);
                                    const accounts = await provider.send("eth_requestAccounts", []);
                                    const address = accounts[0];
                                    localStorage.setItem('walletAddress', address);
                                    setActiveAccount(address);
                                    window.dispatchEvent(new Event('storage')); // Notify other components
                                    alert(`Wallet Connected: ${address.substring(0, 10)}...`);
                                } catch (err) {
                                    console.error("[WALLET ERROR]", err);
                                    alert('Wallet Connection Failed or User Rejected Request.');
                                }
                            }}
                            style={{
                                padding: '10px 18px',
                                backgroundColor: localStorage.getItem('walletAddress') ? '#059669' : '#ca8a04',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            {localStorage.getItem('walletAddress') ? '⚡ WALLET ACTIVE' : '🔌 CONNECT UNIVERSAL WALLET'}
                        </button>
                    </div>

                    {/* Tabs Section */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                        {tabs.map((t) => (
                            <button
                                key={t.id}
                                disabled={isTyping && activeTab !== t.id}
                                onClick={() => { setActiveTab(t.id); setError(''); setIdValue(''); setPin(''); }}
                                style={{
                                    flex: 1,
                                    padding: '20px 0',
                                    border: 'none',
                                    background: activeTab === t.id ? '#fff' : 'transparent',
                                    cursor: (isTyping && activeTab !== t.id) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    color: activeTab === t.id ? '#2563eb' : '#6b7280',
                                    borderBottom: activeTab === t.id ? '3px solid #2563eb' : '3px solid transparent',
                                    opacity: (isTyping && activeTab !== t.id) ? 0.3 : 1,
                                    filter: (isTyping && activeTab !== t.id) ? 'grayscale(1)' : 'none',
                                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                    fontFamily: 'monospace'
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ padding: '40px 60px' }}>
                        {activeTab !== 'admin' ? (
                            <form onSubmit={handleLogin} className="animate-fade">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: 10 }}>{activeTab === 'patient' ? 'Patient Identity' : 'Clinical Access'}</h2>
                                <p style={{ color: '#6b7280', marginBottom: 30, fontSize: '0.9rem' }}>
                                    {activeTab === 'patient'
                                        ? 'Authenticate using your Aadhaar number and unique PIN.'
                                        : 'Secure login for authorized medical practitioners only.'}
                                </p>

                                <div style={{ marginBottom: 20 }}>
                                    {activeTab === 'doctor' && (
                                        <div style={{ marginBottom: 15 }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 1 }}>
                                                CLINICAL SPECIALIZATION
                                            </label>
                                            <select
                                                value={specialization}
                                                onChange={(e) => setSpecialization(e.target.value)}
                                                style={{ width: '100%', padding: '14px', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', fontSize: '1rem', fontFamily: 'monospace', backgroundColor: '#fff', cursor: 'pointer' }}
                                            >
                                                <option value="surgeon">Medical Surgeon (Full Access)</option>
                                                <option value="pharmacist">Clinical Pharmacist (Prescriptions Only)</option>
                                            </select>
                                        </div>
                                    )}

                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 1 }}>
                                        {activeTab === 'patient' ? 'AADHAAR NUMBER (12-DIGIT)' : 'PROFESSIONAL REGISTRATION ID'}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={activeTab === 'patient' ? "0000 0000 0000" : "DMC-XXXXX-IND"}
                                        style={{ width: '100%', padding: '14px', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', fontSize: '1rem', fontFamily: 'monospace' }}
                                        value={idValue}
                                        onChange={(e) => setIdValue(e.target.value)}
                                        required
                                    />
                                </div>

                                <div style={{ marginBottom: 25 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#374151', marginBottom: 8, letterSpacing: 1 }}>ENTER SECURE 6-DIGIT PIN</label>
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="••••••"
                                        style={{ width: '100%', padding: '14px', border: '1px solid #d1d5db', borderRadius: 6, outline: 'none', fontSize: '1.2rem', fontFamily: 'monospace', letterSpacing: 8 }}
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                        required
                                    />
                                </div>

                                {error && <div style={{ marginBottom: 20, color: '#dc2626', fontSize: '0.85rem', background: '#fef2f2', padding: 12, border: '1px solid #fecaca', borderRadius: 6 }}>{error}</div>}

                                <button
                                    type="submit"
                                    disabled={loading || (activeTab === 'doctor' && !activeAccount)}
                                    style={{ width: '100%', padding: '16px', backgroundColor: loading || (activeTab === 'doctor' && !activeAccount) ? '#6b7280' : '#111827', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1rem', fontWeight: 700, cursor: loading || (activeTab === 'doctor' && !activeAccount) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: 'monospace' }}
                                >
                                    {loading ? 'Verifying Credentials...' : (activeTab === 'doctor' && !activeAccount) ? 'Connect Wallet First' : 'Sign In Securely'}
                                </button>
                            </form>
                        ) : (
                            <div style={{ textAlign: 'center' }} className="animate-fade">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: 10 }}>Admin Governance</h2>
                                <p style={{ color: '#6b7280', marginBottom: 40, fontSize: '0.9rem' }}>
                                    Connect your authorized hospital wallet to manage doctors and view system intelligence.
                                </p>
                                <button
                                    onClick={connectAdminWallet}
                                    disabled={walletLoading}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '16px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'monospace' }}
                                >
                                    {walletLoading ? 'Connecting...' : 'Connect MetaMask Wallet'}
                                </button>
                                {error && <p style={{ color: '#dc2626', marginTop: 15, fontSize: '0.85rem' }}>{error}</p>}
                            </div>
                        )}
                    </div>

                    <div style={{ padding: '0 60px 30px', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af' }}>
                        Built for Security & Speed. Built for India.
                        <div style={{ marginTop: 10, opacity: 0.5 }}>IDENT LAYER v2.1 (BLOCKCHAIN BACKED)</div>
                    </div>
                </div>
            </div>

            {isTyping && (
                <div style={{ textAlign: 'center', marginTop: 30, color: '#6b7280', fontSize: '0.8rem', animation: 'fadeIn 0.5s' }}>
                    Security Lock: Complete current form or clear fields to switch roles.
                </div>
            )}
        </div>
    );
}
