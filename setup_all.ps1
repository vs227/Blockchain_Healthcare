# MediChain Intelligence - One-Click Setup (Windows PowerShell)

Write-Host "--- MediChain Intelligence: India-Ready Setup ---" -ForegroundColor Cyan

# 1. Environment Initialization
Write-Host "[1/4] Initializing Environment Variables..." -ForegroundColor Yellow
if (-not (Test-Path "backend\.env")) { Copy-Item "backend\.env" "backend\.env" -ErrorAction SilentlyContinue }
if (-not (Test-Path "frontend\.env")) { Copy-Item "frontend\.env" "frontend\.env" -ErrorAction SilentlyContinue }

# 2. Backend Setup
Write-Host "[2/4] Setting up Python Backend..." -ForegroundColor Yellow
cd backend
pip install -r requirements.txt
Start-Process powershell -ArgumentList "python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -NoNewWindow
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
Write-Host "Backend: http://127.0.0.1:8000"
Write-Host "Frontend: http://localhost:5173"
