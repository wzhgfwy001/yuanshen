@echo off
cd /d "%~dp0"

echo Building EXE package...
echo.

set PY="C:\Python314\python.exe"
set DATA="C:\Users\DELL\.openclaw\workspace\百年硕博咨询师专用（2025普通类预测版）.xlsx"

echo [1/3] Checking dependencies...
"%PY%" -c "import tkinter, pandas, openpyxl" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    "%PY%" -m pip install pandas openpyxl -q
)

echo [2/3] Packaging EXE (please wait 3-5 minutes)...
"%PY%" -m PyInstaller --name="GaokaoSystem" --onefile --windowed --add-data "%DATA%;." --distpath "C:\Users\DELL\Desktop" --workpath "build_temp" --noconfirm main_launcher.py

echo [3/3] Cleaning up...
if exist "build_temp" rmdir /s /q build_temp
if exist "__pycache__" rmdir /s /q __pycache__

echo.
echo Done! Check Desktop for GaokaoSystem.exe
pause
