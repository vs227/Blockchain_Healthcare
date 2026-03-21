import { useState, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080';

export const useHealthcare = (user) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const api = useCallback(async (method, endpoint, data = null, customHeaders = {}) => {
        setLoading(true);
        try {
            const res = await axios({
                method,
                url: `${API}${endpoint}`,
                data,
                timeout: 60000, // Increased for Sepolia block times
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    ...customHeaders
                }
            });
            return res.data;
        } catch (err) {
            console.error("[API ERROR]", err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadRecord = async (file, vitals, targetAadhaar) => {
        const fd = new FormData();
        if (file) fd.append('file', file);
        fd.append('patient_aadhaar', targetAadhaar || user?.id_hash || '');
        fd.append('vitals', JSON.stringify(vitals));
        return api('post', '/records/upload', fd, { 'Content-Type': 'multipart/form-data' });
    };

    const getRecords = (target) => api('get', `/records/${target || user?.aadhaar || ''}`);
    const requestAccess = (patientHash, doctorAddr) => api('post', '/access/request', { patient_hash: patientHash, doctor_address: doctorAddr });
    const getPendingRequests = (patientHash) => api('get', `/access/pending/${patientHash}`);
    const approveAccess = (patientHash, doctorAddr) => api('post', '/access/approve', { patient_hash: patientHash, doctor_address: doctorAddr });
    const getDashboard = () => api('get', '/admin/dashboard');
    const whitelistDoctor = (doctorAddr) => api('post', '/auth/whitelist', { doctor_address: doctorAddr });

    return { loading, error, uploadRecord, getRecords, requestAccess, getPendingRequests, approveAccess, getDashboard, whitelistDoctor };
};
