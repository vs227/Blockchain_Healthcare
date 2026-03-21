# 1. Backend Dependencies
- Python 3.10+
- FastAPI, Web3.py, Cryptography, Uvicorn
- Install via: `pip install -r backend/requirements.txt`

# 2. Frontend Dependencies
- Node.js 18+
- React, Ethers.js, Vite
- Install via: `cd frontend && npm install`

# 3. Blockchain Pre-requisites
- MetaMask Extension
- Sepolia Testnet configured
- Test ETH (Get from a faucet like `sepoliafaucet.com`)

# 4. Environment Secrets
You will need to create `.env` files based on the `.env.example` templates provided in the root.
- `INFURA_ID` or `ALCHEMY_RPC`
- `PINATA_API_KEYS` (Optional: Demo uses mock IPFS by default)
