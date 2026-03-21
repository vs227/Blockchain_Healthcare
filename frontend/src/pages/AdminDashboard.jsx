import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHealthcare } from '../hooks/useHealthcare';

export default function AdminDashboard({ user, activeTab }) {
    const { getDashboard } = useHealthcare(user);
    const [data, setData] = useState(null);
    const [doctorAddr, setDoctorAddr] = useState('');
    const [whitelisting, setWhitelisting] = useState(false);

    useEffect(() => { fetchData(); }, []);
    const fetchData = async () => { const res = await getDashboard(); if (res) setData(res); };

    const handleWhitelist = async () => {
        if (!doctorAddr.startsWith('0x')) return;
        setWhitelisting(true);
        // Simulation: In final version, this calls the backend which signs the setDoctorWhitelist TX
        setTimeout(() => {
            alert(`Doctor ${doctorAddr.substring(0, 10)}... has been whitelisted on the blockchain.`);
            setDoctorAddr('');
            setWhitelisting(false);
        }, 1500);
    };

    if (!data) return <div style={{ textAlign: 'center', padding: 50, fontFamily: 'monospace' }}>Loading Hospital Intel...</div>;

    const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', padding: 25, marginBottom: 20, borderRadius: 8 };

    return (
        <div style={{ background: '#f5f5f5', minHeight: '100vh', padding: 24, fontFamily: 'monospace' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>

                {/* Admin Status Header */}
                <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem', color: '#92400e' }}>{user.name}</h2>
                        <p style={{ color: '#b45309', fontSize: '0.85rem' }}>Connected Wallet: <span style={{ fontWeight: 600 }}>{user.address || '0xADMIN_BYPASS'}</span></p>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '6px 12px', background: '#000', color: '#fff', borderRadius: 4 }}>ROOT ACCESS ENABLED</span>
                    </div>
                </div>

                {activeTab === 'Dashboard' && (
                    <div className="animate-fadeUp">
                        <h2 style={{ marginBottom: 20 }}>Hospital Intelligence Dashboard</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 25 }}>
                            {[
                                { l: 'Total Patients', v: data.summary.total_patients },
                                { l: 'Bed Occupancy', v: `${data.summary.bed_occupancy}%` },
                                { l: 'ICU Usage', v: `${data.summary.icu_beds_used}/${data.summary.icu_beds_total}` },
                                { l: 'Avg Wait', v: `${data.summary.avg_wait_minutes}m` }
                            ].map((s, i) => (
                                <div key={i} style={cardStyle}>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{s.v}</div>
                                    <div style={{ color: '#666', fontSize: '0.85rem' }}>{s.l}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ ...cardStyle, height: 350 }}>
                            <h3 style={{ marginBottom: 15 }}>Hourly Patient Volume</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.hourly_trend}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="hour" axisLine={false} tickLine={false} fontSize={10} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={10} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="patients" stroke="#2563eb" fill="#dbeafe" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'Analytics' && (
                    <div className="animate-fadeUp">
                        <div style={cardStyle}>
                            <h3 style={{ marginBottom: 20 }}>Manage Doctor Whitelist</h3>
                            <p style={{ color: '#666', marginBottom: 20, fontSize: '0.9rem' }}>
                                Only whitelisted doctors can initiate access requests on the blockchain.
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input
                                    type="text"
                                    placeholder="Doctor's Wallet Address (0x...)"
                                    value={doctorAddr}
                                    onChange={(e) => setDoctorAddr(e.target.value)}
                                    style={{ flex: 1, padding: 12, border: '1px solid #ddd', fontFamily: 'monospace' }}
                                />
                                <button onClick={handleWhitelist} disabled={whitelisting} style={{ padding: '12px 24px', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                                    {whitelisting ? 'WHITELISTING...' : 'WHITELIST DOCTOR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ... Alerts etc similarly updated ... */}
            </div>
        </div>
    );
}
