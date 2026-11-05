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

# 3. Assemble Release and Debug APKs
Write-Host "Running Gradle assembleRelease..." -ForegroundColor Cyan
Set-Location "$Root\frontend\android"
.\gradlew.bat assembleRelease

# 4. Copy APKs to root folder
$RelSrc = Join-Path $Root "frontend\android\app\build\outputs\apk\release\app-release.apk"
$RelDest = Join-Path $Root "ShriApps-LeadGen.apk"
$RelBackup = Join-Path $Root "ShriApps-LeadGen-Release.apk"

if (Test-Path $RelSrc) {
    Copy-Item $RelSrc $RelDest -Force
    Copy-Item $RelSrc $RelBackup -Force
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] Android Release APK built and signed successfully!" -ForegroundColor Green
    Write-Host " Location: $RelDest" -ForegroundColor Yellow
    Write-Host " Size:     $([math]::Round((Get-Item $RelDest).Length / 1MB, 2)) MB" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Green
} else {
    throw "Release APK was not generated at $RelSrc"
}
