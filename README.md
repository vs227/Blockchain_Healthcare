# MediChain Intelligence: National ABDM Standard

> A production-ready, blockchain-backed healthcare coordination system designed for the Indian ABDM ecosystem. 

## 🇮🇳 The Vision
MediChain bridges the gap between Web3 security and public health accessibility. It uses an **Aadhaar-Centric Identity Model** and **Real-Time MetaMask Synchronization** to offer zero-friction medical data portability.

---

## 🚀 Quick Start (For You & Your Friend)
1. Ensure you have **Node.js 18+**, **Python 3.10+**, and **MetaMask** installed.
2. Run the automated installer:
```powershell
.\setup_all.ps1
```
*Note: The script will automatically create `.env` files from the provided `.env.example` templates in the root, backend, and frontend folders.*

---

## 📦 Collaborator Onboarding Kit
I have added a `requirements/` folder containing a detailed setup guide. New developers should:
1. Follow `requirements/README.md`.
2. Update `backend/.env` with their own **Infura/Alchemy API Key** and **Private Key**.
3. Use the provided **Sepolia Contract Address** for instant testing.

---

## 🔐 Production Security & RBAC
| Role | Identity | Verification | Access Level |
| :--- | :--- | :--- | :--- |
| **Patient** | Aadhaar Hash | 6-Digit PIN | Full Record Ownership |
| **Surgeon** | Reg ID | MetaMask Sig | Full Clinical Entry |
| **Pharmacist** | Reg ID | MetaMask Sig | Prescription-Only (Read) |
| **Admin** | Wallet Address | Contract Owner | Global Whitelisting |

---

## 🛠 Technical Architecture

### 1. Hybrid Ledger Model
- **Storage**: Medical records are AES-256 encrypted and pinned to **IPFS**.
- **Audit**: Only SHA-256 hashes and permission states live on **Ethereum Sepolia**.
- **Privacy**: Zero PII resides on-chain.

### 2. Gas Optimization
The system uses a custom **EVM Storage-Packed Contract** to minimize transaction costs:
- **Contract**: `0x9D54eE261aA4f574D6e2A9CDD1d02eBA5A1C9B13` (Sepolia)

---

## 🧪 Credentials for Demo
- **Patient**: Aadhaar `123456789012` | PIN `111111`
- **Doctor**: ID `DMC-82741-INDIA` | PIN `222222` (Requires MetaMask)
- **Admin**: Connect MetaMask to manage the Hospital node.

---
**Built for the Smart India Hackathon (SIH) Standards.**
