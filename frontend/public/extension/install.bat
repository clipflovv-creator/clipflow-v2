@echo off
setlocal enabledelayedexpansion
title ClipFlow Extension - Automated Setup
cls
echo =======================================================
echo          ClipFlow Extension 1-Click Setup
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\ClipFlow\extension"

echo [*] Target Directory: %TARGET_DIR%
echo.

REM 1. Check if files exist alongside this script (running from unzipped archive)
if exist "%~dp0manifest.json" (
    echo [1/3] Copying extension files...
    mkdir "%TARGET_DIR%" 2>nul
    xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%" >nul
) else (
    REM Running as a standalone downloaded .bat file: fetch the package
    echo [1/3] Downloading latest extension files...
    mkdir "%TARGET_DIR%" 2>nul
    set "ZIP_TEMP=%TEMP%\clipflow-extension.zip"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri 'https://clipflow-v2.vercel.app/extension/clipflow-extension.zip' -OutFile '%ZIP_TEMP%' } catch { Invoke-WebRequest -Uri 'http://localhost:5173/extension/clipflow-extension.zip' -OutFile '%ZIP_TEMP%' }"
    
    if not exist "%ZIP_TEMP%" (
        echo [ERROR] Could not download extension zip. Please check your internet connection.
        pause
        exit /b 1
    )
    
    echo [2/3] Extracting files...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%ZIP_TEMP%' -DestinationPath '%TARGET_DIR%' -Force"
    del /f /q "%ZIP_TEMP%" 2>nul
)

REM 2. Copy the path to Windows clipboard (without trailing newline)
<nul set /p="%TARGET_DIR%" | clip
echo [2/3] Extension folder path copied to clipboard:
echo       "%TARGET_DIR%"
echo.

REM 3. Launch Chrome directly to chrome://extensions
echo [3/3] Opening Chrome Extensions page...
start "" chrome "chrome://extensions" 2>nul
if errorlevel 1 (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
        start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
        start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" "chrome://extensions"
    ) else (
        start "" "chrome://extensions"
    )
)

echo.
echo =======================================================
echo              SETUP COMPLETE - FINAL 2 CLICKS
echo =======================================================
echo 1. In Chrome, switch ON "Developer mode" (top-right corner).
echo 2. Click "Load unpacked" (top-left corner).
echo 3. In the file picker, press Ctrl+V to paste the folder
echo    path, then press Enter or click "Select Folder".
echo.
echo Done! ClipFlow is now activated in your browser.
echo =======================================================
echo.
pause
