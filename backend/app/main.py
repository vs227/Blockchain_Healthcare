from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import json
import os

from .services import ipfs_service, ml_service, auth_service, blockchain_service, analytics_service

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
        # 1. Get citations from Blockchain (Timestamp + CID)
        citations = blockchain_service.get_records(patient_hash)
        
        # 2. Fetch and Decrypt data from IPFS
        enriched_records = []
        for c in citations:
            cid = c.get("ipfs_hash")
            decrypted_data = ipfs_service.download_record(cid)
            
            # Combine blockchain metadata with IPFS clinical data
            enriched_records.append({
                "timestamp": c.get("timestamp"),
                "cid": cid,
                "data": decrypted_data
            })
            
        return {"records": enriched_records}
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

    if not patient_hash or not doctor_addr:
        print(f"[ERROR] Missing data in approve_request: patient={patient_hash}, doctor={doctor_addr}")
        raise HTTPException(status_code=400, detail="Missing patient_hash or doctor_address")
    
    # Sign transaction from Hospital Signer
    res = blockchain_service.approve_access_for_doctor(patient_hash, doctor_addr)
    
    # Update status
    if patient_hash in pending_approvals:
        pending_approvals[patient_hash] = [r for r in pending_approvals[patient_hash] if r["doctor"] != doctor_addr]
        
    return {"success": True, "blockchain": res}

@app.post("/records/submit")
async def submit_vitals(
    patient_hash: str = Form(...),
    doctor_address: str = Form(...),
    vitals_json: str = Form(...),
    file: UploadFile = File(None)
):
    try:
        print(f"[RECORDS] Submitting for: {patient_hash}")
        vitals = json.loads(vitals_json)
        
        # Ensure patient_hash is in vitals for the IPFS bundle/name
        vitals["patient_hash"] = patient_hash
        
        # 1. Log to Anonymized Analytics DB (Requirement: No PII)
        analytics_service.log_metric(vitals)
        
        # 2. Process for IPFS/Blockchain (Real Secured Data)
        file_bytes = b""
        if file:
            file_bytes = await file.read()
        
        print(f"[RECORDS] Encrypting & Uploading to IPFS...")
        ipfs_res = ipfs_service.upload_record(file_bytes, vitals)
        
        if not ipfs_res or "cid" not in ipfs_res:
            print("[RECORDS] IPFS FAILURE: Resource not returned.")
            raise HTTPException(status_code=500, detail="IPFS Upload Failed")
            
        # 3. Blockchain Audit Trail
        print(f"[RECORDS] Creating on-chain audit for CID: {ipfs_res['cid']}")
        chain_res = blockchain_service.add_record_to_chain(patient_hash, ipfs_res["cid"])
        print(f"[RECORDS] Success! TX: {chain_res['tx_hash']}")
        
        return {"success": True, "cid": ipfs_res["cid"], "tx": chain_res}
    except Exception as e:
        import traceback
        error_msg = f"Submission Error: {str(e)}"
        print(f"!!! [SUBMISSION ERROR] !!!\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

# ── Analytics & Dashboard ────────────────────────────────────
@app.get("/admin/dashboard")
async def get_admin_dashboard():
    """Return live metrics from the anonymized clinical warehouse."""
    return analytics_service.get_hospital_stats()
