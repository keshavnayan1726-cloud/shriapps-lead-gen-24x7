@echo off
title Shri Apps and Web — 1-Click 24/7 Cloud Deployer
color 0B
cls
echo =====================================================================
echo    SHRI APPS AND WEB — 1-CLICK AUTONOMOUS 24/7 CLOUD DEPLOYER
echo =====================================================================
echo.
echo  This tool will automatically:
echo   1. Connect to your GitHub account (opens a 1-tap browser login)
echo   2. Create a private/public repository for Shri Apps and Web
echo   3. Upload all 100%% of your code, Dockerfile, and AI Hunters
echo   4. Launch the Render Cloud Deployer with 1 click
echo.
echo =====================================================================
echo.

set "GH_BIN=C:\Program Files\GitHub CLI\gh.exe"

if not exist "%GH_BIN%" (
    echo [ERROR] GitHub CLI not found at %GH_BIN%.
    pause
    exit /b 1
)

echo [*] Checking GitHub Authentication...
"%GH_BIN%" auth status >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] You need to authenticate once so GitHub knows where to store your code.
    echo [!] A browser window will open. Click 'Authorize github' and confirm.
    echo.
    pause
    "%GH_BIN%" auth login --web --git-protocol https --scopes repo,workflow
)

echo.
echo [*] Successfully authenticated with GitHub!
echo [*] Creating GitHub repository 'shriapps-lead-gen-24x7'...

cd /d "C:\Users\kesha\.gemini\antigravity\scratch\lead-gen-dashboard"

"%GH_BIN%" repo create shriapps-lead-gen-24x7 --public --source=. --remote=origin --push

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Repository may already exist, pushing latest updates...
    git push -u origin main
)

echo.
echo =====================================================================
echo  [SUCCESS] All code and AI Hunters uploaded to your GitHub!
echo =====================================================================
echo.
echo [*] Now opening Render 1-Click Cloud Deployer in your browser...
start https://dashboard.render.com/select-repo?type=web
echo.
echo  Inside Render:
echo   1. Select your 'shriapps-lead-gen-24x7' repository.
echo   2. Add GEMINI_API_KEY under Environment Variables.
echo   3. Click 'Create Web Service'.
echo.
echo  That's it! Your server will now run 24/7 in the cloud for free.
echo =====================================================================
echo.
pause
