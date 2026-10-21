@echo off
setlocal enabledelayedexpansion
title ClipFlow Extension - Automated Setup
cls
echo =======================================================
echo          ClipFlow Extension 1-Click Setup
echo =======================================================
echo.

set "TARGET_DIR=%LOCALAPPDATA%\ClipFlow\extension"

echo [1/3] Installing extension files...
mkdir "%TARGET_DIR%" 2>nul
xcopy /E /Y /I "%~dp0*" "%TARGET_DIR%" >nul 2>&1

REM Locate Google Chrome or Microsoft Edge
set "BROWSER_PATH="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
)

if not defined BROWSER_PATH (
    echo [ERROR] Google Chrome was not found in standard directories.
    echo Please open your browser, navigate to chrome://extensions,
    echo enable Developer mode, and click 'Load unpacked' pointing to:
    echo "%TARGET_DIR%"
    pause
    exit /b 1
)

echo [2/3] Activating extension in browser...
tasklist /FI "IMAGENAME eq chrome.exe" 2>nul | find /I "chrome.exe" >nul
if not errorlevel 1 (
    echo [*] Restarting Chrome to attach extension...
    taskkill /F /IM chrome.exe >nul 2>&1
    timeout /t 1 /nobreak >nul
)

REM Create Desktop shortcut for easy one-click launching anytime
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([IO.Path]::Combine($desktop, 'ClipFlow.lnk')); $s.TargetPath = '%BROWSER_PATH%'; $s.Arguments = '--load-extension=\"%TARGET_DIR%\" https://clipflow.cliy.me'; $s.Description = 'ClipFlow Video Downloader and Editor'; $s.Save()" >nul 2>&1

echo [3/3] Launching Chrome with ClipFlow active...
start "" "%BROWSER_PATH%" "--load-extension=%TARGET_DIR%" "https://clipflow.cliy.me"

echo.
echo =======================================================
echo          EXTENSION INSTALLED SUCCESSFULLY!
echo =======================================================
echo Chrome has opened with the ClipFlow extension active.
echo A 'ClipFlow' shortcut has also been added to your Desktop.
echo.
echo Setup is complete!
echo =======================================================
timeout /t 4 >nul
exit /b 0
