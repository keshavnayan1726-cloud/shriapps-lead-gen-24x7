# build-apk.ps1 — Compiles the native Android APK using portable JDK 21 and Android SDK
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$JdkDir = "C:\Users\kesha\.jdk"
$ZipPath = Join-Path $JdkDir "jdk21.zip"

Write-Host "Checking JDK 21..." -ForegroundColor Cyan

# Find expanded JDK home
$JdkHome = Get-ChildItem -Path $JdkDir -Directory -Filter "jdk-*" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName -First 1

if (-not $JdkHome -or -not (Test-Path "$JdkHome\bin\javac.exe")) {
    if (Test-Path $ZipPath) {
        Write-Host "Extracting JDK 21 from $ZipPath..." -ForegroundColor Yellow
        Expand-Archive -Path $ZipPath -DestinationPath $JdkDir -Force
        $JdkHome = Get-ChildItem -Path $JdkDir -Directory -Filter "jdk-*" | Select-Object -ExpandProperty FullName -First 1
    } else {
        throw "JDK zip not found at $ZipPath"
    }
}

Write-Host "Using JDK Home: $JdkHome" -ForegroundColor Green
$env:JAVA_HOME = $JdkHome
$env:ANDROID_HOME = "C:\Users\kesha\AppData\Local\Android\Sdk"

# 1. Build web assets
Write-Host "Building web distribution..." -ForegroundColor Cyan
Set-Location "$Root\frontend"
npm run build

# 2. Sync web assets into Android project
Write-Host "Syncing Capacitor Android assets..." -ForegroundColor Cyan
npx cap sync android

# 3. Assemble Debug APK
Write-Host "Running Gradle assembleDebug..." -ForegroundColor Cyan
Set-Location "$Root\frontend\android"
.\gradlew.bat assembleDebug

# 4. Copy APK to root folder
$ApkSrc = Join-Path $Root "frontend\android\app\build\outputs\apk\debug\app-debug.apk"
$ApkDest = Join-Path $Root "ShriApps-LeadGen.apk"

if (Test-Path $ApkSrc) {
    Copy-Item $ApkSrc $ApkDest -Force
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Android APK built successfully!" -ForegroundColor Green
    Write-Host " Location: $ApkDest" -ForegroundColor Yellow
    Write-Host " Size:     $((Get-Item $ApkDest).Length / 1MB) MB" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Green
} else {
    throw "APK was not generated at $ApkSrc"
}
