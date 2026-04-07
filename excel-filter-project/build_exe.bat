@echo off
echo ========================================
echo   高考志愿系统 EXE 打包工具
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] 检查依赖...
python -c "import tkinter, pandas, openpyxl" 2>nul
if errorlevel 1 (
    echo 缺少依赖，正在安装...
    pip install pandas openpyxl -q
)

echo [2/3] 开始打包...
pyinstaller ^
    --name="山东高考志愿填报系统" ^
    --onefile ^
    --windowed ^
    --icon=NONE ^
    --add-data "C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx;." ^
    --distpath "C:\Users\DELL\Desktop" ^
    --workpath "C:\Users\DELL\.openclaw\workspace\excel-filter-project\build" ^
    --noconfirm ^
    main_launcher.py

echo [3/3] 清理临时文件...
if exist "build" rmdir /s /q build
if exist "__pycache__" rmdir /s /q __pycache__

echo.
echo ========================================
echo   打包完成！
echo   EXE位置: C:\Users\DELL\Desktop\山东高考志愿填报系统.exe
echo ========================================
pause
