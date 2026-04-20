@echo off
chcp 65001 >nul
title StoryFlow Web UI

echo ================================================
echo StoryFlow Web UI 启动器
echo ================================================
echo.

:: 检查Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

:: 检查依赖
echo [1/3] 检查依赖...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo [安装] Flask...
    pip install flask
)

pip show flask-cors >nul 2>&1
if errorlevel 1 (
    echo [安装] flask-cors...
    pip install flask-cors
)

pip show httpx >nul 2>&1
if errorlevel 1 (
    echo [安装] httpx...
    pip install httpx
)

:: 设置API Key（如果有）
if defined MINIMAX_API_KEY (
    set STORYFLOW_API_KEY=%MINIMAX_API_KEY%
    echo [提示] 使用环境变量中的API Key
)

:: 启动服务器
echo.
echo [2/3] 启动StoryFlow Web服务器...
echo [提示] 按 Ctrl+C 停止服务器
echo.

cd /d "%~dp0"
python web_server.py

pause
