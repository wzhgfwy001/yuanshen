@echo off
chcp 65001 >nul
REM 伊邪那岐 - 知识守护神技能
cd /d "%~dp0LLM-wiki-sync"
node llm-wiki-sync.js all
pause
