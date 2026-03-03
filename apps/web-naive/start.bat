@echo off
echo ========================================
echo   TechCompare 启动脚本
echo ========================================
echo.

echo [1/2] 启动数据库服务...
cd server
start cmd /k "node server.js"
cd ..

timeout /t 3 /nobreak > nul

echo [2/2] 启动前端服务...
cd ..
pnpm dev

pause
