import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Navbar } from './components/Layout';

const tabsMap = {
    patient: ['My Records', 'AI Analysis', 'Access Control'],
    doctor: ['Triage Queue', 'Patient Records', 'AI Assistant'],
    admin: ['Dashboard', 'Analytics', 'Alerts'],
};

function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress'));
    const [activeTab, setActiveTab] = useState('');

    useEffect(() => {
        const handleStorage = () => setWalletAddress(localStorage.getItem('walletAddress'));
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        // Warning before refresh to satisfy "Data will be erased" requirement
        const handleBeforeUnload = (e) => {
            if (!user) return; // No warning if not logged in
            e.preventDefault();
            e.returnValue = 'Warning: All currently entered clinical data will be erased on refresh.';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [user]);

    useEffect(() => {
        if (user && !activeTab) {
            setActiveTab(tabsMap[user.role]?.[0] || '');
        }
    }, [user, activeTab]);

    const handleLogin = (u) => {
        console.log("[APP] Login successful for:", u.name, "Role:", u.role);
        const userWithWallet = { ...u, wallet: walletAddress };
        setUser(userWithWallet);
        setActiveTab(tabsMap[u.role]?.[0] || '');
        localStorage.setItem('user', JSON.stringify(userWithWallet));
        // backend sends session_id, we store it as 'token'
        if (u.session_id) localStorage.setItem('token', u.session_id);
    };

    const handleLogout = () => {
        setUser(null);
        setActiveTab('');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    if (!user) return <Login onLogin={handleLogin} />;


    return (
        <div style={{ fontFamily: 'monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabsMap[user.role]} />
            <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                {user.role === 'patient' && <PatientDashboard user={user} activeTab={activeTab} />}
                {user.role === 'doctor' && <DoctorDashboard user={user} activeTab={activeTab} />}
                {user.role === 'admin' && <AdminDashboard user={user} activeTab={activeTab} />}
            </div>
        </div>
    );
}

export default App;
