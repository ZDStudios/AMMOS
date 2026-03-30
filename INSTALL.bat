@echo off
setlocal enabledelayedexpansion

:: Define variables
set "TARGET_DIR=C:\Users\%USERNAME%\AppData\Local\AMMOS"
set "REPO_URL=https://github.com/ZDStudios/AMMOS"

title AMMOS Setup Assistant
echo ===================================================
echo             AMMOS Environment Setup
echo ===================================================
echo.

:: 1. Create directory if it doesn't exist
if not exist "%TARGET_DIR%" (
    echo [+] Creating directory: %TARGET_DIR%
    mkdir "%TARGET_DIR%"
) else (
    echo [*] Directory already exists: %TARGET_DIR%
)

:: 2. Check for Java
echo.
echo [*] Checking for Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Java is not installed or not in PATH.
    echo [!] Opening Java download page. Please install it and restart this script.
    timeout /t 3 >nul
    start "" "https://www.java.com/download/"
    goto :pause_exit
) else (
    echo [+] Java is installed.
)

:: 3. Check for Node.js
echo.
echo [*] Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js is not installed or not in PATH.
    echo [!] Opening Node.js download page. Please install it and restart this script.
    timeout /t 3 >nul
    start "" "https://nodejs.org/"
    goto :pause_exit
) else (
    echo [+] Node.js is installed.
)

:: 4. Fetch GitHub Content
echo.
echo [*] Fetching GitHub content...
cd /d "%TARGET_DIR%"

:: Check if Git is installed to clone
where git >nul 2>&1
if %errorlevel% equ 0 (
    :: Check if folder is already a git repo or has files
    dir /A /B | findstr . >nul
    if %errorlevel% neq 0 (
        echo [+] Cloning repository via Git...
        git clone %REPO_URL% .
    ) else (
        echo [*] Folder is not empty. Attempting to pull latest updates...
        git pull >nul 2>&1
    )
) else (
    echo [!] Git is not installed. Cannot clone directly.
    echo [!] Opening the GitHub page. Please download the ZIP and extract it to:
    echo     %TARGET_DIR%
    start "" "%REPO_URL%"
    goto :pause_exit
)

:: 5. Run npm install
echo.
echo [*] Installing dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [X] npm install failed. Please check the errors above.
    goto :pause_exit
)

echo.
echo ===================================================
echo [+] All done! You're ready to go!
echo ===================================================

:pause_exit
echo.
pause
exit
