from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import os

from .services import ipfs_service, ml_service, auth_service, blockchain_service

app = FastAPI(title="MediChain Intelligence API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security Dependency ───────────────────────────────────────
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    user = auth_service.get_session(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired")
    return user

# ── Approval Signaling (In-Memory for Prototype) ─────────────
# This would be Redis or a DB in production
pending_approvals = {} # patient_hash -> [ {doctor_addr, time} ]

@app.get("/")
async def root():
    return {"status": "online", "message": "MediChain Intelligence Backend"}

# ── Auth Endpoints ───────────────────────────────────────────
@app.post("/auth/login")
async def login(data: dict):
    aadhaar = data.get("aadhaar")
    pin = data.get("pin")
    role = data.get("role", "patient")
    res = auth_service.verify_login(aadhaar, pin, role)
    if not res["success"]:
        raise HTTPException(status_code=401, detail=res["error"])
    return res

@app.get("/auth/session")
async def get_session(token: str = Header(...)):
    session = auth_service.get_session(token)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    return session

@app.post("/auth/whitelist")
def whitelist_wallet(data: dict):
    doctor_addr = data.get("doctor_address")
    if not doctor_addr:
        return {"success": False, "error": "Missing doctor_address"}
    
    res = blockchain_service.whitelist_doctor(doctor_addr)
    return {"success": True, "blockchain": res}

# ── Record Endpoints ─────────────────────────────────────────
@app.post("/records/upload")
async def upload_record(
    vitals: str = Form(...),
    patient_aadhaar: str = Form(...),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Only Staff/Admin can input medical data.")
    
    try:
        # 1. IPFS Upload
        vitals_dict = json.loads(vitals)
        file_bytes = await file.read() if file else b""
        
        print(f"[RECORDS] Processing upload for patient: {patient_aadhaar}")
        ipfs_res = ipfs_service.upload_record(file_bytes, vitals_dict)
        print(f"[RECORDS] IPFS Success: {ipfs_res['cid']}")
        
        # 2. AI Risk Prediction
        # Map frontend abbreviations to ML-expected field names
        ml_input = {
            "age": float(vitals_dict.get("age") or 45),
            "heart_rate": float(vitals_dict.get("hr") or 80),
            "oxygen_level": float(vitals_dict.get("o2") or 98),
            "temperature": float(vitals_dict.get("temp") or 37.0),
            "symptom_score": float(vitals_dict.get("symptom_score") or 1)
        }
        print(f"[RECORDS] ML Input Prepared: {ml_input}")
        risk_res = ml_service.predict_triage(ml_input)
        print(f"[RECORDS] ML Analysis Complete: {risk_res['risk_category']}")
        
        # 3. Blockchain Record Addition (Signed by Hospital)
        if patient_aadhaar.startswith("0x") and len(patient_aadhaar) > 40:
            patient_hash = patient_aadhaar
        else:
            patient_hash = auth_service.generate_aadhaar_hash(patient_aadhaar)
            
        chain_res = blockchain_service.add_record_to_chain(patient_hash, ipfs_res["cid"])
        print(f"[RECORDS] Blockchain Success: {chain_res['tx_hash']}")
        
        return {
            "success": True,
            "ipfs": ipfs_res,
            "triage": risk_res,
            "blockchain": chain_res
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"!!! [INTERNAL ERROR] !!!\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.get("/records/{aadhaar}")
async def get_records(aadhaar: str):
    try:
        # If the input is already a 0x hash, use it directly. Otherwise generate.
        if aadhaar.startswith("0x") and len(aadhaar) > 40:
            patient_hash = aadhaar
        else:
            patient_hash = auth_service.generate_aadhaar_hash(aadhaar)
        
        print(f"[RECORDS] Fetching from blockchain for: {patient_hash}")
        # Check blockchain
        recs = blockchain_service.get_records(patient_hash)
        return {"records": recs}
    except Exception as e:
        import traceback
        print(f"!!! [GET_RECORDS ERROR] !!!\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

# ── QR Approval Signaling ───────────────────────────────────
@app.post("/access/request")
async def request_access(data: dict):
    """
    Doctor scans QR and sends request.
    """
    patient_hash = data.get("patient_hash")
    doctor_addr = data.get("doctor_address")
    
    # 1. Record in blockchain (signed by Hospital as proxy)
    # Note: requestAccess in contract is 'msg.sender'. 
    # Must ensure the backend is recognized as Hospital or use Doctor key.
    # For now, trigger signaling.
    if patient_hash not in pending_approvals:
        pending_approvals[patient_hash] = []
    
    pending_approvals[patient_hash].append({"doctor": doctor_addr, "status": "pending"})
    
    return {"success": True, "message": "Request sent to patient's mobile app"}

@app.get("/access/pending/{patient_hash}")
async def get_pending_requests(patient_hash: str):
    """
    Patient dashboard polls this to see approval prompts.
    """
    return {"requests": pending_approvals.get(patient_hash, [])}

@app.post("/access/approve")
async def approve_request(data: dict):
    """
    Patient clicks "Approve" -> Backend signs the on-chain grantAccess.
    """
    patient_hash = data.get("patient_hash")
    doctor_addr = data.get("doctor_address")
    
    # Sign transaction from Hospital Signer
    res = blockchain_service.approve_access_for_doctor(patient_hash, doctor_addr)
    
    # Update status
    if patient_hash in pending_approvals:
        pending_approvals[patient_hash] = [r for r in pending_approvals[patient_hash] if r["doctor"] != doctor_addr]
        
    return {"success": True, "blockchain": res}

# ── Analytics & Dashboard ────────────────────────────────────
@app.get("/admin/dashboard")
async def get_dashboard():
    # Return mock/live analytics for the Admin dashboard
    return {
        "summary": {
            "total_patients": 1284,
            "bed_occupancy": 84,
            "icu_beds_used": 12,
            "icu_beds_total": 40,
            "avg_wait_minutes": 18
        },
        "risk_distribution": {"high": 12, "medium": 45, "low": 27},
        "hourly_trend": [
            {"hour": i, "patients": 20 + (i % 5) * 10} for i in range(24)
        ],
        "department_load": [
            {"name": "Emergency", "load": 92, "trend": "up"},
            {"name": "Cardiology", "load": 45, "trend": "down"},
            {"name": "ICU", "load": 78, "trend": "up"},
        ],
        "alerts": [
            {"id": 1, "type": "critical", "message": "High influx in Pediatric Emergency", "time": "2 mins ago"},
            {"id": 2, "type": "warning", "message": "Blood supply for O- low", "time": "15 mins ago"}
        ]
    }
