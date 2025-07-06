@echo off
REM Manual Build and Package Script for APRSwx (Windows)
REM Use this script if GitHub Actions fails

echo 🚀 APRSwx Manual Build and Package Script
echo ==========================================

REM Check dependencies
echo Checking dependencies...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ✗ Python is required but not installed
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ✗ Node.js/NPM is required but not installed
    pause
    exit /b 1
)

where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠ Docker not found - Docker build will be skipped
    set DOCKER_AVAILABLE=false
) else (
    set DOCKER_AVAILABLE=true
)

echo ✓ Dependencies checked

REM Build backend
echo.
echo Building backend...
cd backend

REM Install Python dependencies
echo ✓ Installing Python dependencies...
pip install -r requirements-ci.txt
if %errorlevel% neq 0 (
    echo ⚠ Full requirements failed, trying minimal install...
    pip install Django djangorestframework django-cors-headers requests
    if %errorlevel% neq 0 (
        echo ✗ Could not install minimal Python dependencies
        pause
        exit /b 1
    )
)

REM Test Django
python -c "import django; print('Django version:', django.VERSION)"
if %errorlevel% neq 0 (
    echo ✗ Django import failed
    pause
    exit /b 1
)

echo ✓ Backend build completed

REM Build frontend
echo.
echo Building frontend...
cd ..\frontend

REM Install NPM dependencies
echo ✓ Installing NPM dependencies...
npm ci --ignore-scripts
if %errorlevel% neq 0 (
    echo ⚠ NPM install with scripts failed, trying without scripts...
    npm install --ignore-scripts
    if %errorlevel% neq 0 (
        echo ⚠ Main package.json failed, trying simplified version...
        copy package.simple.json package.json
        npm install --ignore-scripts
        if %errorlevel% neq 0 (
            echo ✗ Could not install NPM dependencies
            pause
            exit /b 1
        )
    )
)

REM Build frontend
echo ✓ Building frontend...
npm run build
if %errorlevel% neq 0 (
    echo ✗ Frontend build failed
    pause
    exit /b 1
)

echo ✓ Frontend build completed

REM Build Docker image
if "%DOCKER_AVAILABLE%"=="true" (
    echo.
    echo Building Docker image...
    cd ..
    
    REM Try main Dockerfile first
    docker build -t aprswx:latest .
    if %errorlevel% neq 0 (
        echo ⚠ Main Docker build failed, trying simplified version...
        docker build -f Dockerfile.simple -t aprswx:latest .
        if %errorlevel% neq 0 (
            echo ✗ Docker build failed
            pause
            exit /b 1
        )
    )
    
    echo ✓ Docker image built successfully
    
    REM Optional: Tag for GitHub Packages
    set /p REPLY=Do you want to tag for GitHub Packages? (y/n): 
    if /i "%REPLY%"=="y" (
        docker tag aprswx:latest ghcr.io/rf-yvy/aprswx:latest
        echo ✓ Docker image tagged for GitHub Packages
        echo To push: docker push ghcr.io/rf-yvy/aprswx:latest
    )
) else (
    echo ⚠ Docker not available - skipping Docker build
)

REM Create distribution package
echo.
echo Creating distribution package...
cd ..

REM Create dist directory
if not exist dist mkdir dist

REM Copy important files
xcopy backend dist\backend\ /E /I /Y
xcopy frontend dist\frontend\ /E /I /Y
copy docker-compose.yml dist\
copy install.sh dist\
copy README.md dist\
copy DISTRIBUTION_README.md dist\

REM Create archive using PowerShell
powershell -command "Compress-Archive -Path 'dist\*' -DestinationPath 'dist\aprswx-manual-build.zip' -Force"

echo ✓ Distribution package created: dist\aprswx-manual-build.zip

REM Summary
echo.
echo 🎉 Manual Build Summary
echo ======================
echo ✓ Backend: Python dependencies installed and tested
echo ✓ Frontend: React application built successfully

if "%DOCKER_AVAILABLE%"=="true" (
    echo ✓ Docker: Container image built and ready
) else (
    echo ⚠ Docker: Skipped (not available)
)

echo ✓ Distribution: Package created in dist\ directory

echo.
echo 📦 Installation Options:
echo 1. Extract dist\aprswx-manual-build.zip and run install.sh
echo 2. Use docker-compose up -d (if Docker available)
echo 3. Run backend and frontend separately for development

echo.
echo 🔧 Manual Commands:
echo Backend: cd backend ^&^& python manage.py runserver
echo Frontend: cd frontend ^&^& npm start
if "%DOCKER_AVAILABLE%"=="true" (
    echo Docker: docker run -p 8000:8000 aprswx:latest
)

echo.
echo ✓ Manual build process completed successfully!
pause
