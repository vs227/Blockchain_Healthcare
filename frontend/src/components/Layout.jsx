import React, { useState } from 'react';

const Navbar = ({ user, onLogout, activeTab, setActiveTab, tabs }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div style={{ height: 60, backgroundColor: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 15px', borderBottom: '1px solid #e0e0e0', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1000 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111' }}>
                    Medi<span style={{ color: '#2563eb' }}>Chain</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#999', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Intelligence</span>
            </div>

            <div style={{ display: 'flex', gap: 30, fontSize: '1.1rem', alignItems: 'center' }}>
                {tabs && tabs.map(t => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: activeTab === t ? '#000' : '#333', fontWeight: activeTab === t ? 600 : 400, position: 'relative', padding: '5px 0', borderBottom: activeTab === t ? '2px solid #000' : '2px solid transparent', transition: 'all 0.3s' }}>
                        {t}
                    </button>
                ))}
                {user && (
                    <>
                        <span style={{ fontSize: '0.8rem', color: '#666' }}>
                            ID: {user.id_hash.substring(0, 6)}...{user.id_hash.substring(62)}
                        </span>
                        <button onClick={onLogout}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#952121', fontSize: '1rem', fontWeight: 500 }}>
                            Logout
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export { Navbar };
