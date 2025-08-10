@echo off
echo ==========================================
echo DB2 MCP Server - Claude Desktop Setup
echo ==========================================
echo.

:: Install dependencies
echo [1/4] Installing dependencies...
call npm install --production --silent
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

:: Test server
echo [2/4] Testing server...
echo Testing... | node dist\index.js db2.prp 2>&1 | findstr /C:"initialized" > nul
if %errorlevel% equ 0 (
    echo ✅ Server test passed
) else (
    echo ⚠️  Server test warning - check db2.prp config
)

:: Get install path
set INSTALL_PATH=%cd%
set INSTALL_PATH=%INSTALL_PATH:\=\\%

:: Create Claude Desktop config
echo [3/4] Creating Claude Desktop configuration...
(
echo {
echo   "mcpServers": {
echo     "db2-server": {
echo       "command": "node",
echo       "args": [
echo         "%INSTALL_PATH%\\dist\\index.js",
echo         "%INSTALL_PATH%\\db2.prp"
echo       ]
echo     }
echo   }
echo }
) > claude-desktop-config.json

:: Show instructions
echo [4/4] Installation complete!
echo.
echo ==========================================
echo ✅ READY FOR CLAUDE DESKTOP!
echo ==========================================
echo.
echo 1. ADD CONFIG TO CLAUDE DESKTOP:
echo    Location: %APPDATA%\Claude\claude_desktop_config.json
echo    Content: (see claude-desktop-config.json)
echo.
echo 2. RESTART Claude Desktop completely
echo.
echo 3. TEST with Claude:
echo    "What DB2 tables are available?"
echo.
echo CONFIG FILES:
echo - Server config: db2.prp
echo - Claude config: claude-desktop-config.json
echo.
echo ==========================================
pause
