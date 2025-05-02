@echo off
cd /d "%~dp0"
echo ================================
echo Starting Express.js Server...
echo Directory: %cd%
echo ================================

:: Optional: check for node_modules and install if missing
IF NOT EXIST node_modules (
    echo [!] node_modules not found. Running npm install...
    npm install
)

:: Start the server
npm run deploy

echo.
echo [✔] Express server has exited or crashed.
pause