@echo off
REM APRSwx Executable Builder Script for Windows
REM Creates standalone executables for Windows

setlocal enabledelayedexpansion

echo 🚀 APRSwx Executable Builder
echo ============================

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

echo ✓ All dependencies are available

REM Build frontend
echo.
echo Building frontend...
cd frontend

echo ✓ Installing NPM dependencies...
npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ⚠ Full install failed, trying simplified version...
    copy package.simple.json package.json
    npm install --ignore-scripts
    if %errorlevel% neq 0 (
        echo ✗ Frontend dependency installation failed
        pause
        exit /b 1
    )
)

echo ✓ Building React application...
npm run build
if %errorlevel% neq 0 (
    echo ✗ Frontend build failed
    pause
    exit /b 1
)

cd ..
echo ✓ Frontend build completed

REM Build PyInstaller executable
echo.
echo Building PyInstaller executable...
cd backend

echo ✓ Installing PyInstaller...
pip install pyinstaller
if %errorlevel% neq 0 (
    echo ✗ PyInstaller installation failed
    pause
    exit /b 1
)

echo ✓ Creating PyInstaller spec file...
echo import os > aprswx.spec
echo import sys >> aprswx.spec
echo from pathlib import Path >> aprswx.spec
echo. >> aprswx.spec
echo block_cipher = None >> aprswx.spec
echo. >> aprswx.spec
echo a = Analysis( >> aprswx.spec
echo     ['manage.py'], >> aprswx.spec
echo     pathex=['.'], >> aprswx.spec
echo     binaries=[], >> aprswx.spec
echo     datas=[ >> aprswx.spec
echo         ('static', 'static'^), >> aprswx.spec
echo         ('templates', 'templates'^), >> aprswx.spec
echo         ('../frontend/build', 'frontend'^), >> aprswx.spec
echo     ], >> aprswx.spec
echo     hiddenimports=[ >> aprswx.spec
echo         'django.contrib.staticfiles', >> aprswx.spec
echo         'django.contrib.admin', >> aprswx.spec
echo         'rest_framework', >> aprswx.spec
echo         'corsheaders', >> aprswx.spec
echo         'channels', >> aprswx.spec
echo         'django.contrib.auth', >> aprswx.spec
echo         'django.contrib.contenttypes', >> aprswx.spec
echo         'django.contrib.sessions', >> aprswx.spec
echo         'django.contrib.messages', >> aprswx.spec
echo     ], >> aprswx.spec
echo     hookspath=[], >> aprswx.spec
echo     hooksconfig={}, >> aprswx.spec
echo     runtime_hooks=[], >> aprswx.spec
echo     excludes=[], >> aprswx.spec
echo     win_no_prefer_redirects=False, >> aprswx.spec
echo     win_private_assemblies=False, >> aprswx.spec
echo     cipher=block_cipher, >> aprswx.spec
echo     noarchive=False, >> aprswx.spec
echo ^) >> aprswx.spec
echo. >> aprswx.spec
echo pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher^) >> aprswx.spec
echo. >> aprswx.spec
echo exe = EXE( >> aprswx.spec
echo     pyz, >> aprswx.spec
echo     a.scripts, >> aprswx.spec
echo     a.binaries, >> aprswx.spec
echo     a.zipfiles, >> aprswx.spec
echo     a.datas, >> aprswx.spec
echo     [], >> aprswx.spec
echo     name='APRSwx', >> aprswx.spec
echo     debug=False, >> aprswx.spec
echo     bootloader_ignore_signals=False, >> aprswx.spec
echo     strip=False, >> aprswx.spec
echo     upx=True, >> aprswx.spec
echo     upx_exclude=[], >> aprswx.spec
echo     runtime_tmpdir=None, >> aprswx.spec
echo     console=True, >> aprswx.spec
echo     disable_windowed_traceback=False, >> aprswx.spec
echo     argv_emulation=False, >> aprswx.spec
echo     target_arch=None, >> aprswx.spec
echo     codesign_identity=None, >> aprswx.spec
echo     entitlements_file=None, >> aprswx.spec
echo ^) >> aprswx.spec

echo ✓ Building executable...
pyinstaller aprswx.spec
if %errorlevel% neq 0 (
    echo ✗ PyInstaller build failed
    pause
    exit /b 1
)

cd ..
echo ✓ PyInstaller executable created: backend\dist\APRSwx.exe

REM Create portable distribution
echo.
echo Creating portable distribution...

if not exist portable mkdir portable
if not exist portable\APRSwx-Portable mkdir portable\APRSwx-Portable
if not exist portable\APRSwx-Portable\backend mkdir portable\APRSwx-Portable\backend
if not exist portable\APRSwx-Portable\frontend mkdir portable\APRSwx-Portable\frontend
if not exist portable\APRSwx-Portable\data mkdir portable\APRSwx-Portable\data
if not exist portable\APRSwx-Portable\scripts mkdir portable\APRSwx-Portable\scripts

echo ✓ Copying backend files...
xcopy backend\* portable\APRSwx-Portable\backend\ /E /I /Y

echo ✓ Copying frontend files...
xcopy frontend\build\* portable\APRSwx-Portable\frontend\ /E /I /Y

echo ✓ Creating launcher script...
echo @echo off > portable\APRSwx-Portable\start-aprswx.bat
echo title APRSwx - APRS Weather Monitor >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Starting APRSwx... >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo cd /d "%%~dp0" >> portable\APRSwx-Portable\start-aprswx.bat
echo set PYTHONPATH=%%cd%%\backend >> portable\APRSwx-Portable\start-aprswx.bat
echo set DJANGO_SETTINGS_MODULE=aprs_server.settings >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo if not exist data mkdir data >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Starting backend server... >> portable\APRSwx-Portable\start-aprswx.bat
echo cd backend >> portable\APRSwx-Portable\start-aprswx.bat
echo python manage.py migrate --run-syncdb >> portable\APRSwx-Portable\start-aprswx.bat
echo start /min python manage.py runserver 127.0.0.1:8000 >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Waiting for server to start... >> portable\APRSwx-Portable\start-aprswx.bat
echo timeout /t 5 /nobreak ^> nul >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Opening APRSwx in browser... >> portable\APRSwx-Portable\start-aprswx.bat
echo start http://127.0.0.1:8000 >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo APRSwx is now running! >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Backend: http://127.0.0.1:8000 >> portable\APRSwx-Portable\start-aprswx.bat
echo echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Press any key to stop APRSwx... >> portable\APRSwx-Portable\start-aprswx.bat
echo pause ^> nul >> portable\APRSwx-Portable\start-aprswx.bat
echo. >> portable\APRSwx-Portable\start-aprswx.bat
echo echo Stopping APRSwx... >> portable\APRSwx-Portable\start-aprswx.bat
echo taskkill /f /im python.exe ^> nul 2^>^&1 >> portable\APRSwx-Portable\start-aprswx.bat
echo echo APRSwx stopped. >> portable\APRSwx-Portable\start-aprswx.bat

echo ✓ Creating README...
echo APRSwx Portable Distribution > portable\APRSwx-Portable\README.txt
echo ============================ >> portable\APRSwx-Portable\README.txt
echo. >> portable\APRSwx-Portable\README.txt
echo This is a portable version of APRSwx that can run without installation. >> portable\APRSwx-Portable\README.txt
echo. >> portable\APRSwx-Portable\README.txt
echo Requirements: >> portable\APRSwx-Portable\README.txt
echo - Python 3.8 or higher must be installed on the system >> portable\APRSwx-Portable\README.txt
echo - No other dependencies required >> portable\APRSwx-Portable\README.txt
echo. >> portable\APRSwx-Portable\README.txt
echo Usage: >> portable\APRSwx-Portable\README.txt
echo - Run start-aprswx.bat >> portable\APRSwx-Portable\README.txt
echo. >> portable\APRSwx-Portable\README.txt
echo The application will: >> portable\APRSwx-Portable\README.txt
echo 1. Start the backend server >> portable\APRSwx-Portable\README.txt
echo 2. Open your default web browser >> portable\APRSwx-Portable\README.txt
echo 3. Display the APRSwx interface >> portable\APRSwx-Portable\README.txt
echo. >> portable\APRSwx-Portable\README.txt
echo To stop the application: >> portable\APRSwx-Portable\README.txt
echo - Press any key in the command window >> portable\APRSwx-Portable\README.txt

echo ✓ Creating archive...
powershell -command "Compress-Archive -Path 'portable\APRSwx-Portable\*' -DestinationPath 'portable\APRSwx-Portable-Windows.zip' -Force"

echo ✓ Portable distribution created: portable\APRSwx-Portable-Windows.zip

REM Build summary
echo.
echo 🎉 Build Summary
echo ================
echo ✓ Frontend: Built and ready
echo ✓ PyInstaller: Executable created in backend\dist\
echo ✓ Portable: Distribution created in portable\

echo.
echo 📦 Distribution Options:
echo 1. PyInstaller: backend\dist\APRSwx.exe (single executable)
echo 2. Portable: portable\APRSwx-Portable-Windows.zip (self-contained)

echo.
echo 🚀 Next Steps:
echo 1. Test the executables on target systems
echo 2. Create installers if needed
echo 3. Distribute to users

echo.
echo ✓ All executables built successfully!
pause
