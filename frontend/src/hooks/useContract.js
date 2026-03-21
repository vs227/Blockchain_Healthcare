/**
 * useContract.js — Real Ethereum contract interactions for MediChain
 * Handles: registerPatient, addMedicalRecord, grantAccess, revokeAccess, getRecords
 */
import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import HealthcareRecordsABI from '../contracts/HealthcareRecords.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
const SEPOLIA_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '11155111');

export const useContract = (address) => {
    const [contract, setContract] = useState(null);
    const [signer, setSigner] = useState(null);
    const [txLoading, setTxLoading] = useState(false);
    const [lastTx, setLastTx] = useState(null);
    const [chainError, setChainError] = useState(null);

    // Initialize contract on mount
    useEffect(() => {
        if (!address || !window.ethereum) return;
        initContract();
    }, [address]);

    const initContract = async () => {
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const s = await provider.getSigner();
            setSigner(s);

            if (CONTRACT_ADDRESS) {
                const c = new ethers.Contract(CONTRACT_ADDRESS, HealthcareRecordsABI.abi, s);
                setContract(c);
                console.log('[CONTRACT] Connected to', CONTRACT_ADDRESS);
            } else {
                console.warn('[CONTRACT] No contract address set. Set VITE_CONTRACT_ADDRESS in .env');
            }
        } catch (err) {
            console.error('[CONTRACT] Init error:', err);
            setChainError(err.message);
        }
    };

    // ── Register Patient on-chain ──────────────────────
    const registerPatient = useCallback(async (ipfsIdentityHash) => {
        if (!contract) return { success: false, error: 'Contract not connected' };
        setTxLoading(true);
        try {
            const tx = await contract.registerPatient(ipfsIdentityHash);
            console.log('[TX] registerPatient sent:', tx.hash);
            setLastTx({ hash: tx.hash, status: 'pending', type: 'registerPatient' });

            const receipt = await tx.wait();
            console.log('[TX] Confirmed in block', receipt.blockNumber);
            setLastTx({ hash: tx.hash, status: 'confirmed', block: receipt.blockNumber, type: 'registerPatient' });
            return { success: true, hash: tx.hash, block: receipt.blockNumber };
        } catch (err) {
            console.error('[TX] registerPatient failed:', err);
            setLastTx({ hash: null, status: 'failed', error: err.reason || err.message, type: 'registerPatient' });
            return { success: false, error: err.reason || err.message };
        } finally {
            setTxLoading(false);
        }
    }, [contract]);

    // ── Add Medical Record on-chain ────────────────────
    const addMedicalRecord = useCallback(async (patientAddress, ipfsRecordHash) => {
        if (!contract) return { success: false, error: 'Contract not connected' };
        setTxLoading(true);
        try {
            const tx = await contract.addMedicalRecord(patientAddress, ipfsRecordHash);
            console.log('[TX] addMedicalRecord sent:', tx.hash);
            setLastTx({ hash: tx.hash, status: 'pending', type: 'addMedicalRecord' });

            const receipt = await tx.wait();
            setLastTx({ hash: tx.hash, status: 'confirmed', block: receipt.blockNumber, type: 'addMedicalRecord' });
            return { success: true, hash: tx.hash, block: receipt.blockNumber };
        } catch (err) {
            console.error('[TX] addMedicalRecord failed:', err);
            setLastTx({ hash: null, status: 'failed', error: err.reason || err.message, type: 'addMedicalRecord' });
            return { success: false, error: err.reason || err.message };
        } finally {
            setTxLoading(false);
        }
    }, [contract]);

    // ── Grant Access to Doctor ─────────────────────────
    const grantAccessOnChain = useCallback(async (doctorAddress, expiryHours = 24) => {
        if (!contract) return { success: false, error: 'Contract not connected' };
        setTxLoading(true);
        try {
            const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryHours * 3600);
            const tx = await contract.grantAccess(doctorAddress, expiryTimestamp);
            console.log('[TX] grantAccess sent:', tx.hash);
            setLastTx({ hash: tx.hash, status: 'pending', type: 'grantAccess' });

            const receipt = await tx.wait();
            setLastTx({ hash: tx.hash, status: 'confirmed', block: receipt.blockNumber, type: 'grantAccess' });
            return { success: true, hash: tx.hash, block: receipt.blockNumber };
        } catch (err) {
            console.error('[TX] grantAccess failed:', err);
            setLastTx({ hash: null, status: 'failed', error: err.reason || err.message, type: 'grantAccess' });
            return { success: false, error: err.reason || err.message };
        } finally {
            setTxLoading(false);
        }
    }, [contract]);

    // ── Revoke Access ──────────────────────────────────
    const revokeAccessOnChain = useCallback(async (doctorAddress) => {
        if (!contract) return { success: false, error: 'Contract not connected' };
        setTxLoading(true);
        try {
            const tx = await contract.revokeAccess(doctorAddress);
            setLastTx({ hash: tx.hash, status: 'pending', type: 'revokeAccess' });
            const receipt = await tx.wait();
            setLastTx({ hash: tx.hash, status: 'confirmed', block: receipt.blockNumber, type: 'revokeAccess' });
            return { success: true, hash: tx.hash, block: receipt.blockNumber };
        } catch (err) {
            setLastTx({ hash: null, status: 'failed', error: err.reason || err.message, type: 'revokeAccess' });
            return { success: false, error: err.reason || err.message };
        } finally {
            setTxLoading(false);
        }
    }, [contract]);

    // ── Check Access (read-only) ───────────────────────
    const checkAccess = useCallback(async (patientAddress, doctorAddress) => {
        if (!contract) return false;
        try {
            return await contract.hasAccess(patientAddress, doctorAddress);
        } catch { return false; }
    }, [contract]);

    // ── Get Patient Identity Hash (read-only) ──────────
    const getPatientIdentity = useCallback(async (patientAddress) => {
        if (!contract) return null;
        try {
            return await contract.patientIdentities(patientAddress);
        } catch { return null; }
    }, [contract]);

    return {
        contract,
        signer,
        txLoading,
        lastTx,
        chainError,
        contractConnected: !!contract,
        registerPatient,
        addMedicalRecord,
        grantAccessOnChain,
        revokeAccessOnChain,
        checkAccess,
        getPatientIdentity
    };
};
