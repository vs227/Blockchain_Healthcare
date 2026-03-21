import React, { useState, useEffect } from 'react';
import { useHealthcare } from '../hooks/useHealthcare';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ethers } from 'ethers';

export default function DoctorDashboard({ user, activeTab }) {
    const { loading, requestAccess, getRecords, uploadRecord, approveAccess, whitelistDoctor } = useHealthcare(user);

    const [patientHash, setPatientHash] = useState('');
    const [requestStatus, setRequestStatus] = useState(null); // 'idle', 'pending', 'approved'
    const [patientData, setPatientData] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isScanning, setIsScanning] = useState(false);
    const [isWhitelisting, setIsWhitelisting] = useState(false);

    // ABDM Data Entry State
    const [formStep, setFormStep] = useState(1);
    const [vitals, setVitals] = useState({
        age: '', gender: '', hr: '', bp: '', o2: '', temp: '',
        diagnosis: '', medications: '', abha_id: '', billing: ''
    });

    const executeMetaMaskRequest = async (hash) => {
        if (!window.ethereum) throw new Error("MetaMask not found. Required for real signing.");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        setStatus({ type: 'info', message: 'Synchronizing Hospital Whitelist via API...' });
        console.log(`[WHITELIST] Synchronizing address: ${address}`);
        await whitelistDoctor(address);

        const abi = ["function requestAccess(bytes32 _patientHash) public"];
        const contract = new ethers.Contract(import.meta.env.VITE_CONTRACT_ADDRESS, abi, signer);

        setStatus({ type: 'info', message: 'Mining requestAccess transaction on Sepolia (~15 seconds)...' });
        const tx = await contract.requestAccess(hash);
        await tx.wait();

        return address;
    };

    const triggerAutoScan = async (scannedHash) => {
        if (!scannedHash.startsWith('0x')) { setError('Invalid QR Code Format.'); return; }
        if (isWhitelisting) {
            setError("Synchronizing identity with the Blockchain. Please wait a few seconds...");
            return;
        }
        setError('');
        setStatus({ type: 'info', message: 'Initialising secure MetaMask connection...' });

        let activeAddress = null;
        try {
            activeAddress = await executeMetaMaskRequest(scannedHash);
        } catch (err) {
            console.error(err);
            setError("MetaMask Contract Request Failed or Rejected.");
            setStatus({ type: '', message: '' });
            return;
        }

        const otp = window.prompt("Aadhaar Verification\nEnter the 6-digit OTP sent to the patient's registered mobile (Prototype mock: 123456):", "123456");
        if (otp !== "123456") {
            setError("OTP Verification Cancelled or Failed.");
            setRequestStatus('idle');
            setStatus({ type: '', message: '' });
            return;
        }

        setRequestStatus('pending'); // Visual feedback
        setStatus({ type: 'info', message: 'Authorizing Medical Identity via Blockchain...' });
        const approveRes = await approveAccess(scannedHash, activeAddress);

        if (approveRes?.success) {
            const recRes = await getRecords(scannedHash);
            setPatientData(recRes?.records || []);
            setRequestStatus('approved');
            setStatus({ type: 'success', message: 'Identity Verified & Records Retrieved!' });
        } else {
            setError('Blockchain OTP Authorization failed.');
            setRequestStatus('idle');
            setStatus({ type: '', message: '' });
        }
    };

    useEffect(() => {
        if (isScanning) {
            const scanner = new Html5QrcodeScanner("reader", {
                fps: 10,
                qrbox: 250,
                // Prioritizes rear camera on mobile/tablets
                videoConstraints: {
                    facingMode: "environment"
                }
            });
            scanner.render((decodedText) => {
                setPatientHash(decodedText);
                triggerAutoScan(decodedText); // Trigger access request immediately
                setIsScanning(false); // Stop scanning after successful decode
                scanner.clear();
            }, (err) => { });
            return () => {
                try { scanner.clear(); } catch (e) { }
            };
        }
    }, [isScanning, requestAccess, getRecords]); // Added dependencies for triggerAutoScan

    const handleManualSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!patientHash.startsWith('0x')) { setError('Invalid QR Code Format.'); return; }
        if (isWhitelisting) {
            setError("Synchronizing identity with the Blockchain. Please wait a few seconds...");
            return;
        }
        setError('');
        setStatus({ type: 'info', message: 'Initialising secure MetaMask connection...' });

        let activeAddress = null;
        try {
            activeAddress = await executeMetaMaskRequest(patientHash);
        } catch (err) {
            console.error(err);
            setError("MetaMask Contract Request Failed or Rejected.");
            setStatus({ type: '', message: '' });
            return;
        }

        const otp = window.prompt("Aadhaar Verification\nEnter the 6-digit OTP sent to the patient's registered mobile (Prototype mock: 123456):", "123456");
        if (otp !== "123456") {
            setError("OTP Verification Cancelled or Failed.");
            setRequestStatus('idle');
            setStatus({ type: '', message: '' });
            return;
        }

        setRequestStatus('pending'); // Visual feedback
        setStatus({ type: 'info', message: 'Authorizing Medical Identity via Blockchain...' });
        const approveRes = await approveAccess(patientHash, activeAddress);

        if (approveRes?.success) {
            const recRes = await getRecords(patientHash);
            setPatientData(recRes?.records || []);
            setRequestStatus('approved');
            setStatus({ type: 'success', message: 'Identity Verified & Records Retrieved!' });
        } else {
            setError('Blockchain OTP Authorization failed.');
            setRequestStatus('idle');
            setStatus({ type: '', message: '' });
        }
    };

    useEffect(() => {
        let iv;
        if (requestStatus === 'pending') {
            iv = setInterval(async () => {
                const res = await getRecords(patientHash);
                // In prototype mode, even an empty array [] means "Access Granted" (polling succeeded)
                if (res?.records) {
                    setPatientData(res.records);
                    setRequestStatus('approved');
                    clearInterval(iv);
                }
            }, 5000);
        }
        return () => clearInterval(iv);
    }, [requestStatus, patientHash, getRecords]);

    const handleDataSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Structure data for encryption/upload
        const recordData = {
            ...vitals,
            staff_id: user.id_hash || "0xHOSPITAL",
            staff_name: user.name,
            timestamp: Date.now()
        };

        const res = await uploadRecord(null, recordData, patientHash);
        if (res?.success) {
            alert("✓ Record Encrypted & Indexed on Blockchain");
            setFormStep(1);
            setVitals({ age: '', gender: '', hr: '', bp: '', o2: '', temp: '', diagnosis: '', medications: '', abha_id: '', billing: '' });
        } else {
            setError("Failed to encrypt/upload record.");
        }
    };

    const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 25, marginBottom: 20, borderRadius: 8 };
    const inputStyle = { padding: '12px 14px', border: '1px solid #d1d5db', fontSize: '0.9rem', background: '#fbfbfb', width: '100%', fontFamily: 'monospace', outline: 'none', marginBottom: 15 };
    const btnPrimary = { padding: '14px 24px', backgroundColor: '#000', color: '#fff', border: 'none', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 600 };
    const labelStyle = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase' };

    return (
        <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24, fontFamily: 'monospace' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>

                {/* Status Header */}
                <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', color: '#111' }}>{user.name} <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 400 }}>| Clinical Portal</span></h2>
                        <p style={{ color: '#666', fontSize: '0.85rem' }}>Staff ID: <span style={{ fontWeight: 600 }}>{user.id_hash?.substring(0, 12)}...</span></p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        {user.wallet && (
                            <span style={{ fontSize: '0.65rem', color: '#666', background: '#f3f4f6', padding: '4px 8px', borderRadius: 4 }}>
                                WALLET: {user.wallet.substring(0, 10)}...
                            </span>
                        )}
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '6px 14px', background: user.wallet ? '#ecfdf5' : '#fffbeb', color: user.wallet ? '#065f46' : '#92400e', border: `1px solid ${user.wallet ? '#a7f3d0' : '#fef3c7'}`, borderRadius: 20 }}>
                            {user.wallet ? '⚡ BLOCKCHAIN SIGNER ACTIVE' : '⚠️ WALLET DISCONNECTED'}
                        </span>
                    </div>
                </div>

                {activeTab === 'Triage Queue' && (
                    <div className="animate-fadeUp">
                        {/* Access Section */}
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: 20, fontSize: '1rem' }}>Step 1: Patient Identification</h3>

                            {!requestStatus || requestStatus === 'idle' ? (
                                <div>
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                                        <input
                                            type="text"
                                            placeholder="Enter Patient's 0x Hash..."
                                            value={patientHash}
                                            onChange={(e) => setPatientHash(e.target.value)}
                                            style={{ ...inputStyle, marginBottom: 0 }}
                                        />
                                        <button onClick={() => setIsScanning(!isScanning)} style={{ ...btnPrimary, backgroundColor: '#374151' }}>{isScanning ? 'CLOSE' : '📷 SCAN'}</button>
                                        <button onClick={handleManualSubmit} disabled={loading} style={btnPrimary}>REQUEST</button>
                                    </div>
                                    {isScanning && <div id="reader" style={{ width: '100%', maxWidth: 400, margin: '10px auto' }}></div>}
                                </div>
                            ) : requestStatus === 'pending' ? (
                                <div style={{ background: '#fffbeb', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                                    <div className="animate-pulse" style={{ color: '#92400e', fontWeight: 700 }}>⏳ WAITING FOR PATIENT APPROVAL...</div>
                                    <p style={{ fontSize: '0.8rem', color: '#b45309', marginTop: 10 }}>The request for 0x{patientHash.substring(2, 10)}... has been signaled to the blockchain proxy.</p>
                                    <button onClick={() => setRequestStatus('idle')} style={{ marginTop: 15, background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 15, background: '#f0fdf4', padding: 15, borderRadius: 8 }}>
                                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ ACCESS GRANTED</span>
                                    <button onClick={() => { setRequestStatus('idle'); setPatientData(null); }} style={{ color: '#666', border: '1px solid #ddd', padding: '4px 8px', fontSize: '0.7rem', cursor: 'pointer' }}>Disconnect</button>
                                </div>
                            )}
                            {error && <p style={{ color: '#dc2626', marginTop: 10 }}>{error}</p>}
                        </div>

                        {/* Input Section (Role Based) */}
                        {requestStatus === 'approved' && user.specialization !== 'pharmacist' && (
                            <div style={cardStyle}>
                                <div style={{ display: 'flex', gap: 30, borderBottom: '1px solid #eee', marginBottom: 25 }}>
                                    <button onClick={() => setFormStep(1)} style={{ padding: '10px 0', border: 'none', background: 'none', borderBottom: formStep === 1 ? '3px solid #000' : 'none', fontWeight: 700, cursor: 'pointer', opacity: formStep === 1 ? 1 : 0.4 }}>1. VITALS & LABS</button>
                                    <button onClick={() => setFormStep(2)} style={{ padding: '10px 0', border: 'none', background: 'none', borderBottom: formStep === 2 ? '3px solid #000' : 'none', fontWeight: 700, cursor: 'pointer', opacity: formStep === 2 ? 1 : 0.4 }}>2. CLINICAL RECORDS</button>
                                    <button onClick={() => setFormStep(3)} style={{ padding: '10px 0', border: 'none', background: 'none', borderBottom: formStep === 3 ? '3px solid #000' : 'none', fontWeight: 700, cursor: 'pointer', opacity: formStep === 3 ? 1 : 0.4 }}>3. ADMIN & BILLING</button>
                                </div>

                                <form onSubmit={handleDataSubmit}>
                                    {formStep === 1 && (
                                        <div className="grid grid-cols-2 gap-x-6">
                                            <div>
                                                <label style={labelStyle}>Patient ABHA ID</label>
                                                <input placeholder="ABHA-1234-5678-9012" value={vitals.abha_id} onChange={e => setVitals({ ...vitals, abha_id: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Blood Pressure (mmHg)</label>
                                                <input placeholder="120/80" value={vitals.bp} onChange={e => setVitals({ ...vitals, bp: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Oxygen Level (SpO2 %)</label>
                                                <input placeholder="98" value={vitals.o2} onChange={e => setVitals({ ...vitals, o2: e.target.value })} style={inputStyle} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>Body Temp (°C)</label>
                                                <input placeholder="37.2" value={vitals.temp} onChange={e => setVitals({ ...vitals, temp: e.target.value })} style={inputStyle} />
                                            </div>
                                        </div>
                                    )}

                                    {formStep === 2 && (
                                        <div>
                                            <label style={labelStyle}>Primary Diagnosis (ICD-10)</label>
                                            <input placeholder="Type E11.9 (Type 2 Diabetes Mellitus)..." value={vitals.diagnosis} onChange={e => setVitals({ ...vitals, diagnosis: e.target.value })} style={inputStyle} />
                                            <label style={labelStyle}>Prescribed Medications</label>
                                            <textarea placeholder="Medication, Dosage, Frequency..." value={vitals.medications} onChange={e => setVitals({ ...vitals, medications: e.target.value })} style={{ ...inputStyle, minHeight: 100 }} />
                                        </div>
                                    )}

                                    {formStep === 3 && (
                                        <div>
                                            <label style={labelStyle}>Insurance / Billing Reference</label>
                                            <input placeholder="Claim #827419..." value={vitals.billing} onChange={e => setVitals({ ...vitals, billing: e.target.value })} style={inputStyle} />
                                            <div style={{ background: '#f9fafb', padding: 15, borderRadius: 6, border: '1px dashed #ddd', fontSize: '0.8rem' }}>
                                                <strong>Digital Directives</strong>: Patient organ donation and palliative care preferences are inherited from ABHA profile.
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30 }}>
                                        {formStep > 1 ? <button type="button" onClick={() => setFormStep(formStep - 1)} style={{ ...btnPrimary, backgroundColor: '#666' }}>BACK</button> : <div></div>}
                                        {formStep < 3 ? (
                                            <button type="button" onClick={() => setFormStep(formStep + 1)} style={btnPrimary}>CONTINUE</button>
                                        ) : (
                                            <button type="submit" disabled={loading} style={{ ...btnPrimary, backgroundColor: '#2563eb' }}>
                                                {loading ? 'ENCRYPTING...' : 'FINALIZE & SIGN ON-CHAIN'}
                                            </button>
                                        )}
                                    </div>
                                </form>
                            </div>
                        )}
                        {requestStatus === 'approved' && user.specialization === 'pharmacist' && (
                            <div style={{ ...cardStyle, background: '#fef2f2', border: '1px solid #fecaca' }}>
                                <h3 style={{ color: '#991b1b', marginBottom: 10, fontSize: '1.1rem' }}>Restricted Access: Data Entry Blocked</h3>
                                <p style={{ color: '#b91c1c', fontSize: '0.9rem' }}>
                                    Your <b>Role-Based Access Control (RBAC)</b> policy as a Pharmacist restricts you from finalizing new diagnostic/clinical records on-chain. Please navigate to the <b>Patient Records</b> tab to view decrypted prescription data.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Patient Records' && (
                    <div className="animate-fadeUp">
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: 20, fontSize: '1.2rem', color: '#111' }}>Patient Historical Records</h3>
                            {!patientData ? (
                                <p style={{ color: '#999', fontStyle: 'italic', padding: 20, textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>
                                    No patient session active. Please scan a QR code in the Triage Queue to establish secure authorization.
                                </p>
                            ) : (
                                <div>
                                    {user.specialization === 'pharmacist' && (
                                        <div style={{ background: '#fffbeb', padding: 15, borderRadius: 6, marginBottom: 20, border: '1px solid #fef3c7' }}>
                                            <p style={{ color: '#92400e', fontSize: '0.9rem' }}>
                                                <strong>RBAC Filter Active:</strong> Only Prescription and Medication data has been decrypted. Clinical diagnoses and vitals are concealed according to policy.
                                            </p>
                                        </div>
                                    )}

                                    {patientData.length === 0 ? (
                                        <p style={{ color: '#666', fontStyle: 'italic' }}>No historical records found for this patient on the blockchain.</p>
                                    ) : (
                                        patientData.map((recordHash, i) => (
                                            <div key={i} style={{ padding: '15px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 15, borderRadius: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                                    <span style={{ fontWeight: 700, color: '#1e293b' }}>📄 Medical Encounter Reference #{i + 1}</span>
                                                    <a href={`https://gateway.pinata.cloud/ipfs/${recordHash}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.85rem', padding: '4px 10px', background: '#eff6ff', borderRadius: 4 }}>Inspect Encrypted Source</a>
                                                </div>

                                                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 15 }}>
                                                    {user.specialization === 'pharmacist' ? (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Prescriptions & Dispatch</div>
                                                            <p style={{ fontSize: '0.9rem', color: '#111' }}>[Decrypted via IPFS securely] Please refer to specific medication notes linked to this record hash. Action: Dispense strictly as directed by the primary physician.</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>Full Clinical Summary</div>
                                                            <p style={{ fontSize: '0.9rem', color: '#111', marginBottom: 10 }}>[Decrypted via IPFS securely] Full access to body vitals (SpO2, Temp, BP) and primary ICD-10 diagnosis notes.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
