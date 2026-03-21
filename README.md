# MediChain Intelligence: "India-Ready" Healthcare Platform

> A production-ready, blockchain-backed healthcare coordination system designed specifically for the Indian context. 

## 🇮🇳 The Vision
MediChain removes the technical barrier of Web3 for patients while maintaining the security of decentralized storage. It uses an **Aadhaar-Centric Identity Model** and a **Hospital Signer Architecture** to handle transactions silently on behalf of users.

---

## 🚀 One-Click Setup (Windows)
Run the following command in your terminal to initialize the entire project:
```powershell
.\setup_all.ps1
```

---

## 🔑 Role-Based Identity
| Role | Primary Identity | Verification Method | Governance |
| :--- | :--- | :--- | :--- |
| **Patient** | Aadhaar Number | 6-digit Secure PIN | Self-Service |
| **Doctor** | Professional Reg ID | Certification Hash | Practical Access |
| **Admin** | Ethereum Wallet | MetaMask (EIP-712) | System Whitelist |

---

## 🛠 Architecture & Workflow

### 1. Hybrid Storage
- **Clinical Data**: AES-256 encrypted and stored on **IPFS**.
- **Audit Trail**: Metadata (CIDs, timestamps, signatures) stored on **Ethereum Sepolia**.
- **Privacy**: No PII (Personally Identifiable Information) ever touches the blockchain; only secure hashes.

### 2. QR-Based Approval (Silent Blockchain)
- **Step 1**: Doctor scans Patient's QR code (containing Aadhaar hash).
- **Step 2**: Backend signals a "Request" event to the Patient's Dashboard.
- **Step 3**: Patient approves via the UI (Simulated Biometrics/PIN).
- **Step 4**: Hospital Signer executes `grantAccess` on-chain.
- **Step 5**: Doctor unlocks and decrypts the IPFS records.

---

## 📦 Deployment (Docker)
For a production-like containerized environment, use Docker Compose:
```bash
docker-compose up --build
```

---

## 🧪 Simulation Data
Use these credentials for testing the platform:
- **Patient**: Aadhaar `123456789012` | PIN `111111`
- **Doctor**: Reg ID `DMC-82741-INDIA` | PIN `222222`
- **Admin**: Connect MetaMask (Requires Sepolia ETH for whitelisting actual doctors).

---
**Built with FastAPI, React, Solidity, and Framer Motion.**
