@echo off
echo ====================================
echo   魔法学院监控面板启动器
echo ====================================
echo.
echo 正在启动 Flask 后端服务...
echo.
cd /d "%~dp0"
python monitor.py
echo.
echo 服务已启动！
echo.
echo 请在浏览器访问：
echo   - 基础版：http://localhost:5000/monitor.html
echo   - 动画版：http://localhost:5000/monitor-animated.html
echo   - 魔法版：http://localhost:5000/magic-monitor.html
echo.
echo 按 Ctrl+C 停止服务
echo ====================================
pause
