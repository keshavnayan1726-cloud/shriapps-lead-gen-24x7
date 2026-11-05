# run-24x7.ps1 — Continuous supervisor script with auto-recovery for 24/7 operation
$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   24/7 AI LEAD GENERATION SYSTEM — SHRI APPS AND WEB" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Starting Background Daemon & Mobile Dashboard..." -ForegroundColor Yellow

# Launch Backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; & .\venv\Scripts\Activate.ps1; python -m uvicorn main:app --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 3

# Launch Frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendDir'; npm run dev -- --host 0.0.0.0 --port 5173"

# Discover Local IPv4 Address for mobile access
$Ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch "^169\." } | Select-Object -First 1).IPAddress
if (-not $Ip) { $Ip = "YOUR_PC_IP" }

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host " [SUCCESS] System is now running 24*7!" -ForegroundColor Green
Write-Host " - PC Dashboard:     http://localhost:5173" -ForegroundColor Cyan
Write-Host " - Mobile Dashboard: http://${Ip}:5173" -ForegroundColor Yellow
Write-Host " - Backend API:      http://${Ip}:8000" -ForegroundColor Cyan
Write-Host " - Swagger Docs:     http://${Ip}:8000/docs" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Green
Write-Host "Open http://${Ip}:5173 in Chrome or Safari on your phone."
Write-Host "Tap 'Share' -> 'Add to Home Screen' for native PWA experience."
