# APRSwx Executable Compilation Guide

## 🎯 OVERVIEW
APRSwx can be compiled into standalone executables for Windows, macOS, and Linux using several different approaches:

1. **Electron Desktop App** - Complete desktop application with GUI
2. **PyInstaller** - Python backend as standalone executable
3. **Docker Desktop** - Containerized executable with Docker Desktop
4. **Portable Distribution** - Self-contained portable version

## 📦 METHOD 1: ELECTRON DESKTOP APP (RECOMMENDED)

### Features
- ✅ Complete desktop application with native GUI
- ✅ Cross-platform (Windows .exe, macOS .app, Linux .AppImage)
- ✅ Auto-updater support
- ✅ System tray integration
- ✅ Professional installer/uninstaller

### Setup Process

#### 1. Install Electron Forge
```bash
cd frontend
npm install --save-dev @electron-forge/cli
npx electron-forge import
```

#### 2. Create Electron Main Process
```javascript
// frontend/src/electron/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets/icon.png')
    });

    // Start Django backend
    startBackend();

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:3000');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }
}

function startBackend() {
    const pythonScript = path.join(__dirname, '../backend/manage.py');
    backendProcess = spawn('python', [pythonScript, 'runserver', '127.0.0.1:8000'], {
        stdio: 'inherit'
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (backendProcess) {
        backendProcess.kill();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
```

#### 3. Build Commands
```bash
# Build for current platform
npm run make

# Build for all platforms
npm run make -- --arch=x64 --platform=win32,darwin,linux
```

### Output Files
- **Windows:** `APRSwx-Setup-1.0.0.exe` (installer) + `APRSwx-1.0.0.exe` (portable)
- **macOS:** `APRSwx-1.0.0.dmg` (installer) + `APRSwx.app` (application)
- **Linux:** `APRSwx-1.0.0.AppImage` (portable) + `APRSwx-1.0.0.deb` (package)

## 📦 METHOD 2: PYINSTALLER BACKEND + STANDALONE FRONTEND

### Features
- ✅ Python backend as single executable
- ✅ Smaller file size than Electron
- ✅ No Python installation required
- ✅ Bundle with static frontend files

### Setup Process

#### 1. Install PyInstaller
```bash
cd backend
pip install pyinstaller
```

#### 2. Create PyInstaller Spec File
```python
# backend/aprswx.spec
import os
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.abspath('.'))

block_cipher = None

a = Analysis(
    ['manage.py'],
    pathex=['.'],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('templates', 'templates'),
        ('../frontend/build', 'frontend/build'),
    ],
    hiddenimports=[
        'django.contrib.staticfiles',
        'django.contrib.admin',
        'rest_framework',
        'corsheaders',
        'channels',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='APRSwx',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='../frontend/public/favicon.ico'
)
```

#### 3. Build Commands
```bash
cd backend
pyinstaller aprswx.spec
```

### Output Files
- **Windows:** `dist/APRSwx.exe` (single executable)
- **macOS:** `dist/APRSwx` (Unix executable)
- **Linux:** `dist/APRSwx` (Unix executable)

## 📦 METHOD 3: DOCKER DESKTOP EXECUTABLE

### Features
- ✅ Complete containerized application
- ✅ Guaranteed environment consistency
- ✅ Easy deployment and updates
- ✅ Professional Docker Desktop integration

### Setup Process

#### 1. Enhanced Dockerfile for Desktop
```dockerfile
# Dockerfile.desktop
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements-ci.txt ./
RUN pip install --no-cache-dir -r requirements-ci.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/build

ENV PYTHONPATH="/app/backend"
ENV DJANGO_SETTINGS_MODULE="aprs_server.settings"

EXPOSE 8000

CMD ["python", "backend/manage.py", "runserver", "0.0.0.0:8000"]
```

#### 2. Desktop Integration Script
```bash
# scripts/desktop-launch.sh
#!/bin/bash
echo "Starting APRSwx Desktop..."
docker run -d --name aprswx -p 8000:8000 aprswx:desktop
sleep 5
xdg-open http://localhost:8000  # Linux
# open http://localhost:8000    # macOS
# start http://localhost:8000   # Windows
```

#### 3. Build Commands
```bash
docker build -f Dockerfile.desktop -t aprswx:desktop .
```

### Output Files
- **Cross-platform:** Docker image that runs anywhere Docker is installed

## 📦 METHOD 4: PORTABLE DISTRIBUTION

### Features
- ✅ No installation required
- ✅ Self-contained with embedded Python
- ✅ Portable across similar systems
- ✅ Minimal dependencies

### Setup Process

#### 1. Create Portable Structure
```
APRSwx-Portable/
├── python/          # Embedded Python runtime
├── backend/         # Python application
├── frontend/        # Built React app
├── data/           # Database and logs
├── APRSwx.exe      # Launcher executable
├── APRSwx.bat      # Batch launcher
└── README.txt      # Instructions
```

#### 2. Portable Launcher (Windows)
```batch
@echo off
title APRSwx - APRS Weather Monitor
echo Starting APRSwx...

cd /d "%~dp0"
set PYTHONPATH=%cd%\python
set DJANGO_SETTINGS_MODULE=aprs_server.settings

echo Starting backend server...
start /min "%cd%\python\python.exe" "%cd%\backend\manage.py" runserver 127.0.0.1:8000

echo Waiting for server to start...
timeout /t 5 /nobreak > nul

echo Opening APRSwx in browser...
start http://127.0.0.1:8000

echo.
echo APRSwx is now running!
echo Backend: http://127.0.0.1:8000
echo.
echo Press any key to stop APRSwx...
pause > nul

echo Stopping APRSwx...
taskkill /f /im python.exe > nul 2>&1
echo APRSwx stopped.
```

### Output Files
- **Windows:** `APRSwx-Portable-Windows.zip`
- **macOS:** `APRSwx-Portable-macOS.tar.gz`
- **Linux:** `APRSwx-Portable-Linux.tar.gz`

## 🔧 AUTOMATED BUILD SCRIPTS

### Cross-Platform Build Script
```bash
#!/bin/bash
# build-executables.sh

echo "🚀 APRSwx Executable Builder"
echo "============================"

# Build frontend
echo "Building frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

# Method 1: Electron Desktop App
echo "Building Electron desktop app..."
cd frontend
npm run make
cd ..

# Method 2: PyInstaller
echo "Building PyInstaller executable..."
cd backend
pip install pyinstaller
pyinstaller aprswx.spec
cd ..

# Method 3: Docker Desktop
echo "Building Docker desktop image..."
docker build -f Dockerfile.desktop -t aprswx:desktop .

# Method 4: Portable Distribution
echo "Creating portable distribution..."
./scripts/create-portable.sh

echo "✅ All executables built successfully!"
echo "Check the following directories:"
echo "- frontend/out/ (Electron apps)"
echo "- backend/dist/ (PyInstaller executable)"
echo "- Docker image: aprswx:desktop"
echo "- portable/ (Portable distributions)"
```

### Windows Build Script
```batch
@echo off
REM build-executables.bat

echo 🚀 APRSwx Executable Builder
echo ============================

REM Build frontend
echo Building frontend...
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

REM PyInstaller
echo Building PyInstaller executable...
cd backend
pip install pyinstaller
pyinstaller aprswx.spec
cd ..

REM Create portable
echo Creating portable distribution...
call scripts\create-portable.bat

echo ✅ All executables built successfully!
echo Check the following directories:
echo - backend\dist\ (PyInstaller executable)
echo - portable\ (Portable distributions)
pause
```

## 📊 COMPARISON TABLE

| Method | File Size | Startup Time | Dependencies | Best For |
|--------|-----------|--------------|--------------|----------|
| Electron | ~150-200MB | 3-5 seconds | None | Professional desktop app |
| PyInstaller | ~50-100MB | 2-3 seconds | None | Lightweight standalone |
| Docker Desktop | ~100MB | 5-10 seconds | Docker | Cross-platform consistency |
| Portable | ~80-120MB | 2-4 seconds | None | Truly portable solution |

## 🎯 RECOMMENDED APPROACH

For **professional distribution**: Use **Electron** for a complete desktop application experience.

For **lightweight distribution**: Use **PyInstaller** for smaller file sizes and faster startup.

For **enterprise deployment**: Use **Docker Desktop** for consistent environments.

For **portable use**: Use **Portable Distribution** for maximum compatibility.

## 🚀 GETTING STARTED

1. Choose your preferred method above
2. Follow the setup process for that method
3. Run the build commands
4. Test the generated executable
5. Distribute to users

The executables will be completely self-contained and ready to run on target systems without requiring Python, Node.js, or any other dependencies to be installed!
