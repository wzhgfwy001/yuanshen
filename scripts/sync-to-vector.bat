@echo off
REM sync-to-vector.bat - 快速同步文件到向量数据库
REM 用法: sync-to-vector.bat <文件路径> [集合名]
REM 示例: sync-to-vector.bat "C:\path\to\file.md" yangshen_brain

set FILE_PATH=%1
set COLLECTION=%2

if "%FILE_PATH%"=="" (
    echo 用法: sync-to-vector.bat ^<文件路径^> [集合名]
    exit /b 1
)

if "%COLLECTION%"=="" (
    set COLLECTION=yangshen_brain
)

python "D:/vector_db/vectorize_file.py" "%FILE_PATH%" "%COLLECTION%" "{}"

echo.
echo 同步完成: %FILE_PATH% -^> %COLLECTION%
