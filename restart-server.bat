@echo off
echo Stopping any existing Node.js processes...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting the server...
node server.js
