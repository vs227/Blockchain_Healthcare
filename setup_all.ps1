# MediChain Intelligence - One-Click Setup (Windows PowerShell)

Write-Host "--- MediChain Intelligence: India-Ready Setup ---" -ForegroundColor Cyan

# 1. Environment Initialization
Write-Host "[1/4] Initializing Environment Variables..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) { 
    Write-Host "Creating backend .env from example..." -ForegroundColor Gray
    Copy-Item "backend\.env.example" "backend\.env" 
}
if (-not (Test-Path "frontend\.env")) { 
    Write-Host "Creating frontend .env from example..." -ForegroundColor Gray
    Copy-Item "frontend\.env.example" "frontend\.env" 
}

# 2. Backend Setup
Write-Host "[2/4] Setting up Python Backend..." -ForegroundColor Yellow
cd backend
pip install -r requirements.txt
Start-Process powershell -ArgumentList "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080" -NoNewWindow
cd ..

# 3. Blockchain Setup
Write-Host "[3/4] Compiling Smart Contracts..." -ForegroundColor Yellow
cd blockchain
npm install
npx hardhat compile
cd ..

# 4. Frontend Setup
Write-Host "[4/4] Starting React Frontend..." -ForegroundColor Yellow
cd frontend
npm install
npm run dev
cd ..

Write-Host "--- Setup Complete! ---" -ForegroundColor Green
Write-Host "Backend API: http://127.0.0.1:8080"
Write-Host "Frontend App: http://localhost:5173"
Write-Host "Note: Please update keys in backend/.env if you want to use real IPFS."
