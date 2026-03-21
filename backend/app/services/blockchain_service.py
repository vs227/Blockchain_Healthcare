import os
import json
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

# Configuration
RPC_URL = os.getenv("SEPOLIA_RPC_URL", "https://rpc.sepolia.org")
PRIVATE_KEY = os.getenv("HOSPITAL_PRIVATE_KEY")
CONTRACT_ADDRESS = os.getenv("VITE_CONTRACT_ADDRESS")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

# Load ABI from Hardhat artifact
ABI_PATH = os.path.join(os.getcwd(), "..", "blockchain", "artifacts", "contracts", "HealthcareRecords.sol", "HealthcareRecords.json")
with open(ABI_PATH, "r") as f:
    contract_data = json.load(f)
    CONTRACT_ABI = contract_data["abi"]

contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
hospital_account = Account.from_key(PRIVATE_KEY)

def send_transaction(fn_name, *args):
    """
    Helper to build, sign and send a transaction from the Hospital Wallet.
    """
    nonce = w3.eth.get_transaction_count(hospital_account.address)
    
    # Retrieve base gas price and aggressively scale it to unstick pending transactions
    base_gas_price = w3.eth.gas_price
    fast_gas_price = int(base_gas_price * 1.5)

    # Build transaction
    tx = getattr(contract.functions, fn_name)(*args).build_transaction({
        'chainId': 11155111,  # Sepolia
        'gas': 500000,
        'gasPrice': fast_gas_price,
        'nonce': nonce,
    })
    
    # Sign transaction
    signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    
    # Send transaction
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    print(f"[BLOCKCHAIN] TX Sent: {tx_hash.hex()}")
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    print(f"[BLOCKCHAIN] TX Confirmed in block {receipt.blockNumber}")
    
    return {
        "success": True,
        "tx_hash": tx_hash.hex(),
        "block_number": receipt.blockNumber
    }

def whitelist_doctor(doctor_addr):
    """
    Hospital whitelists a doctor's MetaMask address so they can interact with the contract.
    """
    try:
        doctor_addr = w3.to_checksum_address(doctor_addr)
        is_whitelisted = contract.functions.doctorWhitelist(doctor_addr).call()
        if is_whitelisted:
            return {"success": True, "message": "Already whitelisted"}
    except Exception as e:
        print(f"[BLOCKCHAIN] Whitelist check failed: {e}")
        
    return send_transaction("setDoctorWhitelist", doctor_addr, True)

def add_record_to_chain(patient_hash_hex, ipfs_hash):
    """
    Hospital adds a record for a patient (identified by Aadhaar hash).
    """
    patient_hash = bytes.fromhex(patient_hash_hex.replace("0x", ""))
    return send_transaction("addMedicalRecord", patient_hash, ipfs_hash)

def request_access_for_doctor(patient_hash_hex, doctor_address):
    """
    Doctor requests access. Note: In the final vision, the Doctor might sign this themselves,
    but for 'silent blockchain', the Hospital can act as proxy or the Doctor's web portal 
    can use a delegated key. For now, let's keep it flexible.
    """
    # If the doctor is whitelisted, we can trigger the request
    patient_hash = bytes.fromhex(patient_hash_hex.replace("0x", ""))
    # Here we might actually use the DOCTOR'S private key if stored, 
    # but the user said "wallet on hospital's name".
    return send_transaction("requestAccess", patient_hash)

def approve_access_for_doctor(patient_hash_hex, doctor_address, expiry_hours=24):
    """
    Hospital signs the approval after patient clicks "Approve" in UI.
    """
    patient_hash = bytes.fromhex(patient_hash_hex.replace("0x", ""))
    doctor_address = w3.to_checksum_address(doctor_address)
    expiry = 3600 * expiry_hours # For simplicity, handled in contract as uint
    return send_transaction("approveAccess", patient_hash, doctor_address, expiry)

def check_access(patient_hash_hex, doctor_address):
    """
    Read-only check
    """
    patient_hash = bytes.fromhex(patient_hash_hex.replace("0x", ""))
    return contract.functions.hasAccess(patient_hash, doctor_address).call()

def get_records(patient_hash_hex):
    """
    Read-only fetch
    """
    try:
        patient_hash = bytes.fromhex(patient_hash_hex.replace("0x", ""))
        return contract.functions.getPatientRecords(patient_hash).call()
    except Exception as e:
        print(f"[BLOCKCHAIN] Warning: Could not fetch records (likely access denied): {e}")
        return []
