import React, { useState, useEffect } from 'react';
import { useHealthcare } from '../hooks/useHealthcare';

export default function PatientDashboard({ user, activeTab }) {
    const { loading, uploadRecord, getRecords, getPendingRequests, approveAccess } = useHealthcare(user);

    const [vitals, setVitals] = useState({ age: 45, heart_rate: 82, oxygen_level: 96, temperature: 37.2, symptom_score: 4 });
    const [file, setFile] = useState(null);
    const [records, setRecords] = useState([]);
    const [pendingReqs, setPendingReqs] = useState([]);
    const [status, setStatus] = useState({ type: '', message: '' });

    // 1. Initial Load
    useEffect(() => {
        loadRecords();
        const iv = setInterval(checkPending, 5000);
        return () => clearInterval(iv);
    }, []);

    const loadRecords = async () => { const r = await getRecords(); if (r) setRecords(r.records || []); };

    const checkPending = async () => {
        const res = await getPendingRequests(user.id_hash);
        if (res?.requests) setPendingReqs(res.requests);
    };

    const handleApprove = async (doctorAddr) => {
        setStatus({ type: 'info', message: 'Approving access on blockchain...' });
        const res = await approveAccess(user.id_hash, doctorAddr);
        if (res?.success) {
            setStatus({ type: 'success', message: 'Access granted successfully!' });
            setPendingReqs(prev => prev.filter(r => r.doctor !== doctorAddr));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setStatus({ type: 'info', message: 'Uploading to Secure Vault...' });
        const res = await uploadRecord(file, vitals);
        if (res?.success) {
            setStatus({ type: 'success', message: 'Record Encrypted & Stored on Blockchain!' });
            loadRecords();
            setFile(null);
        } else {
            setStatus({ type: 'error', message: 'Upload failed.' });
        }
    };

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user.id_hash}&color=111&bgcolor=fbfbfb&margin=10`;

    const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 25, marginBottom: 20, borderRadius: 8 };
    const btnPrimary = { padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', fontSize: '1rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600 };

    return (
        <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24, fontFamily: 'monospace' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

                {/* Profile Card */}
                <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', color: '#111' }}>{user.name}</h1>
                        <p style={{ color: '#666', marginTop: 5 }}>Aadhaar Hash: <code style={{ fontSize: '0.8rem' }}>{user.id_hash.substring(0, 16)}...</code></p>
                        <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 4 }}>ID VERIFIED</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', background: '#eff6ff', color: '#1e3a8a', border: '1px solid #bfdbfe', borderRadius: 4 }}>SECURE VAULT ACTIVE</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ padding: 10, border: '1px solid #e0e0e0', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <img src={qrUrl} alt="Patient QR Code" style={{ width: 140, height: 140 }} />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 8 }}>SHOW THIS TO DOCTOR</p>
                    </div>
                </div>

                {/* Notifications */}
                {pendingReqs.length > 0 && pendingReqs.map((req, i) => (
                    <div key={i} style={{ ...cardStyle, background: '#fffbeb', border: '1px solid #fef3c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="animate-pulse">
                        <div>
                            <strong style={{ color: '#92400e' }}>Access Request</strong>
                            <p style={{ fontSize: '0.85rem', color: '#b45309', marginTop: 5 }}>Doctor <code>{(req.doctor || req.staff_id || '0xUNKNOWN').substring(0, 16)}...</code> is requesting access to your records.</p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => handleApprove(req.doctor)} style={{ ...btnPrimary, backgroundColor: '#059669', padding: '10px 16px', fontSize: '0.9rem' }}>APPROVE</button>
                            <button style={{ ...btnPrimary, backgroundColor: '#991b1b', padding: '10px 16px', fontSize: '0.9rem' }}>DENY</button>
                        </div>
                    </div>
                ))}

                {status.message && (
                    <div style={{ padding: 15, marginBottom: 20, borderRadius: 8, background: status.type === 'success' ? '#ecfdf5' : '#eff6ff', color: status.type === 'success' ? '#065f46' : '#1e3a8a', border: `1px solid ${status.type === 'success' ? '#a7f3d0' : '#bfdbfe'}` }}>
                        {status.message}
                    </div>
                )}

                {/* Action Tabs Content */}
                {activeTab === 'My Records' && (
                    <div className="animate-fadeUp">
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: 15, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#2563eb' }}>🛡️</span> Secure Clinical Records
                            </h3>
                            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: 20 }}>
                                Your records are encrypted and stored on the blockchain. Only authorized hospital staff can add new records after your approval.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4 }}>READ-ONLY ACCESS</span>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4 }}>ABDM COMPLIANT</span>
                            </div>
                        </div>

                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: 20 }}>Historical Records</h3>
                            {records.length === 0 ? (
                                <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center' }}>No records found in the vault.</p>
                            ) : (
                                records.map((r, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 15px', background: '#f9fafb', border: '1px solid #eee', marginBottom: 10, borderRadius: 6 }}>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>📄 Medical ID: {i + 1}</span>
                                            <p style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Time: {new Date(r[1] * 1000).toLocaleString()}</p>
                                        </div>
                                        <a href={`https://gateway.pinata.cloud/ipfs/${r[0]}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem' }}>View Source</a>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ... Other tabs can be similarly refactored ... */}
            </div>
        </div>
    );
}
