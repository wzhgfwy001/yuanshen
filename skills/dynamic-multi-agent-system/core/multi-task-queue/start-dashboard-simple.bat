@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
echo.
echo ========================================
echo   混合动态多 Agent 系统 - 监控大屏
echo ========================================
echo.
echo 正在启动 Flask 服务器...
start /b python monitor.py > nul 2>&1
timeout /t 3 /nobreak >nul
echo 正在打开浏览器...
start http://localhost:5000/dashboard-simple.html
echo.
echo ✅ 监控大屏已启动！
echo.
echo 访问地址：http://localhost:5000/dashboard-simple.html
echo.
echo 按任意键退出...
pause >nul
