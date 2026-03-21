import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ScatterChart, Scatter, ZAxis, BarChart, Bar, LineChart, Line
} from 'recharts';
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
                                { l: 'Total Clinical Entries', v: data.summary.total_patients, color: '#2563eb' },
                                { l: 'Facility Occupancy', v: `${data.summary.bed_occupancy}% `, color: '#111' },
                                { l: 'Avg Hospital HR', v: `${data.summary.avg_hr} BPM`, color: '#dc2626' },
                                { l: 'Avg SpO2 Level', v: `${data.summary.avg_o2}% `, color: '#0891b2' }
                            ].map((s, i) => (
                                <div key={i} style={{ ...cardStyle, borderLeft: `4px solid ${s.color} ` }}>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{s.v}</div>
                                    <div style={{ color: '#666', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.l}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 25 }}>
                            {/* Row 1: Load + Radar */}
                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>Facility Throughput (24h)</h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <AreaChart data={data.hourly_trend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="patients" stroke="#2563eb" fillOpacity={1} fill="url(#colorPv)" />
                                        <defs>
                                            <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>Dept Activity (Snergy)</h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data.dept_activity}>
                                        <PolarGrid stroke="#f1f5f9" />
                                        <PolarAngleAxis dataKey="subject" fontSize={9} />
                                        <Radar name="Active" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.5} />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Row 2: Bar + Scatter */}
                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>Vital Pulse Distribution</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <BarChart data={data.vitals_distribution}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {data.vitals_distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>Biometric Correlation (HR/SpO2)</h3>
                                <ResponsiveContainer width="100%" height="85%">
                                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis type="number" dataKey="hr" name="HR" domain={[40, 160]} fontSize={9} axisLine={false} tickLine={false} />
                                        <YAxis type="number" dataKey="o2" name="O2" domain={[80, 100]} fontSize={9} axisLine={false} tickLine={false} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter name="Patients" data={data.vitals_correlation} fill="#dc2626" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Row 3: Acuity Trend + Risk Pie */}
                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>24h Acuity Pulse (Avg Triage)</h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <LineChart data={data.triage_trend}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="hour" fontSize={9} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 5]} fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="avg_score" stroke="#dc2626" strokeWidth={3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ ...cardStyle, height: 320 }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.85rem' }}>Risk Stratification</h3>
                                <ResponsiveContainer width="100%" height="70%">
                                    <PieChart>
                                        <Pie data={data.risk_distribution} innerRadius={50} outerRadius={70} dataKey="value">
                                            {data.risk_distribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                                    {data.risk_distribution.map((r, i) => (
                                        <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem' }}>
                                            <div style={{ fontWeight: 800, color: r.color }}>{r.value}</div>
                                            <div style={{ color: '#666' }}>{r.name.split(' ')[0]}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {data.predictions && (
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                                <div style={{ ...cardStyle }}>
                                    <h3 style={{ marginBottom: 15 }}>Hospital Insights & Predictions 🧠</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                                        <div style={{ padding: 15, background: '#f8fafc', borderRadius: 6 }}>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Forecasted Peak</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{data.predictions.peak_load_estimate}</div>
                                        </div>
                                        <div style={{ padding: 15, background: '#f8fafc', borderRadius: 6 }}>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Staffing Optimization</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#16a34a' }}>+{data.predictions.required_staff_increase} Needed</div>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 20, padding: 15, background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: 6 }}>
                                        <div style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>🤖 AI Recommendation</div>
                                        <p style={{ color: '#1e3a8a', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>{data.predictions.recommendation}</p>
                                    </div>
                                </div>
                                <div style={{ ...cardStyle, background: data.predictions.high_risk_alerts > 0 ? '#fff1f2' : '#f0fdf4', borderColor: data.predictions.high_risk_alerts > 0 ? '#fecaca' : '#bbf7d0' }}>
                                    <h3 style={{ marginBottom: 15, color: data.predictions.high_risk_alerts > 0 ? '#991b1b' : '#166534' }}>Triage Alerts</h3>
                                    <div style={{ fontSize: '3rem', fontWeight: 800, color: data.predictions.high_risk_alerts > 0 ? '#dc2626' : '#16a34a' }}>{data.predictions.high_risk_alerts}</div>
                                    <p style={{ fontSize: '0.85rem', color: data.predictions.high_risk_alerts > 0 ? '#b91c1c' : '#15803d' }}>
                                        High-risk clinical anomalies detected from the shared IPFS audit trail.
                                    </p>
                                </div>
                            </div>
                        )}
                        {data.recent_entries && data.recent_entries.length > 0 && (
                            <div style={{ ...cardStyle }}>
                                <h3 style={{ marginBottom: 15, fontSize: '0.9rem' }}>Recent Clinical Submissions (Anonymized)</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                                <th style={{ padding: '12px 10px' }}>TIMESTAMP</th>
                                                <th style={{ padding: '12px 10px' }}>AGE/GENDER</th>
                                                <th style={{ padding: '12px 10px' }}>VITALS (HR/O2)</th>
                                                <th style={{ padding: '12px 10px' }}>DIAGNOSIS SUMMARY</th>
                                                <th style={{ padding: '12px 10px', textAlign: 'right' }}>TRIAGE</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recent_entries.map((entry, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                                    <td style={{ padding: '12px 10px', color: '#666' }}>{new Date(entry.timestamp).toLocaleTimeString()}</td>
                                                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{entry.age} / {entry.gender || 'N/A'}</td>
                                                    <td style={{ padding: '12px 10px' }}>{entry.hr} BPM / {entry.o2}%</td>
                                                    <td style={{ padding: '12px 10px', color: '#444' }}>{entry.diagnosis?.substring(0, 30)}...</td>
                                                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: 4, background: entry.triage_score >= 4 ? '#fee2e2' : '#f0fdf4', color: entry.triage_score >= 4 ? '#991b1b' : '#166534', fontWeight: 800 }}>
                                                            LEVEL {entry.triage_score}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
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
