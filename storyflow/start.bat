@echo off
REM StoryFlow Startup Script for Windows

cd /d "%~dp0"

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH
    exit /b 1
)

REM Set environment
set STORYFLOW_API_KEY=%STORYFLOW_API_KEY%

REM Run web server
echo Starting StoryFlow Web Server...
python -m src.api.web_server
