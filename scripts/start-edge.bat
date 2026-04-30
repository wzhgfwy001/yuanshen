@echo off
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
start "" %EDGE_PATH% --remote-debugging-port=9222
echo Edge started
timeout /t 3 /nobreak