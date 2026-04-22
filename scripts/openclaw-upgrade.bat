@echo off
echo ================================================
echo   OpenClaw 一键升级脚本
echo ================================================
echo.

echo [1/3] 停止 Gateway...
openclaw gateway stop
if %errorlevel% neq 0 (
    echo [警告] Gateway 停止失败，继续尝试升级...
)

echo.
echo [2/3] 升级 OpenClaw 到最新版...
call npm install -g openclaw@latest
if %errorlevel% neq 0 (
    echo [错误] 升级失败！
    pause
    exit /b 1
)

echo.
echo [3/3] 重启 Gateway...
openclaw gateway start
if %errorlevel% neq 0 (
    echo [警告] Gateway 启动失败，请手动检查
    pause
    exit /b 1
)

echo.
echo ================================================
echo   升级完成！
echo ================================================
echo.
openclaw version
echo.
pause
