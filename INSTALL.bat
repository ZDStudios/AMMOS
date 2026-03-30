@echo off
setlocal enabledelayedexpansion

:: Define variables
set "TARGET_DIR=C:\Users\%USERNAME%\AppData\Local\AMMOS"
set "REPO_URL=https://github.com/ZDStudios/AMMOS"
set "CLAUDE_CONFIG=%APPDATA%\Claude\claude_desktop_config.json"

title AMMOS Setup Assistant
echo ===================================================
echo             AMMOS Environment Setup
echo ===================================================
echo.

:: 1. Handle the directory
if exist "%TARGET_DIR%" (
    echo [*] Cleaning up existing folder to ensure a fresh download...
    rmdir /s /q "%TARGET_DIR%"
)
echo [+] Creating clean directory: %TARGET_DIR%
mkdir "%TARGET_DIR%"

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

:: 4. Check and Auto-Install Git
echo.
echo [*] Checking for Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git is not found. Attempting auto-install via winget...
    
    :: Try to install using Windows Package Manager
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    
    if !errorlevel! neq 0 (
        echo [X] Auto-install failed. Please install Git manually from https://git-scm.com/
        start "" "https://git-scm.com/"
        goto :pause_exit
    )
    
    echo [+] Git installed successfully! 
    echo [!] Windows needs to refresh to recognize the new command.
    echo [!] Please CLOSE this window and run the script again to finish setup!
    goto :pause_exit
) else (
    echo [+] Git is installed.
)

:: 5. Fetch GitHub Content
echo.
echo [*] Fetching GitHub content...
echo [+] Cloning repository via Git...
git clone %REPO_URL% "%TARGET_DIR%"

:: 6. Run npm install
echo.
echo [*] Moving to folder and installing dependencies...
cd /d "%TARGET_DIR%"

:: Double check that package.json actually exists now
if not exist "package.json" (
    echo [X] Error: package.json was not found in %TARGET_DIR%.
    echo [!] The GitHub download may have failed.
    goto :pause_exit
)

call npm install
if %errorlevel% neq 0 (
    echo [!] npm install had a warning, trying to force a clean install...
    call npm install --no-shrinkwrap
)

:: 7. Safe JSON Injection for Claude Desktop
echo.
echo [*] Updating Claude Desktop configuration...

:: Write the clean, complete JSON directly to the file
(
echo {
echo   "preferences": {
echo     "coworkWebSearchEnabled": true,
echo     "coworkScheduledTasksEnabled": false,
echo     "ccdScheduledTasksEnabled": false
echo   },
echo   "mcpServers": {
echo     "minecraft-builder": {
echo       "command": "node",
echo       "args": ["C:\\Users\\%USERNAME%\\AppData\\Local\\AMMOS\\server.js"]
echo     }
echo   }
echo }
) > "%CLAUDE_CONFIG%"

echo [+] Successfully updated Claude config!

echo.
echo ===================================================
echo [+] All done! You're ready to go!
echo ===================================================

:pause_exit
echo.
pause
exit
