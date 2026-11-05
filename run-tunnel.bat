@echo off
title Shri Apps Lead Gen - Public Tunnel Launcher
color 0B

echo ================================================================
echo   PUBLIC INTERNET TUNNEL LAUNCHER - SHRI APPS AND WEB
echo ================================================================
echo  This creates a secure public HTTPS URL so your phone can connect
echo  from ANY network (Mobile 4G/5G, outside home, or anywhere in the world)!
echo  NO SAME-WIFI RESTRICTION REQUIRED!
echo ================================================================
echo.

echo Starting public HTTPS tunnel for Backend (Port 8000)...
start "Backend-Public-Tunnel" cmd /k "npx --yes localtunnel --port 8000"

timeout /t 3 /nobreak >nul

echo Starting public HTTPS tunnel for Frontend (Port 5173)...
start "Frontend-Public-Tunnel" cmd /k "npx --yes localtunnel --port 5173"

echo.
echo ================================================================
echo  Tunnel Windows are open!
echo  1. Look at the Frontend-Public-Tunnel window for your public URL:
echo     (e.g., https://happy-frog-12.loca.lt)
echo  2. Open that URL on your phone browser from ANYWHERE in the world!
echo  3. Note: On first open, loca.lt asks for your IP address.
echo     Click the link shown or enter your public IP to proceed.
echo ================================================================
pause
