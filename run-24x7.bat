@echo off
title 24/7 AI Lead Generation System - Shri Apps and Web
color 0A

echo ================================================================
echo    24/7 AUTONOMOUS LEAD GENERATOR - SHRI APPS AND WEB
echo ================================================================
echo  Starting Backend & Mobile Web Dashboard...
echo.

cd /d "%~dp0backend"
start "LeadGen-Backend-24x7" cmd /k ".\venv\Scripts\activate.bat && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"
start "LeadGen-Frontend-24x7" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo ================================================================
echo  [SYSTEM RUNNING 24*7]
echo  - Backend API & AI Daemon: http://localhost:8000 (Docs: /docs)
echo  - Mobile Web Dashboard:    http://localhost:5173
echo.
echo  Access from your Phone:
echo  Find your PC's IP via 'ipconfig' (e.g. http://192.168.1.XX:5173)
echo  Keep these terminal windows open to allow the AI to hunt 24*7.
echo ================================================================
pause
