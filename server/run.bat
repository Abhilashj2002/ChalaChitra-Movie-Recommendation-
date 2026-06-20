@echo off
title ChalaChitra Backend Server
cd /d "%~dp0"
echo ================================================
echo   ChalaChitra - SQLite Backend Server
echo ================================================
echo.
echo Starting server on http://localhost:3002
echo.
node server.cjs
pause
