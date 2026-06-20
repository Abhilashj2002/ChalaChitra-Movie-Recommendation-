@echo off
title ChalaChitra - Frontend
cd /d "%~dp0"
echo ================================================
echo   ChalaChitra - Frontend (React + Vite)
echo ================================================
echo.
echo Starting frontend on http://localhost:3001
echo.
echo NOTE: Run run-backend.bat first for full functionality!
echo.
npm run client
pause
