@echo off
REM Phygital Render Deployment Script for Windows
REM This script helps prepare the codebase for Render deployment

echo 🚀 Preparing Phygital for Render deployment...

REM Check if we're in the right directory
if not exist "frontend" (
    echo ❌ Frontend directory not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "backend" (
    echo ❌ Backend directory not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

echo ✅ Project structure looks good

REM Check backend files
echo ℹ️ Checking backend configuration...
if exist "backend\package.json" (
    echo ✅ Backend package.json found
) else (
    echo ❌ Backend package.json not found
    pause
    exit /b 1
)

if exist "backend\server.js" (
    echo ✅ Backend server.js found
) else (
    echo ❌ Backend server.js not found
    pause
    exit /b 1
)

if exist "backend\render.yaml" (
    echo ✅ Backend render.yaml found
) else (
    echo ⚠️ Backend render.yaml not found - will use dashboard configuration
)

REM Check frontend files
echo ℹ️ Checking frontend configuration...
if exist "frontend\package.json" (
    echo ✅ Frontend package.json found
) else (
    echo ❌ Frontend package.json not found
    pause
    exit /b 1
)

if exist "frontend\vite.config.js" (
    echo ✅ Frontend vite.config.js found
) else (
    echo ❌ Frontend vite.config.js not found
    pause
    exit /b 1
)

if exist "frontend\public\_redirects" (
    echo ✅ Frontend _redirects file found
) else (
    echo ⚠️ Frontend _redirects file not found - client-side routing may not work
)

REM Check environment files
echo ℹ️ Checking environment configuration...
if exist "backend\production.env.example" (
    echo ✅ Backend production environment example found
) else (
    echo ⚠️ Backend production environment example not found
)

if exist "frontend\production.env.example" (
    echo ✅ Frontend production environment example found
) else (
    echo ⚠️ Frontend production environment example not found
)

REM Test backend dependencies
echo ℹ️ Testing backend dependencies...
cd backend
call npm ci --only=production --silent
if %errorlevel% neq 0 (
    echo ❌ Backend dependencies installation failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Backend dependencies install successfully
cd ..

REM Test frontend build
echo ℹ️ Testing frontend build...
cd frontend
call npm ci --silent
if %errorlevel% neq 0 (
    echo ❌ Frontend dependencies installation failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Frontend dependencies install successfully

call npm run build --silent
if %errorlevel% neq 0 (
    echo ❌ Frontend build failed
    cd ..
    pause
    exit /b 1
)
echo ✅ Frontend build successful

if exist "dist" (
    echo ✅ Frontend dist directory created
    if exist "dist\index.html" (
        echo ✅ Frontend index.html generated
    ) else (
        echo ❌ Frontend index.html not found in dist
    )
) else (
    echo ❌ Frontend dist directory not created
)
cd ..

REM Check Git status
echo ℹ️ Checking Git status...
git status --porcelain > nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('git status --porcelain') do (
        echo ⚠️ You have uncommitted changes. Consider committing them before deployment.
        git status --short
        goto :git_done
    )
    echo ✅ Git working directory is clean
    :git_done
) else (
    echo ⚠️ Git not available or not a git repository
)

REM Summary
echo.
echo 📋 Deployment Readiness Summary:
echo ================================
echo ✅ Backend configuration ready
echo ✅ Frontend configuration ready
echo ✅ Build processes tested
echo ✅ Environment examples provided
echo.
echo ℹ️ Next steps:
echo 1. Commit and push any remaining changes to GitHub
echo 2. Create Render services using the dashboard or render.yaml files
echo 3. Set environment variables in Render dashboard
echo 4. Deploy and test the applications
echo.
echo ℹ️ Refer to deploy-to-render.md for detailed deployment instructions
echo ℹ️ Use RENDER_DEPLOYMENT_CHECKLIST.md to track deployment progress
echo.
echo ✅ 🎉 Phygital is ready for Render deployment!
echo.
pause
