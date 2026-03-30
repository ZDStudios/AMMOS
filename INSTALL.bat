@echo off
setlocal enabledelayedexpansion
title Minecraft Mod Builder — MCP Setup

echo.
echo  =====================================================
echo   Minecraft Mod Builder MCP Server — Setup
echo  =====================================================
echo.

:: ── Check Node.js ─────────────────────────────────────────────────────────
echo  [1/3] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ❌ Node.js not found!
    echo.
    echo  Please install Node.js first:
    echo  https://nodejs.org  (download the LTS version)
    echo.
    echo  After installing, re-run this script.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  ✅ Node.js %NODE_VER% found

:: ── Check Java ────────────────────────────────────────────────────────────
echo  [2/3] Checking Java...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ⚠️  Java not found. You need Java 17 to compile mods.
    echo  Download from: https://adoptium.net
    echo.
    echo  You can still install the MCP server now and add Java later.
    echo.
) else (
    for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do (
        set JAVA_VER=%%v
        goto :java_found
    )
    :java_found
    echo  ✅ Java found: !JAVA_VER!
)

:: ── npm install ───────────────────────────────────────────────────────────
echo  [3/3] Installing npm packages...
cd /d "%~dp0"
call npm install --silent
if %errorlevel% neq 0 (
    echo  ❌ npm install failed. Check your internet connection and try again.
    pause
    exit /b 1
)
echo  ✅ Packages installed

:: ── Print config ─────────────────────────────────────────────────────────
set "SERVER_PATH=%~dp0server.js"
set "SERVER_PATH_ESC=%SERVER_PATH:\=\\%"

echo.
echo  =====================================================
echo   ✅ Setup complete!
echo  =====================================================
echo.
echo  Now add this to your Claude Desktop config file:
echo.
echo  File location:
echo  %%APPDATA%%\Claude\claude_desktop_config.json
echo.
echo  ─────────────────────────────────────────────────────
echo  {
echo    "mcpServers": {
echo      "minecraft-builder": {
echo        "command": "node",
echo        "args": ["%SERVER_PATH_ESC%"]
echo      }
echo    }
echo  }
echo  ─────────────────────────────────────────────────────
echo.
echo  The config file will be opened for you now.
echo  Paste the block above into it (merge with any existing content).
echo.

:: ── Write a config snippet file they can copy from ───────────────────────
(
echo {
echo   "mcpServers": {
echo     "minecraft-builder": {
echo       "command": "node",
echo       "args": ["%SERVER_PATH_ESC%"]
echo     }
echo   }
echo }
) > "%~dp0claude_desktop_config_SNIPPET.json"

echo  A ready-to-paste snippet has also been saved to:
echo  claude_desktop_config_SNIPPET.json
echo.

:: ── Open config folder ────────────────────────────────────────────────────
set "CONFIG_DIR=%APPDATA%\Claude"
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"
if not exist "%CONFIG_DIR%\claude_desktop_config.json" (
    copy "%~dp0claude_desktop_config_SNIPPET.json" "%CONFIG_DIR%\claude_desktop_config.json" >nul
    echo  ✅ Config file created automatically at:
    echo  %CONFIG_DIR%\claude_desktop_config.json
) else (
    start "" "%CONFIG_DIR%"
    echo  ⚠️  You already have a config file. Merge the snippet into it manually.
    echo  Opening the folder for you now...
)

echo.
echo  After saving the config, restart Claude Desktop.
echo  You should see a hammer icon — that's your mod builder!
echo.
echo  ─────────────────────────────────────────────────────
echo  Then just tell Claude:
echo  "Build me a Forge 1.20.1 mod that lets me leash players"
echo  ─────────────────────────────────────────────────────
echo.
pause
