@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo   高考志愿系统 EXE 打包中...
echo ========================================

REM 设置Python路径
set PY=C:\Python314\python.exe
set DATA_SRC="C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx"

echo [1/3] 检查依赖...
"%PY%" -c "import tkinter, pandas, openpyxl" 2>nul
if errorlevel 1 (
    echo 缺少依赖，正在安装...
    "%PY%" -m pip install pandas openpyxl -q
)

echo [2/3] 开始打包（请耐心等待3-5分钟）...
"%PY%" -m PyInstaller ^
    --name="GaokaoSystem" ^
    --onefile ^
    --windowed ^
    --add-data %DATA_SRC%;. ^
    --distpath "C:\Users\DELL\Desktop" ^
    --workpath "build_temp" ^
    --noconfirm ^
    main_launcher.py

if exist "build_temp" rmdir /s /q build_temp
if exist "__pycache__" rmdir /s /q __pycache__

echo.
echo ========================================
echo   打包完成！
echo   EXE位置: C:\Users\DELL\Desktop\GaokaoSystem.exe
echo ========================================
pause
