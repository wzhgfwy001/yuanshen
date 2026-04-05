@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   🔮 魔法塔监控大屏 - 等距 2.5D 版
echo   Isometric Dashboard
echo ========================================
echo.

echo 📍 正在启动服务...
echo.
echo 🌐 访问地址:
echo    - 等距大屏：http://localhost:5000/dashboard-isometric.html
echo    - 魔法主题：http://localhost:5000/monitor-mage.html
echo    - API 接口：http://localhost:5000/api/queue/status?mock=true
echo.
echo 按 Ctrl+C 停止服务
echo.
echo ========================================
echo.

cd /d "%~dp0"
python -m http.server 5000

pause
