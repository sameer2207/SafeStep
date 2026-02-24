@echo off
REM SafeStep Platform - Single Server Launcher (Production Ready)
REM This launches the application on port 5000 serving both API and frontend

setlocal enabledelayedexpansion

REM Kill any existing Python processes
taskkill /F /IM python.exe /T >nul 2>&1

echo.
echo ===============================================================
echo SafeStep Platform - Production Ready Single Server
echo ===============================================================
echo.
echo [STARTING] SafeStep Server...
echo.

REM Start the Flask backend+frontend server
cd /d "d:\KUNAL\PROGRAMING FILES\WD1\PROJECTS\OFFICIAL\PROJECT 2"
python backend.py

pause
