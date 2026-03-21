import hashlib
import uuid

# Memory-based store for Aadhaar simulation
# In production, this would be a secure DB linked to official Aadhaar API
aadhaar_store = {
    # Aadhaar Number : { "pin": "123456", "name": "Patient One", "id_hash": "...", "role": "patient" }
    "123456789012": {
        "pin": "111111",
        "name": "Arjun Sharma",
        "id_hash": hashlib.sha256(b"123456789012").hexdigest(),
        "role": "patient"
    },
    "987654321098": {
        "pin": "222222",
        "name": "Dr. Aditi Rao",
        "id_hash": hashlib.sha256(b"987654321098").hexdigest(),
        "role": "doctor"
    },
    "DMC-82741-INDIA": {
        "pin": "111111",
        "name": "Dr. Aditi Rao",
        "id_hash": hashlib.sha256(b"DMC-82741-INDIA").hexdigest(),
        "role": "doctor"
    }
}

from typing import Dict, Any

active_sessions: Dict[str, Any] = {}

def verify_login(aadhaar, pin, role="patient"):
    """
    DYNAMIC PROTOTYPE MODE: Verifies ANY ID + PIN
    """
    print(f"[AUTH-PROTO] Attempt: ID={aadhaar}, Role={role}")
    
    # Generate deterministic hash for demo identity
    id_hash = hashlib.sha256(aadhaar.encode()).hexdigest()
    
    session_id = str(uuid.uuid4())
    active_sessions[session_id] = {
        "aadhaar": aadhaar,
        "name": f"User {aadhaar[:4]}..." if len(aadhaar) > 4 else "Demo User",
        "id_hash": f"0x{id_hash}",
        "role": str(role)
    }
    
    print(f"[AUTH-PROTO] Success: {active_sessions[session_id]['name']} | Hash: {id_hash[:10]}...")
    return {"success": True, "session_id": session_id, "user": active_sessions[session_id]}

def get_session(session_id):
    return active_sessions.get(session_id)

def generate_aadhaar_hash(aadhaar):
    return f"0x{hashlib.sha256(aadhaar.encode()).hexdigest()}"
