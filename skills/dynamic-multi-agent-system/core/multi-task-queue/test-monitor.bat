@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🧪 魔法师主题监控 - 快速测试
echo ========================================
echo.

echo [1/3] 检查 Python 环境...
python --version
if errorlevel 1 (
    echo ❌ Python 未安装
    pause
    exit /b 1
)
echo ✅ Python 检查通过
echo.

echo [2/3] 检查 Flask 依赖...
python -c "import flask; print('Flask version:', flask.__version__)"
if errorlevel 1 (
    echo ❌ Flask 未安装，正在安装...
    pip install flask
)
echo ✅ Flask 检查通过
echo.

echo [3/3] 启动测试服务...
echo.
echo 服务启动后，请在浏览器访问：
echo   🌟 魔法师主题：http://localhost:5000/monitor-mage.html
echo   📊 API 接口：http://localhost:5000/api/queue/status?mock=true
echo.
echo 按 Ctrl+C 停止服务
echo.
echo ========================================
echo.

cd /d "%~dp0"
python monitor.py

pause
