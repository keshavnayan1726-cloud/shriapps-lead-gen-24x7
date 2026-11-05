# 🚀 24/7 Autonomous AI Lead Generation & Outreach Engine

> **Agency Profile**: **Shri Apps and Web**  
> **Target Geo**: Gurugram commercial sectors (Sector 29, Cyber City, Golf Course Road, Sohna Road, MG Road, DLF Phases, etc.)  
> **Platforms**: Native Android App (`.apk`), Mobile Web PWA, FastAPI 24/7 AI Daemon, Docker Cloud Container

---

## 🌟 Overview & Core Capabilities

This system autonomously identifies local businesses in Gurugram, analyzes their digital blindspots with Google Gemini AI, generates tailored sales pitches for **Shri Apps and Web**, scores prospects from 1 to 100, and enables **one-tap direct outreach on WhatsApp** with pre-filled messages.

- **🤖 24/7 Autonomous Engine**: Runs in the background on an APScheduler daemon, rotating through 15+ high-value commercial sectors.
- **⏸️ Prominent Instant Pause/Resume**: Pause or resume the 24/7 crawler with one tap from the mobile banner or the Engine control center.
- **💬 One-Tap WhatsApp Conversion**: Pre-encodes custom pitches and opens WhatsApp directly with the message pre-typed.
- **🌐 Connect Anywhere (No Wi-Fi Restriction)**: Includes built-in public tunneling (`run-tunnel.bat`) and Docker cloud deployment (`render.yaml`) so your phone connects from 4G/5G mobile data anywhere in the world.
- **📱 Native Android APK**: Built with Capacitor for direct installation on Android phones.
- **📊 Real-Time Analytics & CRM**: Visual daily acquisition velocity, top sectors breakdown, and pipeline stage management.
- **📥 CSV Export**: One-tap spreadsheet download for Excel or Google Sheets.

---

## 🚀 Quick Start (Running on Your PC)

### Option 1: One-Click Windows Launchers
Double-click:
- **`run-24x7.bat`**: Starts both the FastAPI backend daemon and the Vite dashboard.
- **`run-tunnel.bat`**: Creates public HTTPS URLs so your phone connects over mobile data without same Wi-Fi.

### Option 2: Manual Terminal Commands

**Terminal 1 — Backend (FastAPI + 24/7 Autonomous Scheduler):**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend Dashboard:**
```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 🌐 Connecting from Mobile (No Same-Network Restriction)

### Method A: Over Mobile 4G/5G (Public Tunnel)
1. Run `run-tunnel.bat` on your laptop.
2. It generates a public URL (e.g., `https://happy-frog-12.loca.lt`).
3. Open that URL on your phone from **anywhere in the world** (even miles away from home).
4. Tap the **⚙️ Settings** icon in the app header and paste the backend tunnel URL.

### Method B: Same Wi-Fi (Local Home Network)
1. Open your phone browser to:
   ```
   http://10.90.225.190:5173
   ```
2. *(If your PC's IP ever changes, run `ipconfig` to check your new IPv4).*

---

## ☁️ 24/7 Cloud Operation (Runs Even When Laptop is Closed)

To have the AI continuously hunt leads 24/7 **even when your laptop is turned off or disconnected**:

1. Create a free account at [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. Connect your GitHub repository.
3. Select **"Deploy from Dockerfile"** (using the included `backend/Dockerfile` and `render.yaml`).
4. Add your `GEMINI_API_KEY` in the environment settings.
5. Render/Railway will keep the backend running 24/7 in the cloud indefinitely.
6. Open your phone app, tap **⚙️ Settings**, and enter your cloud URL (e.g. `https://my-leadgen.onrender.com`).

---

## 📱 Installing the Native Android APK

The compiled Android APK is located at:
```
ShriApps-LeadGen.apk
```

### Installation Steps:
1. Transfer `ShriApps-LeadGen.apk` to your phone (via WhatsApp, Google Drive, or USB cable).
2. Tap the APK file on your Android phone to install.
3. If prompted, allow **"Install unknown apps"** from your file manager or browser.
4. Launch **Shri Apps Lead Gen** from your home screen.
5. In the app, tap the **⚙️ Settings** gear icon in the top header and enter your server URL (e.g. `http://10.90.225.190:8000` or public tunnel/cloud URL) to connect!

---

## 🐙 Push to Your GitHub Account

This codebase is already initialized with a clean Git repository and commit history.
To push it to your GitHub profile:

1. Create a new repository on [github.com/new](https://github.com/new) (e.g., `shriapps-lead-gen`).
2. Run these commands in PowerShell:
```powershell
cd C:\Users\kesha\.gemini\antigravity\scratch\lead-gen-dashboard

# Add your GitHub repository as remote:
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git

# Set main branch and push:
git branch -M main
git push -u origin main
```

---

## 💬 WhatsApp Integration Details

Every lead has an automated deep-link:
```
https://wa.me/919811234567?text=Hi!%20I'm%20from%20Shri%20Apps%20and%20Web...
```
- Numbers are automatically formatted to E.164 (`+91XXXXXXXXXX`).
- Pitch is URL-encoded.
- Tapping **"Message on WhatsApp"** directly opens your WhatsApp chat with the lead, with the AI pitch already typed in the input box. You only need to tap **Send**.
