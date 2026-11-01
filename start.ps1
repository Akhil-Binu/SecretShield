# SecretShield One-Click Startup Script (Windows PowerShell)
Write-Host "🛡️ Starting SecretShield — Instant Git Secret & API Key Leak Auditor..." -ForegroundColor Cyan

# Check Python and Node
if (-not (Test-Path "backend\.venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv backend\.venv
    .\backend\.venv\Scripts\pip install -r backend\requirements.txt
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    npm install
    cd ..
}

Write-Host "🚀 Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$backendProc = Start-Process -FilePath "backend\.venv\Scripts\python.exe" -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory "backend" -PassThru

Start-Sleep -Seconds 2

Write-Host "⚡ Launching Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Green
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev -- --host 127.0.0.1 --port 5173" -WorkingDirectory "frontend" -PassThru

Write-Host "`n✅ SecretShield is online!" -ForegroundColor Cyan
Write-Host "   Frontend Dashboard:  http://127.0.0.1:5173" -ForegroundColor White
Write-Host "   Backend API Docs:    http://127.0.0.1:8000/docs`n" -ForegroundColor White

Write-Host "Press Ctrl+C or Enter to stop both servers..." -ForegroundColor Gray
Read-Host

Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
