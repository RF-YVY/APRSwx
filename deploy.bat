@echo off
REM APRSwx Windows Production Deployment Script

echo 🚀 APRSwx Windows Production Deployment
echo =======================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 16+
    pause
    exit /b 1
)

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git not found. Please install Git
    pause
    exit /b 1
)

echo ✅ All requirements found

REM Clone repository if not exists
if not exist "APRSwx" (
    echo 📥 Cloning APRSwx repository...
    git clone https://github.com/RF-YVY/APRSwx.git
    cd APRSwx
) else (
    echo 📁 APRSwx directory exists, updating...
    cd APRSwx
    git pull origin main
)

REM Setup Python virtual environment
echo 🐍 Setting up Python virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt

REM Database setup
echo 🗃️ Setting up database...
python manage.py migrate

REM Frontend build check
echo 🏗️ Checking frontend build...
cd ..\frontend
if not exist "build" (
    echo Frontend not built. Building now...
    npm install
    npm run build
) else (
    echo ✅ Frontend build found
)

cd ..

REM Create startup scripts
echo ⚙️ Creating startup scripts...

REM Backend startup script
echo @echo off > start_backend.bat
echo echo Starting APRSwx Backend... >> start_backend.bat
echo cd backend >> start_backend.bat
echo call ..\venv\Scripts\activate.bat >> start_backend.bat
echo python manage.py runserver >> start_backend.bat
echo pause >> start_backend.bat

REM Frontend startup script
echo @echo off > start_frontend.bat
echo echo Starting APRSwx Frontend... >> start_frontend.bat
echo cd frontend >> start_frontend.bat
echo npx serve -s build >> start_frontend.bat
echo pause >> start_frontend.bat

REM Main startup script
echo @echo off > start_aprswx.bat
echo echo 🚀 Starting APRSwx... >> start_aprswx.bat
echo echo Starting Backend... >> start_aprswx.bat
echo start "APRSwx Backend" cmd /k start_backend.bat >> start_aprswx.bat
echo timeout /t 5 /nobreak >> start_aprswx.bat
echo echo Starting Frontend... >> start_aprswx.bat
echo start "APRSwx Frontend" cmd /k start_frontend.bat >> start_aprswx.bat
echo echo. >> start_aprswx.bat
echo echo ✅ APRSwx is starting! >> start_aprswx.bat
echo echo. >> start_aprswx.bat
echo echo 🌐 Access points: >> start_aprswx.bat
echo echo   Frontend: http://localhost:3000 >> start_aprswx.bat
echo echo   Backend:  http://localhost:8000 >> start_aprswx.bat
echo echo. >> start_aprswx.bat
echo echo Press any key to exit... >> start_aprswx.bat
echo pause >> start_aprswx.bat

echo 📋 Setup complete!
echo.
echo 🚀 To start APRSwx, run: start_aprswx.bat
echo.
echo 🌐 Access points:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo.
echo ✅ APRSwx is ready for production!
pause
