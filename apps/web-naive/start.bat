@echo off
echo ========================================
echo   TechCompare 启动脚本
echo ========================================
echo.

echo [1/2] 启动数据库服务...
start cmd /k "cd /d %~dp0server && node server.js"

timeout /t 3 /nobreak > nul

echo [2/2] 启动前端服务...
cd /d %~dp0..\..
pnpm dev

pause
