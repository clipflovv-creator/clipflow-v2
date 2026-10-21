@echo off
setlocal enabledelayedexpansion
title ClipFlow Extension - Setup Helper
cls
echo =======================================================
echo          ClipFlow Extension 1-Click Setup
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\ClipFlow\extension"

echo [1/3] Setting up extension folder...
mkdir "%TARGET_DIR%" 2>nul
xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%" >nul

REM Copy the directory path to the Windows clipboard (no trailing newline)
<nul set /p="%TARGET_DIR%" | clip
echo [2/3] Folder path copied to clipboard:
echo       "%TARGET_DIR%"
echo.

REM Open Google Chrome to the extensions manager
echo [3/3] Opening Google Chrome Extensions page...
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
echo 3. In the folder picker, press Ctrl+V to paste the path,
echo    then press Enter or click "Select Folder".
echo.
echo ClipFlow is now activated in your browser!
echo =======================================================
echo.
pause
