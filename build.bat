@echo off
echo ========================================
echo ICD AutoCoder 本地构建脚本
echo ========================================

echo.
echo [1/3] 安装前端依赖...
cd frontend
if not exist "node_modules" (
    call npm install
)
if %errorlevel% neq 0 (
    echo 前端依赖安装失败，请手动执行: cd frontend && npm install
    pause
    exit /b 1
)

echo.
echo [2/3] 构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo 前端构建失败!
    pause
    exit /b 1
)

echo.
echo [3/3] 构建 Docker 镜像...
cd ..
docker-compose build
if %errorlevel% neq 0 (
    echo Docker 镜像构建失败!
    pause
    exit /b 1
)

echo.
echo ========================================
echo 构建完成!
echo 启动命令: docker-compose up -d
echo 访问地址: http://localhost:8080
echo ========================================
pause
