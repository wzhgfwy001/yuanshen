@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🔮 魔法塔队列监控服务
echo   Mage Tower Queue Monitor
echo ========================================
echo.

:: 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误：未找到 Python，请先安装 Python 3.8+
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 检查 Flask 是否安装
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Flask 未安装，正在安装...
    pip install flask
    if errorlevel 1 (
        echo ❌ Flask 安装失败，请手动运行：pip install flask
        pause
        exit /b 1
    )
)

echo ✅ 环境检查通过
echo.
echo 📍 正在启动监控服务...
echo.
echo 📊 API 地址：http://localhost:5000/api/queue/status
echo 🎮 演示模式：http://localhost:5000/api/queue/status?mock=true
echo ✨ 初始化演示：http://localhost:5000/api/queue/demo/init
echo.
echo 🌐 监控页面：
echo    - 魔法师主题：http://localhost:5000/monitor-mage.html
echo    - 动画版本：http://localhost:5000/monitor-animated.html
echo    - 标准版本：http://localhost:5000/monitor.html
echo.
echo 按 Ctrl+C 停止服务
echo.
echo ========================================
echo.

:: 启动 Flask 服务
cd /d "%~dp0"
python monitor.py

pause
